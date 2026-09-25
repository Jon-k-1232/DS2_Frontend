import {render,screen,fireEvent,act,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import DeletePayment from './DeletePayment';
import DeleteWriteOff from './DeleteWriteOff';
import DeleteRetainer from './DeleteRetainer';
import {deletePayment,deleteWriteOff,deleteRetainer} from '../../../../Services/ApiCalls/DeleteCalls';
import {fetchCustomerProfileInformation} from '../../../../Services/ApiCalls/FetchCalls';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/DeleteCalls',()=>({deletePayment:jest.fn(),deleteWriteOff:jest.fn(),deleteRetainer:jest.fn()}));
jest.mock('../../../../Services/ApiCalls/FetchCalls',()=>({fetchCustomerProfileInformation:jest.fn()}));
jest.mock('../../../../Components/DataGrids/DataGrid',()=>()=>null);
const cases=[
 ['payment',DeletePayment,'paymentData',{payment_id:2,payment_amount:-5,payment_date:'2026-08-31'},deletePayment,'Delete Payment'],
 ['write-off',DeleteWriteOff,'writeOffData',{writeoff_id:3,writeoff_amount:-2,writeoff_date:'2026-08-31'},deleteWriteOff,'Delete Write-off'],
 ['retainer',DeleteRetainer,'retainerData',{retainer_id:4,starting_amount:-25,current_amount:-25},deleteRetainer,'Delete Retainer']
];
function mount(Component,prop,row){
 const changed=jest.fn();
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Component {...{[prop]:{...row,customer_id:17,customer_name:'Local client'},customerData:{},setCustomerData:changed}} /></context.Provider></MemoryRouter>);
 return changed;
}
beforeEach(()=>{jest.clearAllMocks();fetchCustomerProfileInformation.mockResolvedValue({status:200,customerPaymentData:{grid:{rows:[],columns:[]}}});});
for(const status of [409,500])test.each(cases)('%s delete displays an HTTP '+status+' refusal without clearing the record',async(_,Component,prop,row,remove,label)=>{
 remove.mockRejectedValue({response:{status,data:{message:status===409?'This invoice is sent and locked.':'Unable to delete this record.'}}});
 const changed=mount(Component,prop,row);
 await waitFor(()=>expect(screen.getByRole('button',{name:label,exact:true})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:label,exact:true}));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true})));
 expect(await screen.findByRole('alert')).toHaveTextContent(status===409?'sent and locked':'Unable to delete');
 expect(await screen.findByRole('button',{name:label,exact:true})).toBeEnabled();
 expect(changed).not.toHaveBeenCalled();
 expect(screen.getByText('Local client',{exact:true})).toBeInTheDocument();
});
test.each([
 ['server failure',()=>Promise.resolve({status:500,message:'Unable to check linked payments.'})],
 ['network failure',()=>Promise.reject(new Error('Network Error'))],
 ['incomplete response',()=>Promise.resolve({status:200})]
])('retainer deletion stays unavailable after a %s checking linked payments',async(_,load)=>{
 fetchCustomerProfileInformation.mockImplementation(load);
 mount(DeleteRetainer,'retainerData',{retainer_id:4,starting_amount:-25,current_amount:-25});
 expect(await screen.findByRole('alert')).toHaveTextContent(/linked payments|Network Error/i);
 expect(screen.getByRole('button',{name:'Delete Retainer',exact:true})).toBeDisabled();
 expect(deleteRetainer).not.toHaveBeenCalled();
});

test('a retainer root with a linked payment explains the dependency and disables deletion',async()=>{
 fetchCustomerProfileInformation.mockResolvedValue({status:200,customerPaymentData:{grid:{rows:[{payment_id:8,retainer_id:4,payment_amount:-20}],columns:[]}}});
 mount(DeleteRetainer,'retainerData',{retainer_id:4,current_amount:-25});
 expect(await screen.findByText('Before deletion, please remove the following items:')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Delete Retainer',exact:true})).toBeDisabled();
 expect(deleteRetainer).not.toHaveBeenCalled();
});
