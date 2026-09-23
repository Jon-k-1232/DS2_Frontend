import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import CreateNewInvoices from './CreateNewInvoices';
import { context } from '../../../App';
import axios from 'axios';
import { postInvoiceCreation } from '../../../Services/ApiCalls/PostCalls';

// Unlike CreateNewInvoices.test.js (which stubs out the whole grid AND the
// FetchCalls module), these tests exercise the REAL grid chain
// (InvoiceGrids/CreateInvoiceGrid -> Components/DataGrids/CreateInvoiceGrid, a
// real MUI DataGrid) and the REAL FetchCalls helpers (getOutstandingBalanceList,
// fetchFileDownload) against a mocked axios — the only way to prove R2's fix
// holds against the real balance envelope shape and a real HTTP failure mode,
// not a hand-shaped test double that can't disagree with the code under test.
// Only axios itself and PostCalls (a real network POST we never want to hit)
// are mocked.
jest.mock('axios', () => ({ get: jest.fn() }));
// jsdom has no layout, so MUI's virtualization would leave the editable note /
// write-off cells unrendered; render every row for these tests.
jest.mock('@mui/x-data-grid', () => {
   const actual = jest.requireActual('@mui/x-data-grid');
   return { ...actual, DataGrid: props => <actual.DataGrid {...props} disableVirtualization /> };
});
jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../Services/ApiCalls/PostCalls', () => ({ postInvoiceCreation: jest.fn() }));

// getDynamicColumnWidths measures text on a canvas 2D context, which jsdom
// doesn't implement — same stub CreateInvoiceGrid.test.js uses.
beforeAll(() => {
   HTMLCanvasElement.prototype.getContext = () => ({ measureText: text => ({ width: String(text).length * 7 }) });
});

// The real outstandingBalanceList envelope shape, as the backend actually
// sends it — see the Loading gate in Pages/Invoices/InvoiceGrids/CreateInvoiceGrid.js.
const realBalanceEnvelope = () => ({
   status: 200,
   outstandingBalanceList: {
      activeOutstandingBalancesData: {
         grid: {
            columns: [{ field: 'display_name', headerName: 'Customer', width: 200 }],
            rows: [{ customer_id: 20, display_name: 'Acme', invoice_total: 100, billed_today: true }]
         }
      }
   }
});

beforeEach(() => {
   jest.clearAllMocks();
});

// Selects the one real row, turns CSV-only OFF, turns Finalize ON, Submits,
// and confirms through the dialog — the finalize CONFIRMATION path (not the
// default CSV-only path CreateNewInvoices.test.js exercises).
const mountFinalizeAndConfirm = async setCustomerData => {
   await act(async () =>
      render(
         <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
            <CreateNewInvoices setCustomerData={setCustomerData} />
         </context.Provider>
      )
   );

   fireEvent.click(within(screen.getByRole('row', { name: /Acme/ })).getByRole('checkbox', { name: 'Select row' }));
   fireEvent.click(screen.getByRole('checkbox', { name: 'Create CSV Only' }));
   fireEvent.click(screen.getByRole('checkbox', { name: 'Lock And Finalize Selected Invoices' }));
   fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
   await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' })));
};

describe('CreateNewInvoices — finalize confirmation path against the real grid, FetchCalls, and balance envelope', () => {
   it('commits through the confirmation dialog, refreshes the real balance envelope, and leaves the grid selection clear', async () => {
      axios.get.mockResolvedValue({ data: realBalanceEnvelope() });
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 1 invoice(s).',
         fileLocation: '',
         skippedCustomers: [],
         invoicesList: {}
      });
      const setCustomerData = jest.fn();

      await mountFinalizeAndConfirm(setCustomerData);

      expect(postInvoiceCreation.mock.calls[0][0].invoiceCreationSettings.isFinalized).toBe(true);
      expect(screen.getByText('Finalized 1 invoice(s).')).toBeVisible();
      expect(setCustomerData).toHaveBeenCalled();

      // R3: the batch committed, so the grid remounted clean — Acme reads as
      // unchecked again even though it's still the only (refreshed) row shown.
      expect(within(await screen.findByRole('row', { name: /Acme/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();

      // A second Submit with nothing (re-)selected must not resubmit Acme.
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(screen.getByText('Selection Error: Select Invoices')).toBeVisible();
      expect(postInvoiceCreation).toHaveBeenCalledTimes(1);
   });

   it('R2: a real HTTP failure on the post-finalize balance refresh keeps the previous grid data on screen and warns, instead of permanent Loading', async () => {
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get
         .mockResolvedValueOnce({ data: realBalanceEnvelope() }) // mount
         .mockRejectedValueOnce({ response: { status: 500, data: { message: 'offline' } } }); // post-finalize refresh
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 1 invoice(s).',
         fileLocation: '',
         skippedCustomers: [],
         invoicesList: {}
      });

      await mountFinalizeAndConfirm(jest.fn());

      expect(screen.getByText('Finalized 1 invoice(s).')).toBeVisible();
      // The bug: getOutstandingBalanceList swallows the HTTP failure and
      // resolves [] (see FetchCalls.js); the unfixed caller accepted that as
      // valid data and the grid fell back to its permanent "Loading..." with
      // no warning at all. Fixed: the grid keeps showing the last-known-good
      // data and a warning appears instead.
      expect(screen.queryByText('Loading...')).toBeNull();
      expect(screen.getByText(/refresh the page/)).toBeVisible();
      // findByRole (not getByRole): the Confirm dialog's real exit transition
      // is still in flight (jsdom, real timers) and marks the rest of the
      // page aria-hidden until it settles — findByRole retries until that
      // clears, the same way the row/checkbox lookups elsewhere in this file
      // already do.
      expect(await screen.findByRole('row', { name: /Acme/ })).toBeInTheDocument();

      silence.mockRestore();
   });

   it('R3: a download failure plus an explicit refresh-error envelope leaves no checked rows; Submit reports the empty selection', async () => {
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get
         .mockResolvedValueOnce({ data: realBalanceEnvelope() }) // mount
         .mockRejectedValueOnce({ response: { status: 500 } }) // fetchFileDownload
         .mockResolvedValueOnce({ data: { status: 500, message: 'refresh failed' } }); // post-finalize refresh, explicit failure envelope
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 1 invoice(s).',
         fileLocation: 'fixture.zip',
         skippedCustomers: [],
         invoicesList: {}
      });

      await mountFinalizeAndConfirm(jest.fn());

      expect(screen.getByText(/download failed/)).toBeVisible();
      expect(screen.getByText(/refresh the page/)).toBeVisible();

      // R3: the batch still committed (status 200), so the grid still reset
      // its selection — Acme must NOT still read as checked just because the
      // download/refresh afterward failed.
      expect(within(await screen.findByRole('row', { name: /Acme/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Create CSV Only' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /Allow same-day re-bill/ })).not.toBeChecked();

      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(screen.getByText('Selection Error: Select Invoices')).toBeVisible();
      expect(postInvoiceCreation).toHaveBeenCalledTimes(1);

      silence.mockRestore();
   });

   it('R3: an all-skipped batch clears the grid selection so an immediate second Submit does not silently resubmit the same customer', async () => {
      axios.get.mockResolvedValue({ data: realBalanceEnvelope() });
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'No invoices created — 1 customer(s) skipped (see details).',
         fileLocation: '',
         skippedCustomers: [{ customer_id: 20, display_name: 'Acme', invoice_number: 'INV-1', reason: 'Already finalized today' }],
         invoicesList: {}
      });

      await mountFinalizeAndConfirm(jest.fn());

      expect(screen.getByText(/Already finalized today/)).toBeVisible();
      // findByRole: the Confirm dialog's real exit transition is still in
      // flight and marks the rest of the page aria-hidden until it settles.
      expect(await screen.findByRole('button', { name: 'Submit' })).toBeEnabled();

      // Pre-fix, this row stayed checked and an immediate second Submit
      // silently resubmitted customer 20 as a plain CSV. Fixed: the grid
      // remounted with the batch, so the selection is empty and Submit must
      // refuse instead of resubmitting.
      expect(within(await screen.findByRole('row', { name: /Acme/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();

      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(screen.getByText('Selection Error: Select Invoices')).toBeVisible();
      expect(postInvoiceCreation).toHaveBeenCalledTimes(1);
   });
});

// N1 (round 5): a partially skipped batch must clear the grid selection but
// KEEP the skipped customer's draft note and show-write-offs flag. Remounting
// the grid on every committed batch used to wipe them — unsaved billing
// instructions disappeared without warning on the retry.
test('a partial skip clears the selection but retains the skipped customer\'s note and write-off flag for the retry', async () => {
   const envelope = realBalanceEnvelope();
   envelope.outstandingBalanceList.activeOutstandingBalancesData.grid.rows.push({ customer_id: 21, display_name: 'Fresh', invoice_total: 100, billed_today: false });
   axios.get.mockResolvedValue({ data: envelope });
   postInvoiceCreation.mockResolvedValue({
      status: 200,
      message: 'Finalized 1 invoice(s). Skipped 1 customer(s) (see details).',
      invoicesList: {},
      skippedCustomers: [{ customer_id: 20, display_name: 'Acme', invoice_number: 'INV-2026-00001', reason: 'Already finalized today' }]
   });
   await act(async () =>
      render(
         <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
            <CreateNewInvoices setCustomerData={jest.fn()} />
         </context.Provider>
      )
   );

   const acme = screen.getByRole('row', { name: /Acme/ });
   fireEvent.click(within(acme).getByRole('checkbox', { name: 'Select row' }));
   fireEvent.change(within(acme).getByLabelText('(Optional) Note To Appear On Invoice'), { target: { value: 'Keep this explanation on retry' } });
   fireEvent.click(within(acme).getAllByRole('checkbox').find(x => !x.getAttribute('aria-label')));
   fireEvent.click(within(screen.getByRole('row', { name: /Fresh/ })).getByRole('checkbox', { name: 'Select row' }));
   // The INVOICED customer also has drafts — they must be the ones that clear.
   fireEvent.change(within(screen.getByRole('row', { name: /Fresh/ })).getByLabelText('(Optional) Note To Appear On Invoice'), { target: { value: 'Invoiced draft must disappear' } });
   fireEvent.click(within(screen.getByRole('row', { name: /Fresh/ })).getAllByRole('checkbox').find(x => !x.getAttribute('aria-label')));
   fireEvent.click(screen.getByRole('checkbox', { name: 'Create CSV Only' }));
   fireEvent.click(screen.getByRole('checkbox', { name: 'Lock And Finalize Selected Invoices' }));
   fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
   await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' })));

   // Both customers were submitted, Acme with its note and write-off flag.
   const sent = postInvoiceCreation.mock.calls[0][0].invoicesToCreate.find(r => r.customer_id === 20);
   expect(sent.invoiceNote).toBe('Keep this explanation on retry');
   expect(sent.showWriteOffs).toBe(true);

   // Selection cleared (nothing can be resubmitted by accident) …
   const after = await screen.findByRole('row', { name: /Acme/ });
   expect(within(after).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();
   expect(within(screen.getByRole('row', { name: /Fresh/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();
   // … but the SKIPPED customer's drafts survive for the retry.
   expect(within(after).getByLabelText('(Optional) Note To Appear On Invoice')).toHaveValue('Keep this explanation on retry');
   fireEvent.click(within(after).getByRole('checkbox', { name: 'Select row' }));
   expect(within(after).getAllByRole('checkbox').find(x => !x.getAttribute('aria-label'))).toBeChecked();
   // The invoiced customer's drafts are gone.
   const fresh = screen.getByRole('row', { name: /Fresh/ });
   expect(within(fresh).getByLabelText('(Optional) Note To Appear On Invoice')).toHaveValue('');
   fireEvent.click(within(fresh).getByRole('checkbox', { name: 'Select row' }));
   expect(within(fresh).getAllByRole('checkbox').find(x => !x.getAttribute('aria-label'))).not.toBeChecked();
});
