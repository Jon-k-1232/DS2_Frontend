import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CustomerProfile from './CustomerProfile';
import { context } from '../../../App';
import { postInvoiceCreation } from '../../../Services/ApiCalls/PostCalls';

jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../Services/ApiCalls/PostCalls', () => ({ postInvoiceCreation: jest.fn() }));
jest.mock('../../../Services/ApiCalls/AnalyticsCalls', () => ({ downloadCustomerStatement: jest.fn() }));
jest.mock('../../../Components/FloatingTooltip', () => ({ children }) => children);

it('F13 shows cash, retainer and invoice-tagged receipts once without changing amount due', async () => {
   postInvoiceCreation.mockResolvedValue({ status: 200, invoicesWithDetail: [{
      payments: { paymentTotal: -50, paymentsReceivedTotal: -80, retainerPaymentTotal: -20 },
      outstandingInvoices: { outstandingInvoiceRecords: [], outstandingInvoiceTotal: 200 },
      retainerAppliedToInvoice: -20, invoiceTotal: 290
   }] });
   render(<context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013 } }}>
      <CustomerProfile profileData={{ customerData: { customerData: { customer_id: 900101, customer_name: 'Fixture' } } }} />
   </context.Provider>);
   await waitFor(() => expect(screen.getByText('Payments Since Last Bill:').closest('tr').textContent).toContain('-80'));
   expect(screen.getByText('Payments Since Last Bill:').closest('tr').textContent).not.toContain('-70');
   expect(screen.getAllByText('290').length).toBeGreaterThan(0);
});
