import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReversePayment from './ReversePayment';
import { context } from '../../../../App';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/PostCalls',()=>({postReversePayment:jest.fn()}));
it('replaces ordinary reversal controls with the audited exception link on a locked receipt',()=>{
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><ReversePayment paymentData={{payment_id:2,payment_amount:-100,sent_locked:true,locked_invoice_id:7,locked_invoice_number:'INV-7'}} /></context.Provider></MemoryRouter>);
 expect(screen.getByRole('button',{name:'Open invoice history'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Reverse Payment/})).not.toBeInTheDocument();
});
