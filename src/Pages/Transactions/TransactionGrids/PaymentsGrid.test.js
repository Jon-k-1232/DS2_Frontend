import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PaymentsGrid from './PaymentsGrid';
import { context } from '../../../App';
import { fetchPayments } from '../../../Services/ApiCalls/FetchCalls';

jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../TransactionForms/AddTransaction/Payment', () => () => null);
// PaginationGrid renders real MUI internals we don't need here — stub it down
// to just the two things this test cares about: the toolbar slot (where the
// search field lives) and the rows PaymentsGrid handed it.
jest.mock('../../../Components/DataGrids/PaginationGrid', () => props => (
   <div>
      {props.renderToolbarContent()}
      <pre data-testid='rows'>{JSON.stringify(props.tableData.rows)}</pre>
      <button onClick={() => props.onPaginationModelChange({ page: 2, pageSize: 20 })}>Go to page three</button>
   </div>
));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ fetchPayments: jest.fn() }));

// E3 — PaymentsGrid must reject an obsolete page response (one that resolves
// after a newer search has already gone out) instead of letting it overwrite
// fresher rows/input, and must keep page results grid-local — a page fetch
// must never be written into the shared customerData.paymentsList context.
const pending = [];
const response = (searchTerm, id) => ({
   paymentsList: {
      activePaymentsData: {
         searchTerm,
         pagination: { page: 1, limit: 20, totalItems: 1 },
         grid: { columns: [{ field: 'payment_id' }], rows: [{ id, payment_id: id }] }
      }
   }
});

function Harness() {
   const [data, setData] = useState({ paymentsList: response('', 99).paymentsList });
   return (
      <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
         <PaymentsGrid customerData={data} setCustomerData={setData} />
         <pre data-testid='context'>{JSON.stringify(data)}</pre>
      </context.Provider>
   );
}

beforeEach(() => {
   jest.useFakeTimers();
   pending.length = 0;
   fetchPayments.mockImplementation((accountID, userID, token, page, limit, search) => new Promise(resolve => pending.push({ page, size: limit, search, resolve })));
});

afterEach(() => jest.useRealTimers());

test('an out-of-order (obsolete) response is dropped: input, rows, and the shared list all stay on the newer search', async () => {
   render(<Harness />);

   // Initial hydration from context (search '', payment_id 99) — no fetch yet.
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":99');

   fireEvent.change(screen.getByPlaceholderText('Search payments'), { target: { value: 'A' } });
   await act(async () => jest.advanceTimersByTime(300));

   fireEvent.change(screen.getByPlaceholderText('Search payments'), { target: { value: 'AB' } });
   await act(async () => jest.advanceTimersByTime(300));

   const stale = pending.find(request => request.search === 'A');
   const latest = pending.find(request => request.search === 'AB');
   expect(stale).toBeTruthy();
   expect(latest).toBeTruthy();

   // Resolve the NEWER request first, then the STALE one late — the classic
   // out-of-order network race.
   await act(async () => latest.resolve(response('AB', 2)));
   expect(screen.getByPlaceholderText('Search payments')).toHaveValue('AB');
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":2');

   await act(async () => stale.resolve(response('A', 1)));

   // The stale 'A' response must have been dropped: input and rows still
   // reflect 'AB', not the late-arriving 'A' data.
   expect(screen.getByPlaceholderText('Search payments')).toHaveValue('AB');
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":2');
   expect(screen.getByTestId('rows')).not.toHaveTextContent('"payment_id":1');

   // Page results are grid-local — the shared context list was never written
   // to by either page fetch and still shows its original (payment_id 99) value.
   expect(screen.getByTestId('context')).toHaveTextContent('"payment_id":99');
});

test('a page change while a search fetch is still in flight refetches the current search, and the stale response loses even if it resolves later', async () => {
   render(<Harness />);

   fireEvent.change(screen.getByPlaceholderText('Search payments'), { target: { value: 'AB' } });
   await act(async () => jest.advanceTimersByTime(300));

   const first = pending.find(request => request.search === 'AB' && request.page === 1);
   expect(first).toBeTruthy();

   // The page changes while that search's fetch is still unresolved.
   fireEvent.click(screen.getByRole('button', { name: 'Go to page three' }));

   const second = pending.at(-1);
   expect(second).not.toBe(first);
   // Refetches with the CURRENT search ('AB'), not a reset/blank one.
   expect([second.page, second.size, second.search]).toEqual([3, 20, 'AB']);

   // The stale, in-flight first request resolving late must not win, even
   // though it belongs to the same search term as the newer page fetch.
   await act(async () => first.resolve(response('AB', 1)));
   expect(screen.getByTestId('rows')).not.toHaveTextContent('"payment_id":1');

   await act(async () => second.resolve(response('AB', 2)));
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":2');

   // Neither page fetch ever reached the shared context.
   expect(screen.getByTestId('context')).toHaveTextContent('"payment_id":99');
});

test('a shared "payments:updated" event refetches the grid\'s current page/search and never writes a page into the shared list', async () => {
   render(<Harness />);

   fireEvent.change(screen.getByPlaceholderText('Search payments'), { target: { value: 'AB' } });
   await act(async () => jest.advanceTimersByTime(300));

   const searchFetch = pending.find(request => request.search === 'AB');
   await act(async () => searchFetch.resolve(response('AB', 2)));
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":2');

   // Move to page three first: a regression that "refetches" by resetting to
   // page 1 would otherwise pass this test.
   fireEvent.click(screen.getByRole('button', { name: 'Go to page three' }));
   const pageFetch = pending.find(request => request.search === 'AB' && request.page === 3);
   await act(async () => pageFetch.resolve(response('AB', 7)));
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":7');

   const countBefore = pending.length;
   act(() => window.dispatchEvent(new Event('payments:updated')));

   // Exactly one refetch, for the grid's OWN current page (3) and search
   // ('AB') — not a reset to page 1/blank search, and not a burst of extras.
   expect(pending.length).toBe(countBefore + 1);
   const refetch = pending.at(-1);
   expect([refetch.page, refetch.size, refetch.search]).toEqual([3, 20, 'AB']);

   await act(async () => refetch.resolve(response('AB', 3)));
   expect(screen.getByTestId('rows')).toHaveTextContent('"payment_id":3');

   // Still never written into the shared context.
   expect(screen.getByTestId('context')).toHaveTextContent('"payment_id":99');
});
