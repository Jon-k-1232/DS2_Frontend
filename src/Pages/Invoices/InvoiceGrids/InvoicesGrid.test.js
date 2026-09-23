import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InvoicesGrid from './InvoicesGrid';
import { context } from '../../../App';
import { fetchInvoices } from '../../../Services/ApiCalls/FetchCalls';

// getDynamicColumnWidths measures text on a canvas 2D context, which jsdom
// doesn't implement.
beforeAll(() => {
   HTMLCanvasElement.prototype.getContext = () => ({ measureText: text => ({ width: String(text).length * 7 }) });
});

// The real App.js pulls in the full router/layout tree, which transitively
// reaches PostCalls.js's real axios import — axios 1.7.7 ships an ESM entry
// point CRA's jest transform doesn't parse under node_modules. Mock both, the
// same way the rest of the suite's App-context tests do.
jest.mock('axios', () => ({}));
jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ fetchInvoices: jest.fn() }));

// Without an explicit getRowId, PaginationGrid falls back to
// row.timesheet_entry_id || row.id || `${row.user_id}-${row.timesheet_name || row.date}`
// — an invoice row has none of those, so every row resolved to the same
// fallback id and MUI DataGrid (which keys its internal row model by id)
// collapsed all of them into a single row. These rows deliberately omit
// id/timesheet_entry_id/user_id/date/timesheet_name so the old fallback
// would collide for every one of them; only customer_invoice_id (what the
// fix's getRowId uses) is distinct per row. jsdom has no layout engine, so
// MUI's row virtualization can't size a real viewport and only ever paints a
// handful of rows regardless of how many exist — that's a jsdom limitation,
// not a reason this test is weaker: under the bug, MUI's row model held only
// ONE entry (every row's computed id collided), so AT MOST one row could
// ever render no matter how many "fit". Multiple simultaneously-rendered,
// distinct rows is therefore already conclusive proof the ids didn't collide.
const buildRows = count =>
   Array.from({ length: count }, (_, i) => ({
      customer_invoice_id: 1000 + i,
      parent_invoice_id: null,
      customer_name: `Customer ${i}`,
      invoice_number: `INV-${1000 + i}`,
      invoice_date: '2026-09-01',
      due_date: '2026-09-15',
      beginning_balance: 0,
      total_payments: 0,
      total_charges: 100,
      total_write_offs: 0,
      total_retainers: 0,
      total_amount_due: 100,
      remaining_balance_on_invoice: 100,
      is_invoice_paid_in_full: false,
      fully_paid_date: null,
      created_at: '2026-09-01T00:00:00.000Z',
      created_by_user_name: 'Admin'
   }));

const columnNames = [
   'customer_invoice_id',
   'parent_invoice_id',
   'customer_name',
   'invoice_number',
   'invoice_date',
   'due_date',
   'beginning_balance',
   'total_payments',
   'total_charges',
   'total_write_offs',
   'total_retainers',
   'total_amount_due',
   'remaining_balance_on_invoice',
   'is_invoice_paid_in_full',
   'fully_paid_date',
   'created_at',
   'created_by_user_name'
];

const buildActiveInvoiceData = count => ({
   grid: { columns: columnNames.map(field => ({ field })), rows: buildRows(count) },
   pagination: { page: 1, limit: 20, totalItems: count },
   searchTerm: ''
});

const renderGrid = async activeInvoiceData => {
   // The grid re-fetches its current page right after hydrating from context
   // (pre-existing behavior, unrelated to this fix) — let that settle inside
   // act() before asserting, same as any other async effect.
   await act(async () => {
      render(
         <MemoryRouter>
            <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
               <InvoicesGrid customerData={{ invoicesList: { activeInvoiceData } }} setCustomerData={() => {}} />
            </context.Provider>
         </MemoryRouter>
      );
   });
};

describe('InvoicesGrid — stable row identity', () => {
   beforeEach(() => {
      jest.clearAllMocks();
      fetchInvoices.mockResolvedValue(undefined);
   });

   // Renamed from "renders 20 rows...": jsdom has no layout engine, so MUI's
   // row virtualization only ever paints a handful of the 20 rows (empirically
   // 3 in this environment) regardless of how many exist in the row model —
   // this test cannot and does not prove all 20 records survive DataGrid's
   // internal row model (that would need an apiRef this component doesn't
   // expose). What it DOES conclusively prove: under the bug, every row
   // computed the identical fallback id ("undefined-undefined"), so DataGrid's
   // row model held exactly ONE entry and at most one row could ever render no
   // matter how many "fit" — more than one distinct, in-range,
   // customer_invoice_id-derived row is proof that didn't happen.
   it('renders multiple distinct, in-range customer_invoice_id rows, proving getRowId does not collide', async () => {
      await renderGrid(buildActiveInvoiceData(20));

      const dataRows = screen.getAllByRole('row').filter(row => row.hasAttribute('data-id'));
      expect(dataRows.length).toBeGreaterThan(1);

      const ids = dataRows.map(row => row.getAttribute('data-id'));
      expect(new Set(ids).size).toBe(ids.length);
      // Every rendered id came from customer_invoice_id (1000-1019), not a
      // position/undefined-based fallback ("undefined-undefined", NaN, etc).
      ids.forEach(id => expect(Number(id)).toBeGreaterThanOrEqual(1000));
      ids.forEach(id => expect(Number(id)).toBeLessThan(1020));

      // Separate, complementary guarantee: the grid's reported total (from
      // aria-rowcount = data rows + 1 header) reflects all 20 records were
      // threaded through as this page's total, not silently truncated
      // upstream (e.g. by an accidental double page-slice). This does NOT by
      // itself prove no id collision — aria-rowcount echoes the totalCount
      // prop independent of row-model deduplication — hence the separate
      // proof above.
      const gridRoot = document.querySelector('[role="grid"]');
      expect(gridRoot).toHaveAttribute('aria-rowcount', '21');
   });
});
