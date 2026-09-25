import {render,screen,fireEvent,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import DeleteTimeOrCharge from './DeleteTimeOrCharge';
import {deleteChargeOrTimeTransaction} from '../../../../Services/ApiCalls/DeleteCalls';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/DeleteCalls',()=>({deleteChargeOrTimeTransaction:jest.fn()}));
test.each([409,500])('a stale/failing delete (%s) displays the refusal and preserves the form',async status=>{
 const setCustomerData=jest.fn();
 deleteChargeOrTimeTransaction.mockRejectedValue({response:{status,data:{message:status===409?'This invoice is sent and locked.':'Unable to delete transaction.'}}});
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><DeleteTimeOrCharge customerData={{customersList:{activeCustomerData:{activeCustomers:[{customer_id:1}]}},teamMembersList:{activeUserData:{activeUsers:[]}},accountJobsList:{activeJobData:{activeJobs:[]}}}} setCustomerData={setCustomerData} transactionData={{transaction_id:1,customer_id:1,transaction_type:'Charge',quantity:2,unit_cost:10,total_transaction:20,transaction_date:'2026-08-31'}} /></context.Provider></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Delete Transaction',exact:true}));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true})));
 expect(await screen.findByRole('alert')).toHaveTextContent(status===409?'sent and locked':'Unable to delete');
 expect(screen.getByRole('button',{name:'Delete Transaction',exact:true})).toBeEnabled();
 expect(setCustomerData).not.toHaveBeenCalled();
});

test('the transaction can arrive before lookup lists without crashing or losing its customer ID',async()=>{
 deleteChargeOrTimeTransaction.mockResolvedValue({status:409,message:'Sent and locked'});
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><DeleteTimeOrCharge customerData={{}} setCustomerData={jest.fn()} transactionData={{transaction_id:42,customer_id:17,customer_job_id:8,transaction_type:'Charge',quantity:2,unit_cost:10,total_transaction:20,transaction_date:'2026-08-31'}} /></context.Provider></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Delete Transaction',exact:true}));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true})));
 expect(deleteChargeOrTimeTransaction).toHaveBeenLastCalledWith(expect.objectContaining({transactionID:42,customerID:17}),9001,90013);
 expect(await screen.findByRole('alert')).toHaveTextContent('Sent and locked');
});
