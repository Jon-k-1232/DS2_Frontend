import {render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import TokenService from '../Services/TokenService';
jest.mock('../Services/TokenService',()=>({hasAuthToken:jest.fn()}));
function Login(){return <div>{useLocation().state?.from}</div>;}
test('sign-in recovery retains an internal record bookmark, query and fragment',()=>{
 TokenService.hasAuthToken.mockReturnValue(false);
 render(<MemoryRouter initialEntries={['/billing/invoices/7/payments?keep=1#events']}><Routes><Route element={<PrivateRoute/>}><Route path='/billing/invoices/:id/payments' element={<div>Protected</div>}/></Route><Route path='/login' element={<Login/>}/></Routes></MemoryRouter>);
 expect(screen.getByText('/billing/invoices/7/payments?keep=1#events')).toBeVisible();expect(screen.queryByText('Protected')).not.toBeInTheDocument();
});
