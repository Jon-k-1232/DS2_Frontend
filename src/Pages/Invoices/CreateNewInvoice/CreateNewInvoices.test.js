import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CreateNewInvoices from './CreateNewInvoices';
import { context } from '../../../App';
import { getOutstandingBalanceList, fetchFileDownload } from '../../../Services/ApiCalls/FetchCalls';
import { postInvoiceCreation } from '../../../Services/ApiCalls/PostCalls';

jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
// The real grid needs backend-shaped outstandingBalanceData and a live
// MUI DataGrid — none of that is what this test is about. A single button
// stands in for "the user picked one fresh customer".
jest.mock('../InvoiceGrids/CreateInvoiceGrid', () => props => (
   <button onClick={() => props.setSelectedRowsToInvoice([{ customer_id: 20, billed_today: false, display_name: 'Acme' }])}>Select fixture</button>
));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ getOutstandingBalanceList: jest.fn(), fetchFileDownload: jest.fn() }));
jest.mock('../../../Services/ApiCalls/PostCalls', () => ({ postInvoiceCreation: jest.fn() }));

let setCustomerData;

beforeEach(() => {
   jest.clearAllMocks();
   getOutstandingBalanceList.mockResolvedValue({ status: 200 });
   setCustomerData = jest.fn();
});

const mountAndSubmit = async () => {
   await act(async () =>
      render(
         <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
            <CreateNewInvoices customerData={{}} setCustomerData={setCustomerData} />
         </context.Provider>
      )
   );
   fireEvent.click(screen.getByRole('button', { name: 'Select fixture' }));
   // isCsvOnly defaults true, so this is already a valid, non-finalize submit
   // (no confirmation dialog) — the simplest path to a committed batch.
   await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Submit' })));
};

// E4 — a failed download or balance refresh must never hide a finalize that
// already committed server-side (status 200), and skip/warning detail must
// stay on screen until the user dismisses it, not auto-clear after 2 seconds.
describe('CreateNewInvoices — committed results survive follow-up failures', () => {
   it('success + download failure keeps the success result visible and adds a warning', async () => {
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 1 invoice(s).',
         fileLocation: 'fixture.zip',
         skippedCustomers: [],
         invoicesList: { activeInvoiceData: {} }
      });
      fetchFileDownload.mockResolvedValue({ status: 500, message: 'File download failure' });

      await mountAndSubmit();

      // The committed result is NOT replaced by the download failure.
      expect(screen.getByText('Finalized 1 invoice(s).')).toBeInTheDocument();
      expect(screen.queryByText('File download failure')).not.toBeInTheDocument();
      // The failure instead shows up as a warning alongside the success message.
      expect(screen.getByText(/download failed/i)).toBeInTheDocument();

      // Balances still refresh even though the download failed — once on
      // mount, once after the (committed) creation.
      expect(getOutstandingBalanceList).toHaveBeenCalledTimes(2);
      // The committed invoicesList still reaches shared context.
      expect(setCustomerData).toHaveBeenCalled();
   });

   it('an all-skipped batch keeps its skip details visible well past the old 2-second auto-clear', async () => {
      // Fake timers must be installed BEFORE mounting/submitting, not after.
      // The old (removed) auto-clear scheduled its setTimeout on REAL timers
      // during mountAndSubmit() — installing fake timers only afterward, then
      // calling advanceTimersByTime, can never reach a callback that was
      // scheduled before the fake clock existed, so that ordering would pass
      // this test whether or not the auto-clear was still there. Installing
      // fake timers first means any such setTimeout is captured by them, so
      // this test would actually fail if the auto-clear ever came back.
      jest.useFakeTimers();
      try {
         postInvoiceCreation.mockResolvedValue({
            status: 200,
            message: 'No invoices created — 1 customer(s) skipped (see details).',
            fileLocation: '',
            skippedCustomers: [{ customer_id: 20, display_name: 'Acme', invoice_number: 'INV-2026-1', reason: 'Already finalized today' }],
            invoicesList: {}
         });

         await mountAndSubmit();

         expect(screen.getByText(/Already finalized today/)).toBeVisible();

         // The 2-second auto-clear is gone — dismissal is manual only (Alert onClose).
         await act(async () => {
            jest.advanceTimersByTime(5000);
         });
         expect(screen.getByText(/Already finalized today/)).toBeVisible();
      } finally {
         jest.useRealTimers();
      }
   });

   it('shows the skipped customer\'s existing invoice number', async () => {
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 0 invoice(s). Skipped 1 customer(s) (see details).',
         fileLocation: '',
         skippedCustomers: [{ customer_id: 20, display_name: 'Acme', invoice_number: 'INV-2026-1', reason: 'Already finalized today' }],
         invoicesList: {}
      });

      await mountAndSubmit();

      expect(screen.getByText(/Acme/)).toBeInTheDocument();
      expect(screen.getByText(/INV-2026-1/)).toBeInTheDocument();
   });

   it('dismisses the result only when the user closes the alert', async () => {
      postInvoiceCreation.mockResolvedValue({
         status: 200,
         message: 'Finalized 1 invoice(s).',
         fileLocation: '',
         skippedCustomers: [],
         invoicesList: {}
      });

      await mountAndSubmit();
      expect(screen.getByText('Finalized 1 invoice(s).')).toBeInTheDocument();

      await act(async () => fireEvent.click(screen.getByRole('button', { name: /close/i })));
      expect(screen.queryByText('Finalized 1 invoice(s).')).not.toBeInTheDocument();
   });
});
