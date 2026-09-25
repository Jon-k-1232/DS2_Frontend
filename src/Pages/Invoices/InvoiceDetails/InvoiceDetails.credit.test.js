import {render,screen} from '@testing-library/react';
import InvoiceDetails from './InvoiceDetails';
import {context} from '../../../App';
jest.mock('../../../App',()=>({context:require('react').createContext({})}));
jest.mock('./InvoiceHistory',()=>()=>null);
jest.mock('../../../Services/ApiCalls/FetchCalls',()=>({fetchFileDownload:jest.fn()}));
it('labels the immutable issued credit separately from its later current balance',()=>{
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1}}}><InvoiceDetails invoiceData={{invoiceDetails:{customer_invoice_id:1,total_amount_due:-25,current_remaining_balance:15,remaining_balance_on_invoice:-25}}}/></context.Provider>);
 expect(screen.getByText(/Credit statement — no payment due at issuance/)).toBeInTheDocument();
 expect(screen.getByText('Issued credit balance:')).toBeInTheDocument();expect(screen.getByText('No payment due')).toBeInTheDocument();expect(screen.getByText('15')).toBeInTheDocument();
});
