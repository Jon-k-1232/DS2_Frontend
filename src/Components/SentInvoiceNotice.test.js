import { render, screen, fireEvent } from '@testing-library/react';
import SentInvoiceNotice from './SentInvoiceNotice';
const mockNavigate=jest.fn();
jest.mock('react-router-dom',()=>({useNavigate:()=>mockNavigate}));
it('explains the lock and opens the owning statement instead of the payment snapshot',()=>{
 render(<SentInvoiceNotice row={{locked_invoice_number:'INV-7',locked_invoice_id:7,customer_invoice_id:6}} />);
 expect(screen.getByText(/Sent — locked/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Open invoice history'}));
 expect(mockNavigate).toHaveBeenCalledWith('/invoices/invoices/invoiceDetail/invoicePayments',{state:{rowData:{customer_invoice_id:7}}});
});
