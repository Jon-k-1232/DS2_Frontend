import {render,screen,fireEvent,act,waitFor} from '@testing-library/react';
import AccountAuditPage from './AccountAuditPage';
import {context} from '../../App';
import {fetchAuditableCustomers,runAccountAudits} from '../../Services/ApiCalls/AccountAuditCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AccountAuditCalls',()=>({fetchAuditableCustomers:jest.fn(),runAccountAudits:jest.fn(),pollAuditJob:jest.fn()}));
jest.mock('./AuditDetailDialog',()=>()=>null);
jest.mock('../../Components/BillingEntities/EntityPicker',()=>()=>null);
const response=name=>({customers:[{customer_id:10,display_name:name,last_app_invoice_total:100}],pagination:{totalCount:1,totalPages:1}});
function open(){render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,displayName:'Admin Person'}}}><AccountAuditPage/></context.Provider>);}
function search(value){fireEvent.change(screen.getByPlaceholderText(/Search/),{target:{value}});fireEvent.click(screen.getByRole('button',{name:'Search',exact:true}));}
it('blocks selected audits while replacement data loads and after a failed read',async()=>{
 fetchAuditableCustomers.mockResolvedValueOnce(response('First client'));let reject;
 fetchAuditableCustomers.mockImplementationOnce(()=>new Promise((resolve,no)=>{reject=no;}));open();
 await screen.findByText('First client');fireEvent.click(screen.getAllByRole('checkbox')[1]);
 expect(screen.getByRole('button',{name:'Audit selected (1)'})).toBeEnabled();search('Second');
 await waitFor(()=>expect(reject).toBeDefined());expect(screen.getByRole('button',{name:'Audit selected (1)'})).toBeDisabled();
 await act(async()=>reject(new Error('Cannot load current balances')));
 expect(await screen.findByText('Cannot load current balances')).toBeVisible();expect(screen.getByRole('button',{name:'Audit selected (1)'})).toBeDisabled();
 expect(screen.queryByText('First client')).not.toBeInTheDocument();expect(runAccountAudits).not.toHaveBeenCalled();
});
it('keeps the newest search when an older response finishes last',async()=>{
 fetchAuditableCustomers.mockResolvedValueOnce(response('First client'));let late;
 fetchAuditableCustomers.mockImplementationOnce(()=>new Promise(resolve=>{late=resolve;})).mockResolvedValueOnce(response('Newest client'));open();
 await screen.findByText('First client');search('Older');await waitFor(()=>expect(late).toBeDefined());search('Newest');await screen.findByText('Newest client');
 await act(async()=>late(response('Older client')));expect(screen.getByText('Newest client')).toBeVisible();expect(screen.queryByText('Older client')).not.toBeInTheDocument();
});
