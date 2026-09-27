import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import DeleteJob from './DeleteJob';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/DeleteCalls',()=>({deleteJob:jest.fn()}));
jest.mock('../../../../Components/DataGrids/DataGrid',()=>()=>null);
const data={teamMembersList:{activeUserData:{activeUsers:[]}},customersList:{activeCustomerData:{activeCustomers:[]}},jobTypesList:{activeJobTypesData:{jobTypesData:[]}}};
function show(dependencies){return render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><DeleteJob customerData={data} setCustomerData={()=>{}} jobData={{customer_job_id:9,dependencies}}/></context.Provider></MemoryRouter>);}
test('links from another version disable family deletion even with no bootstrap ledger rows',()=>{show({transactions:[{transaction_id:1,customer_job_id:2}],writeoffs:[],paymentsCount:0});expect(screen.getByRole('button',{name:'Delete Job'})).toBeDisabled();expect(screen.getByText('Before deleting this job, move the linked records to the correct job:')).toBeVisible();});
test('payment-only links prevent deleting the family and explain why',()=>{show({transactions:[],writeoffs:[],paymentsCount:2});expect(screen.getByRole('button',{name:'Delete Job'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('2 payment(s)');});
test('a family with no links is deletable',()=>{show({transactions:[],writeoffs:[],paymentsCount:0});expect(screen.getByRole('button',{name:'Delete Job'})).toBeEnabled();});
