import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {context} from '../../../../App';
import {deleteUser} from '../../../../Services/ApiCalls/DeleteCalls';
import DeleteUser from './DeleteUser';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/DeleteCalls',()=>({deleteUser:jest.fn()}));
const user={user_id:99,account_id:9001,display_name:'Synthetic staff',email:'synthetic@example.com',is_user_active:true};
const setCustomerData=jest.fn();
function mount(){render(<MemoryRouter initialEntries={['/delete']}><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Routes><Route path='/delete' element={<DeleteUser customerData={{}} setCustomerData={setCustomerData} userData={user}/>}/><Route path='/settings/users' element={<div>User list</div>}/></Routes></context.Provider></MemoryRouter>);}
async function confirm(){fireEvent.click(await screen.findByRole('button',{name:'Delete User',exact:true}));fireEvent.click(within(await screen.findByRole('dialog',{name:'Delete user',exact:true})).getByRole('button',{name:'Delete',exact:true}));}
beforeEach(()=>jest.clearAllMocks());
test('a delete failure retains the user and permits an explicit successful retry',async()=>{
 deleteUser.mockRejectedValueOnce({response:{status:500,data:{message:'Unavailable'}}}).mockResolvedValue({status:200,teamMembersList:{users:[]}});mount();await confirm();await screen.findByText('Unavailable');expect(screen.getByText('Synthetic staff')).toBeVisible();expect(setCustomerData).not.toHaveBeenCalled();await confirm();await screen.findByText('User list');expect(deleteUser).toHaveBeenCalledTimes(2);
});
test('an in-flight user deletion disables another submit until completion',async()=>{
 let finish;deleteUser.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));mount();await confirm();const button=await screen.findByRole('button',{name:'Delete User',exact:true});expect(button).toBeDisabled();fireEvent.click(button);expect(deleteUser).toHaveBeenCalledTimes(1);await act(async()=>finish({status:200,teamMembersList:{users:[]}}));await waitFor(()=>expect(screen.getByText('User list')).toBeVisible());
});
