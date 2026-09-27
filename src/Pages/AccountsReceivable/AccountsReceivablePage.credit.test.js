import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import AccountsReceivablePage from './AccountsReceivablePage';
import {context} from '../../App';
import {fetchARAging,downloadARAgingCsv} from '../../Services/ApiCalls/AccountsReceivableCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AccountsReceivableCalls',()=>({fetchARAging:jest.fn(),downloadARAgingCsv:jest.fn()}));
it('uses clear business columns, collapses report history and attaches estimates only to their amount',async()=>{
 fetchARAging.mockResolvedValue({arAging:{customers:[{customer_id:2,billing_entity_name:'Tax',display_name:'Estimated client',total_outstanding:20,bucket_0_30:20,bucket_unknown:0,reconstructed:true}],pagination:{totalPages:1,totalItems:1}}});
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1,token:'test'}}}><AccountsReceivablePage/></context.Provider>);
 await screen.findByText('Estimated client');
 expect(screen.getByRole('columnheader',{name:'Our business'})).toBeVisible();
 expect(screen.getByRole('columnheader',{name:'Client company'})).toBeVisible();
 expect(screen.queryByLabelText('Include records saved through')).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Advanced: reproduce an earlier report'}));
 expect(screen.getByLabelText('Include records saved through')).toBeVisible();
 expect(screen.queryByText('Reconstructed legacy')).not.toBeInTheDocument();
 const row=screen.getByText('Estimated client').closest('tr');
 expect(row.cells[8]).not.toHaveTextContent('Estimated');
 expect(screen.getByLabelText('Estimated from historical records')).toHaveTextContent('Estimated');
 const totals=screen.getByText('Page totals').closest('tr');
 expect(totals.cells[4]).not.toHaveStyle({color:'rgb(211, 47, 47)'});
});
it('shows a signed credit and no payment due, separately from positive obligation buckets',async()=>{
 fetchARAging.mockResolvedValue({status:200,arAging:{customers:[{customer_id:2,display_name:'Credit client',total_outstanding:-25,bucket_0_30:0,statement_credit:25,bucket_31_60:0,bucket_61_90:0,bucket_over_90:0,oldest_days:0}],pagination:{totalPages:1,totalItems:1}}});
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1,token:'test'}}}><AccountsReceivablePage/></context.Provider>);
 expect(await screen.findByText('Credit — no payment due')).toBeInTheDocument();expect(screen.getAllByText('$-25.00').length).toBeGreaterThanOrEqual(1);expect(screen.getByText('Balance / credit')).toBeInTheDocument();
});

it('combines the business selection with search and export and ignores late responses from the previous business',async()=>{
 const {entitiesCall}=require('../../Services/ApiCalls/BillingEntitiesCalls');entitiesCall.mockResolvedValue({entities:[{billing_entity_id:1,name:'Tax',active:true,is_default:true},{billing_entity_id:2,name:'Advisory',active:true}]});
 let oldResponse;fetchARAging.mockImplementation((a,u,filters)=>filters.entityId===1?new Promise(resolve=>{oldResponse=resolve;}):Promise.resolve({arAging:{customers:filters.entityId===2?[{customer_id:2,billing_entity_id:2,billing_entity_name:'Advisory',display_name:'Scoped client',total_outstanding:40}]:[],pagination:{totalPages:1,totalItems:1}}}));
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1,token:'test'}}}><AccountsReceivablePage/></context.Provider>);
 await screen.findByRole('option',{name:'Tax'});fireEvent.change(screen.getByPlaceholderText(/Search by business/),{target:{value:'Scoped'}});fireEvent.click(screen.getByRole('button',{name:'Search',exact:true}));
 fireEvent.change(screen.getByLabelText('Billing business'),{target:{value:'1'}});await waitFor(()=>expect(oldResponse).toBeDefined());fireEvent.change(screen.getByLabelText('Billing business'),{target:{value:'2'}});expect(await screen.findByText('Scoped client')).toBeVisible();
 await act(async()=>oldResponse({arAging:{customers:[{customer_id:1,display_name:'Stale Tax client',total_outstanding:99}]}}));expect(screen.queryByText('Stale Tax client')).not.toBeInTheDocument();
 expect(fetchARAging).toHaveBeenLastCalledWith(1,1,expect.objectContaining({search:'Scoped',entityId:2,page:1}),'test');fireEvent.click(screen.getByRole('button',{name:'Export CSV'}));await waitFor(()=>expect(downloadARAgingCsv).toHaveBeenCalledWith(1,1,expect.objectContaining({search:'Scoped',entityId:2}),'test'));
});


it('uses the same effective date and UTC knowledge cutoff for the table and export',async()=>{
 fetchARAging.mockResolvedValue({arAging:{customers:[{customer_id:2,display_name:'Historical balance',total_outstanding:40,bucket_31_60:40}],pagination:{totalPages:1,totalItems:1}}});
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1,token:'test'}}}><AccountsReceivablePage/></context.Provider>);
 fireEvent.change(screen.getByLabelText('Aging as of'),{target:{value:'2026-08-31'}});
 fireEvent.click(screen.getByRole('button',{name:'Advanced: reproduce an earlier report'}));
 fireEvent.change(screen.getByLabelText('Include records saved through'),{target:{value:'2026-09-01T05:00:00Z'}});
 await waitFor(()=>expect(fetchARAging).toHaveBeenLastCalledWith(1,1,expect.objectContaining({asOf:'2026-08-31',recordedThrough:'2026-09-01T05:00:00Z'}),'test'));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Export CSV'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Export CSV'}));
 await waitFor(()=>expect(downloadARAgingCsv).toHaveBeenLastCalledWith(1,1,expect.objectContaining({asOf:'2026-08-31',recordedThrough:'2026-09-01T05:00:00Z'}),'test'));
});
