import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import axios from 'axios';
import {context} from '../../App';
import CustomerPicker from './CustomerPicker';
import useJobChoices from './useJobChoices';
import useReviewReferences from './useReviewReferences';
import PagedRegister from './PagedRegister';
jest.mock('axios',()=>({get:jest.fn()}));
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../BillingEntities/EntityPicker',()=>()=>null);
jest.mock('../DataGrids/PaginationGrid',()=>props=><div><span data-testid="grid-columns">{props.tableData.columns.map(c=>c.field).join(',')}</span><span>{props.tableData.rows.map(r=>r.customer_job_id).join(',')}</span>{props.renderToolbarContent()}<button onClick={()=>props.onPaginationModelChange({page:1,pageSize:20})}>Next page</button><button onClick={()=>props.onSortModelChange([{field:'customer_name',sort:'asc'}])}>Sort client</button></div>);
const user={accountID:9001,userID:90013};
const wrapper=({children})=><context.Provider value={{loggedInUser:user}}>{children}</context.Provider>;
const local={customersList:{activeCustomerData:{remote:false,threshold:1000,activeCustomers:[{customer_id:1,display_name:'One'},{customer_id:2,display_name:'Two'}]}}};
const remote={customersList:{activeCustomerData:{remote:true,threshold:1000,activeCustomers:[]}}};
beforeEach(()=>jest.clearAllMocks());
test('small directories keep their native client choices without a request',()=>{
 const change=jest.fn();render(<CustomerPicker native customerData={local} value='' onChange={change}/>,{wrapper});fireEvent.change(screen.getByLabelText('Client'),{target:{value:'2'}});expect(change).toHaveBeenCalledWith('2');expect(axios.get).not.toHaveBeenCalled();
});
test('large directories search on demand and return the chosen identity',async()=>{
 axios.get.mockResolvedValue({data:{customers:[{customer_id:1008,display_name:'Client beyond first page'}]}});
 const change=jest.fn();render(<CustomerPicker native customerData={remote} value='' onChange={change}/>,{wrapper});
 fireEvent.focus(screen.getByRole('combobox'));
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'beyond'}});
 fireEvent.click(await screen.findByRole('option',{name:'Client beyond first page'}));expect(change).toHaveBeenCalledWith(1008);
 await waitFor(()=>expect(axios.get.mock.calls.some(([,o])=>o.params.search==='beyond')).toBe(true));
});
test('a failed remote search explains the failure and retains selection',async()=>{
 axios.get.mockRejectedValue(new Error('Lookup unavailable'));
 render(<CustomerPicker customerData={remote} value={{customer_id:12,display_name:'Chosen'}} onChange={()=>{}}/>,{wrapper});
 expect(await screen.findByText('Lookup unavailable')).toBeVisible();expect(screen.getByRole('combobox')).toHaveValue('Chosen');
});
function Jobs({customerId,entityId,search='',selectedId}){const state=useJobChoices(customerId,entityId,search,0,selectedId);return <div><span>{state.rows.map(r=>r.job_description).join(',')}</span>{state.error&&<div role='alert'>{state.error}</div>}</div>;}
test('changing client aborts and clears old job choices, late replies are ignored',async()=>{
 let finish;
 axios.get.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[{customer_job_id:9,job_description:'Right client'}]}}});
 const view=render(<Jobs customerId={1} entityId={8}/>,{wrapper});await waitFor(()=>expect(axios.get).toHaveBeenCalledTimes(1));view.rerender(<Jobs customerId={2} entityId={8}/>);
 expect(await screen.findByText('Right client')).toBeVisible();expect(axios.get.mock.calls[0][1].signal.aborted).toBe(true);
 await act(async()=>finish({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[{job_description:'Wrong client'}]}}}));expect(screen.queryByText('Wrong client')).not.toBeInTheDocument();
});
test('job search carries client, business and search; no customer means no request',async()=>{
 axios.get.mockResolvedValue({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[]}}});
 const view=render(<Jobs/>,{wrapper});expect(axios.get).not.toHaveBeenCalled();view.rerender(<Jobs customerId={12} entityId={99} search='tax'/>);
 await waitFor(()=>expect(axios.get).toHaveBeenCalled());expect(axios.get.mock.calls[0][0]).toMatch(/\/12$/);expect(axios.get.mock.calls[0][1].params).toEqual({limit:100,entityId:99,search:'tax'});
});
test('job failure is visible rather than an apparently empty list',async()=>{
 axios.get.mockRejectedValue(new Error('Jobs unavailable'));render(<Jobs customerId={1}/>,{wrapper});expect(await screen.findByRole('alert')).toHaveTextContent('Jobs unavailable');
});
test('a selected historical job outside the first page is loaded with its label',async()=>{
 axios.get.mockResolvedValueOnce({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[]}}}).mockResolvedValueOnce({data:{status:200,activeJobData:{activeJobs:[{customer_job_id:7,customer_id:1,billing_entity_id:8,job_description:'Historical job'}]}}});
 render(<Jobs customerId={1} entityId={8} selectedId={7}/>,{wrapper});
 expect(await screen.findByText('Historical job')).toBeVisible();expect(axios.get.mock.calls[1][0]).toMatch(/getSingleJob\/7\/9001\/90013$/);
});
test('an exact job lookup from a different client or business cannot become a choice',async()=>{
 axios.get.mockResolvedValueOnce({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[]}}}).mockResolvedValueOnce({data:{status:200,activeJobData:{activeJobs:[{customer_job_id:7,customer_id:2,billing_entity_id:9,job_description:'Wrong selection'}]}}});
 render(<Jobs customerId={1} entityId={8} selectedId={7}/>,{wrapper});
 await waitFor(()=>expect(axios.get).toHaveBeenCalledTimes(2));expect(screen.queryByText('Wrong selection')).not.toBeInTheDocument();
});
test('register search and sorting reset the server page and never need shared rows',async()=>{
 axios.get.mockResolvedValue({data:{status:200,accountJobsList:{activeJobData:{activeJobs:[{customer_job_id:8,customer_name:'Client'}],pagination:{totalItems:80}}}}});
 render(<PagedRegister title='Jobs' path='/jobs/getJobs' listKey='accountJobsList' dataKey='activeJobData' rowsKey='activeJobs' idField='customer_job_id' columns={['customer_name','customer_job_id']} sortable/>,{wrapper});
 await screen.findByText('8');expect(screen.getByTestId('grid-columns')).toHaveTextContent('customer_name,customer_job_id');fireEvent.click(screen.getByText('Next page'));await waitFor(()=>expect(axios.get.mock.calls.at(-1)[1].params.page).toBe(2));
 fireEvent.change(screen.getByLabelText('Search jobs'),{target:{value:'new'}});await waitFor(()=>expect(axios.get.mock.calls.at(-1)[1].params).toMatchObject({page:1,search:'new'}));
 fireEvent.click(screen.getByText('Sort client'));await waitFor(()=>expect(axios.get.mock.calls.at(-1)[1].params).toMatchObject({page:1,sort:'customer_name',direction:'asc'}));
});
test('register read failure offers retry and a succeeding read restores rows',async()=>{
 axios.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({data:{status:200,accountJobsList:{activeJobData:{activeJobs:[{customer_job_id:12}],pagination:{totalItems:1}}}}});
 render(<PagedRegister title='Jobs' path='/jobs/getJobs' listKey='accountJobsList' dataKey='activeJobData' rowsKey='activeJobs' idField='customer_job_id' columns={[]}/>,{wrapper});
 expect(await screen.findByRole('alert')).toHaveTextContent('Offline');fireEvent.click(screen.getByText('Try again'));expect(await screen.findByText('12')).toBeVisible();
});

function ReviewReferences(){const data=useReviewReferences(local,{company_name:'One'});return <div>{data.referencesLoading?'Loading suggestions':data.accountJobsList.activeJobData.activeJobs.map(j=>j.job_description).join(',')}</div>;}
test('billing review waits for asynchronous suggested jobs before mounting its prefilled form',async()=>{let finish;axios.get.mockImplementation(()=>new Promise(resolve=>finish=resolve));render(<ReviewReferences/>,{wrapper});expect(screen.getByText('Loading suggestions')).toBeVisible();await waitFor(()=>expect(axios.get).toHaveBeenCalled());await act(async()=>finish({data:{status:200,activeCustomerJobData:{activeCustomerJobs:[{customer_job_id:7,job_description:'Suggested job'}]}}}));expect(await screen.findByText('Suggested job')).toBeVisible();expect(screen.queryByText('Loading suggestions')).not.toBeInTheDocument();});

test('client controls stay disabled until the directory decides local or remote mode',()=>{render(<CustomerPicker customerData={{}} native value='' onChange={()=>{}}/>,{wrapper});expect(screen.getByLabelText('Client')).toBeDisabled();expect(screen.getByText('Loading clients…')).toBeVisible();expect(axios.get).not.toHaveBeenCalled();});
