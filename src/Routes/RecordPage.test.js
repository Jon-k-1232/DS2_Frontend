import {render,screen,fireEvent,act} from '@testing-library/react';
import {MemoryRouter,Routes,Route,Link,useLocation} from 'react-router-dom';
import axios from 'axios';
import {context} from '../App';
import RecordPage from './RecordPage';
jest.mock('axios',()=>({get:jest.fn()}));
jest.mock('../App',()=>({context:require('react').createContext({})}));
jest.mock('../Pages/Transactions/TransactionForms/EditTransaction/EditTransaction',()=>props=><div data-testid='editor'>EditTransaction:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteTimeOrCharge',()=>props=><div data-testid='editor'>DeleteTimeOrCharge:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Transactions/TransactionForms/DeleteTransaction/DeletePayment',()=>props=><div data-testid='editor'>DeletePayment:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Transactions/TransactionForms/ReversePayment/ReversePayment',()=>props=><div data-testid='editor'>ReversePayment:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteRetainer',()=>props=><div data-testid='editor'>DeleteRetainer:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteWriteOff',()=>props=><div data-testid='editor'>DeleteWriteOff:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/EditJob/EditJob',()=>props=><div data-testid='editor'>EditJob:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/DeleteJob/DeleteJob',()=>props=><div data-testid='editor'>DeleteJob:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/EditJob/EditJobTypes',()=>props=><div data-testid='editor'>EditJobTypes:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/DeleteJob/DeleteJobTypes',()=>props=><div data-testid='editor'>DeleteJobTypes:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/EditJob/EditJobCategory',()=>props=><div data-testid='editor'>EditJobCategory:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Jobs/JobForms/DeleteJob/DeleteJobCategory',()=>props=><div data-testid='editor'>DeleteJobCategory:{JSON.stringify(props)}</div>);
jest.mock('../Pages/WorkDescriptions/WorkDescriptionForms/EditWorkDescription/EditWorkDescription',()=>props=><div data-testid='editor'>EditWorkDescription:{JSON.stringify(props)}</div>);
jest.mock('../Pages/WorkDescriptions/WorkDescriptionForms/DeleteWorkDescription/DeleteWorkDescription',()=>props=><div data-testid='editor'>DeleteWorkDescription:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Account/AccountForms/EditAccount/EditUser',()=>props=><div data-testid='editor'>EditUser:{JSON.stringify(props)}</div>);
jest.mock('../Pages/Account/AccountForms/DeleteUser/DeleteUser',()=>props=><div data-testid='editor'>DeleteUser:{JSON.stringify(props)}</div>);
function Location(){return <div data-testid='location'>{useLocation().pathname}</div>;}
const configs=[
 ['transaction','/work/entries/3/7/edit','/work/entries/:customerId/:recordId/:action',{activeTransactionsData:{transactionData:[{transaction_id:7,customer_id:3}]}}],
 ['payment','/payments/receipts/legacy/7/delete','/payments/receipts/legacy/:recordId/:action',{activePaymentData:{activePayments:[{payment_id:7,customer_id:3}]}}],
 ['retainer','/payments/retainers/7/delete','/payments/retainers/:recordId/:action',{activeRetainerData:{activeRetainer:[{retainer_id:7}]}}],
 ['writeoff','/receivables/write-offs/7/delete','/receivables/write-offs/:recordId/:action',{activeWriteOffsData:{activeWriteOffs:[{writeoff_id:7}]}}],
 ['job','/work/jobs/7/edit','/work/jobs/:recordId/:action',{activeJobData:{activeJobs:[{customer_job_id:7}]}}],
 ['jobType','/settings/job-types/7/edit','/settings/job-types/:recordId/:action',{activeJobData:{activeJobs:[{job_type_id:7}]}}],
 ['jobCategory','/settings/job-categories/7/edit','/settings/job-categories/:recordId/:action',{activeJobCategoriesData:{activeJobCategory:[{customer_job_category_id:7}]}}],
 ['workDescription','/settings/work-descriptions/7/edit','/settings/work-descriptions/:recordId/:action',{activeWorkDescriptionData:{workDescriptionData:[{general_work_description_id:7}]}}],
 ['user','/settings/users/7/edit','/settings/users/:recordId/:action',{activeUserData:{activeUser:{user_id:7}}}]
];
function mount(c,role='SUPER ADMIN',path=c[1]){return render(<MemoryRouter initialEntries={[{pathname:path,state:{rowData:{customer_job_id:88}}}]}><context.Provider value={{loggedInUser:{accountID:9001,userID:90013,accessLevel:role}}}><Link to={c[1].replace('/7/','/8/')}>Next record</Link><Location/><Routes><Route path={c[2]} element={<RecordPage kind={c[0]} customerData={{}} setCustomerData={jest.fn()}/>}/><Route path='/payments/receipts/:receiptId' element={<div>Receipt detail</div>}/></Routes></context.Provider></MemoryRouter>);}
beforeEach(()=>jest.clearAllMocks());
test.each(configs)('%s editor loads the URL record without browser state',async(...c)=>{
 axios.get.mockResolvedValue({data:{status:200,...c[3]}});mount(c);
 expect(screen.getByRole('status')).toHaveTextContent('Loading record');
 expect(await screen.findByTestId('editor')).toHaveTextContent(':7');expect(screen.getByTestId('editor')).not.toHaveTextContent(':88');
});
test.each(configs)('%s editor refuses a missing or foreign record without rendering a write form',async(...c)=>{
 axios.get.mockResolvedValue({data:{status:404,message:'Record not found.'}});mount(c);expect(await screen.findByRole('alert')).toHaveTextContent('Record not found.');expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
});
test.each(configs)('%s editor can retry a failed request at the same URL',async(...c)=>{
 axios.get.mockRejectedValueOnce({response:{data:{message:'Unavailable'}}}).mockResolvedValue({data:{status:200,...c[3]}});mount(c);
 expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByTestId('editor');expect(screen.getByTestId('location')).toHaveTextContent(c[1]);
});
test('invalid ID performs no request and offers list recovery',()=>{
 const c=configs[4];mount(c,'admin',c[1].replace('/7/','/NaN/'));expect(screen.getByRole('alert')).toHaveTextContent('does not identify a record');expect(axios.get).not.toHaveBeenCalled();
});
test.each(['manager','employee'])('%s cannot open adjustment controls',role=>{
 mount(configs[3],role);expect(screen.getByRole('alert')).toHaveTextContent('Only admins');expect(axios.get).not.toHaveBeenCalled();expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
});
test('receipt-backed legacy payment resolves to its protected receipt',async()=>{
 axios.get.mockResolvedValue({data:{status:200,activePaymentData:{activePayments:[{payment_id:7,customer_id:3,receipt_id:91}]}}});mount(configs[1]);await screen.findByText('Receipt detail');expect(screen.getByTestId('location')).toHaveTextContent('/payments/receipts/91');
});
test('late record response is discarded after navigation and its request is aborted',async()=>{
 let finish;axios.get.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue({data:{status:200,activeJobData:{activeJobs:[{customer_job_id:8}]}}});mount(configs[4]);fireEvent.click(screen.getByText('Next record'));expect(await screen.findByTestId('editor')).toHaveTextContent(':8');expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);await act(async()=>finish({data:{status:200,...configs[4][3]}}));expect(screen.getByTestId('editor')).toHaveTextContent(':8');
});

test('payment records hydrate exact job/retainer references and request only business-scoped invoice snapshots',async()=>{
 axios.get.mockImplementation(url=>{
  if(url.includes('/getSinglePayment/'))return Promise.resolve({data:{status:200,activePaymentData:{activePayments:[{payment_id:7,customer_id:3,customer_job_id:19,retainer_id:23,billing_entity_id:5}]}}});
  if(url.includes('/lookup/'))return Promise.resolve({data:{customers:[{customer_id:3,display_name:'Selected client'}]}});
  if(url.includes('/getSingleJob/'))return Promise.resolve({data:{activeJobData:{activeJobs:[{customer_job_id:19,customer_id:3}]}}});
  if(url.includes('/getSingleRetainer/'))return Promise.resolve({data:{activeRetainerData:{activeRetainer:[{retainer_id:23,customer_id:3}]}}});
  return Promise.resolve({data:{status:200,customerInvoiceData:{customerInvoices:[]}}});
 });
 mount(configs[1]);const editor=await screen.findByTestId('editor');expect(editor).toHaveTextContent('"customerJobs":[{"customer_job_id":19');expect(editor).toHaveTextContent('"customerRetainers":[{"retainer_id":23');
 expect(axios.get.mock.calls.find(([url])=>url.includes('/customerByID/'))[1].params).toEqual({section:'invoices',entityId:5});
});
