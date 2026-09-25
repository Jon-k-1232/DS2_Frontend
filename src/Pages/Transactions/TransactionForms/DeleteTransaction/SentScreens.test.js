import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import DeleteTimeOrCharge from './DeleteTimeOrCharge';
import DeletePayment from './DeletePayment';
import DeleteWriteOff from './DeleteWriteOff';
import DeleteRetainer from './DeleteRetainer';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/DeleteCalls',()=>({deleteChargeOrTimeTransaction:jest.fn(),deletePayment:jest.fn(),deleteWriteOff:jest.fn(),deleteRetainer:jest.fn()}));
jest.mock('../../../../Services/ApiCalls/FetchCalls',()=>({fetchCustomerProfileInformation:jest.fn(async()=>({customerPaymentData:{grid:{rows:[],columns:[]}}}))}));
jest.mock('../../../../Components/DataGrids/DataGrid',()=>()=>null);
test.each([
 ['work',DeleteTimeOrCharge,'transactionData',{transaction_id:1}],
 ['payment',DeletePayment,'paymentData',{payment_id:2}],
 ['write-off',DeleteWriteOff,'writeOffData',{writeoff_id:3}],
 ['retainer',DeleteRetainer,'retainerData',{retainer_id:4}]
])('the sent %s screen renders its lock while lookups are loading',async(_,Component,prop,row)=>{
 const data={...row,customer_id:17,sent_locked:true,locked_invoice_number:'INV-2026-1',locked_invoice_id:10};
 const props={[prop]:data,customerData:{},setCustomerData:jest.fn()};
 const view=render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Component {...props}/></context.Provider></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Sent — locked · INV-2026-1');
 expect(screen.queryByRole('button',{name:/^Delete /})).not.toBeInTheDocument();
 view.unmount();
});
