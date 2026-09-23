/**
 * ReviewPaymentDialog — approval is ONE atomic POST, and only one.
 *
 * The old dialog fell back to a two-step flow (create payment, then PUT
 * /pending-payments/approve/:paymentID) when the atomic route answered with a
 * non-JSON 404; the first step had already posted the receipt, so a retry
 * could post it twice. The backend now answers that PUT with 410 and the
 * fallback is gone: a missing route is a hard stop with no second request, and
 * a successful approval disables Submit until the dialog closes itself.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ReviewPaymentDialog from './ReviewPaymentDialog';
import { context } from '../../../../App';
import axios from 'axios';
import { fetchCustomers, fetchCustomerProfileInformation } from '../../../../Services/ApiCalls/FetchCalls';

jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), get: jest.fn() } }));
jest.mock('../../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('./PaymentPdfPreview', () => () => null);
jest.mock('../../../../Services/ApiCalls/FetchCalls', () => ({ fetchCustomers: jest.fn(), fetchCustomerProfileInformation: jest.fn() }));

const pending = { payment_id: 555, matched_customer_id: 20, payment_amount: 10, customer_invoice_id: 88, payment_date: '2026-09-22', form_of_payment: 'Check' };

const mount = async () => {
   fetchCustomers.mockResolvedValue({ customersList: { activeCustomerData: { activeCustomers: [{ customer_id: 20, display_name: 'Acme' }] } } });
   fetchCustomerProfileInformation.mockResolvedValue({
      customerInvoiceData: { customerInvoices: [{ customer_invoice_id: 88, invoice_number: 'INV-88', parent_invoice_id: null, remaining_balance_on_invoice: 100, notes: '' }] }
   });
   await act(async () =>
      render(
         <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'session' } }}>
            <ReviewPaymentDialog open pendingPayment={pending} onClose={jest.fn()} onApproved={jest.fn()} setCustomerData={jest.fn()} />
         </context.Provider>
      )
   );
   await waitFor(() => expect(screen.getByRole('combobox', { name: /^Invoice/ })).toHaveValue('INV-88 — $100.00 remaining'));
};

beforeEach(() => {
   jest.clearAllMocks();
   window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} });
});

test('a missing atomic route (non-JSON 404) makes exactly one POST, no fallback request, and a hard-stop message', async () => {
   axios.post.mockRejectedValue({ response: { status: 404, data: '<html>Cannot POST</html>' } });
   await mount();
   await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Approve & Submit Payment' })));

   expect(await screen.findByText(/do not retry/)).toBeVisible();
   expect(axios.post).toHaveBeenCalledTimes(1);
   expect(axios.post.mock.calls[0][0]).toMatch(/pending-payments\/approve\/9001\/90013$/);
   expect(axios.put).not.toHaveBeenCalled();
   // The dialog stays open for the accountant to read the message; Submit is usable again only for a genuine retry.
   expect(screen.getByRole('button', { name: 'Approve & Submit Payment' })).toBeInTheDocument();
});

test("the API's own JSON 404 is shown as an error, not treated as a missing route", async () => {
   axios.post.mockRejectedValue({ response: { status: 404, data: { status: 404, message: 'Pending payment record not found.' } } });
   await mount();
   await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Approve & Submit Payment' })));

   expect(await screen.findByText('Pending payment record not found.')).toBeVisible();
   expect(axios.post).toHaveBeenCalledTimes(1);
   expect(axios.put).not.toHaveBeenCalled();
});

test('after a successful approval Submit is disabled and another click sends no second POST', async () => {
   axios.post.mockResolvedValue({ data: { status: 200 } });
   await mount();
   const submit = screen.getByRole('button', { name: 'Approve & Submit Payment' });
   await act(async () => fireEvent.click(submit));

   expect(screen.getByText('Payment approved and created successfully.')).toBeVisible();
   expect(submit).toBeDisabled();
   await act(async () => fireEvent.click(submit));
   expect(axios.post).toHaveBeenCalledTimes(1);
   expect(axios.put).not.toHaveBeenCalled();
});
