import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CustomerProfilePayments from './CustomerProfilePayments';
import CustomerRetainers from './CustomerRetainers';
jest.mock('../../Payments/ReceiptsPage',()=>props=><div>Receipt scope {props.customerId}/{props.billingEntityId || 'all'}</div>);
jest.mock('../../../Components/DataGrids/DataGrid',()=>()=>null);
jest.mock('../../../Components/DataGrids/ExpandableGrid',()=>()=>null);
jest.mock('./RetainerEvents',()=>()=>null);
const profile={customerData:{customerData:{customer_id:7}},customerPaymentData:{grid:{rows:[],columns:[]}},customerRetainerData:{customerRetainers:[]}};
test('client receipts scope the receipt list to the URL client and selected business',()=>{
 const {rerender}=render(<MemoryRouter><CustomerProfilePayments profileData={profile} entityId={3}/></MemoryRouter>);expect(screen.getByText('Receipt scope 7/3')).toBeVisible();rerender(<MemoryRouter><CustomerProfilePayments profileData={profile} entityId={null}/></MemoryRouter>);expect(screen.getByText('Receipt scope 7/all')).toBeVisible();
});
test('retainer tab separates credit and links directly to that client and business',()=>{
 render(<MemoryRouter><CustomerRetainers profileData={profile} entityId={3}/></MemoryRouter>);expect(screen.getByRole('link',{name:'View client credits'})).toHaveAttribute('href','/payments/credits?customerId=7&entityId=3');
});
