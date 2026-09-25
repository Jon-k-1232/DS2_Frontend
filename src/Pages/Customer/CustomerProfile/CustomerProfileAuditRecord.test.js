import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import AuditRecord,{auditTime} from './CustomerProfileAuditRecord';
import Guard,{canAccessAuditRecord} from '../../../Routes/AuditRecordProtectedAccess';
import {context} from '../../../App';
import * as calls from '../../../Services/ApiCalls/AuditRecordCalls';
jest.mock('../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../Services/ApiCalls/AuditRecordCalls',()=>({fetchAuditRecord:jest.fn(),fetchPrintedRecords:jest.fn(),printAuditRecord:jest.fn(),openAuditRecord:jest.fn(),verifyAuditRecord:jest.fn()}));
const record={record_id:'saved-id',record_type:'client',generated_by:2,generated_by_name:'Ada Admin',generated_at:'2026-09-25T06:00:00Z',document_sha256:'123abc',start_date:'2026-01-01T07:00:00.000Z',end_date:'2026-02-01T07:00:00.000Z'};
const history={opening_balance:10,closing_balance:30,current:{running_balance:30,billed_balance:20,unbilled_balance:10,retainer_available:5},total:26,methodology:'Saved database records',entries:[{id:1,occurred_at:'2026-09-25T06:00:00Z',running_balance:30,retainer_available:5,correlation_id:'request-id',presentation:{description:'Work changed - Form 1040: 1 h x $30.00',actors:['Ada Admin'],debit:'$20.00',credit:'$0.00',balance:'$30.00',retainer:'$5.00',changes:[{event_id:1,operation:'Changed',label:'Form 1040 work on Mar 3, 2026',actor:'Ada Admin',reason:'Fix charge',fields:[{field:'total_transaction',text:'Charge: $10.00 -> $30.00'}],summaries:[]}]},events:[{event_id:1,entity:'customer_transactions',entity_id:8,kind:'Work',action:'update',actor_name:'Ada Admin',actor_user_id:2,source:'PUT /transactions',reason:'Fix charge',debit:20,changes:{total_transaction:{before:10,after:30}}}]}]};
const view=(role='Admin',customer=7)=><context.Provider value={{loggedInUser:{accountID:1,userID:2,accessLevel:role}}}><AuditRecord profileData={{customerData:{customerData:{customer_id:customer}}}} /></context.Provider>;
beforeEach(()=>{jest.clearAllMocks();calls.fetchAuditRecord.mockResolvedValue(history);calls.fetchPrintedRecords.mockResolvedValue({records:[record],total:26});calls.printAuditRecord.mockResolvedValue({record});calls.openAuditRecord.mockResolvedValue();calls.verifyAuditRecord.mockResolvedValue({valid:true});});
it.each(['Admin','Super Admin'])('allows %s and shows deterministic changes, amounts and Phoenix time',async role=>{render(view(role));await screen.findByText('Fix charge',{exact:false});expect(screen.getByText('Charge: $10.00 → $30.00')).toBeInTheDocument();expect(screen.getByText(/SHA-256: 123abc/)).toBeInTheDocument();expect(screen.getAllByText(/Sep 24, 2026/).length).toBeGreaterThan(0);expect(auditTime('2026-09-25T06:00:00Z')).toContain('Sep 24');expect(screen.getByText(/2026-01-01 – 2026-02-01/)).toBeInTheDocument();});
it.each(['User','Manager','Owner',''])('refuses %s before fetching and protects direct navigation',role=>{render(view(role));expect(screen.getByRole('alert')).toHaveTextContent('restricted');expect(calls.fetchAuditRecord).not.toHaveBeenCalled();expect(canAccessAuditRecord({accessLevel:role})).toBe(false);});
it('uses a separate guard allowing Admin without widening AI Audit',()=>{render(<context.Provider value={{loggedInUser:{accessLevel:'Admin'}}}><Guard><div>hard record</div></Guard></context.Provider>);expect(screen.getByText('hard record')).toBeInTheDocument();});
it('filters and paginates history and records independently',async()=>{
 render(view());await screen.findByText(/SHA-256: 123abc/);
 fireEvent.change(screen.getByLabelText('From'),{target:{value:'2026-01-01'}});fireEvent.change(screen.getByLabelText('Through'),{target:{value:'2026-02-01'}});fireEvent.click(screen.getByText('Apply dates'));
 await waitFor(()=>expect(calls.fetchAuditRecord).toHaveBeenLastCalledWith(expect.any(Object),{startDate:'2026-01-01',endDate:'2026-02-01',offset:0,limit:25}));
 await waitFor(()=>expect(screen.getByText('Next history')).not.toBeDisabled());fireEvent.click(screen.getByText('Next history'));
 await waitFor(()=>expect(calls.fetchAuditRecord).toHaveBeenLastCalledWith(expect.any(Object),expect.objectContaining({offset:25})));
 await waitFor(()=>expect(screen.getByText('Next records')).not.toBeDisabled());fireEvent.click(screen.getByText('Next records'));
 await waitFor(()=>expect(calls.fetchPrintedRecords).toHaveBeenLastCalledWith(expect.any(Object),25));
});
it('validates reversed ranges without fetching',async()=>{render(view());await screen.findByText(/SHA-256: 123abc/);const count=calls.fetchAuditRecord.mock.calls.length;fireEvent.change(screen.getByLabelText('From'),{target:{value:'2027-01-01'}});fireEvent.change(screen.getByLabelText('Through'),{target:{value:'2026-01-01'}});fireEvent.click(screen.getByText('Apply dates'));expect(screen.getByRole('alert')).toHaveTextContent('Start date');expect(calls.fetchAuditRecord).toHaveBeenCalledTimes(count);});
it('prints the applied range, reopens its ID and reopens older stored bytes without regeneration',async()=>{
 render(view());await screen.findByText(/SHA-256: 123abc/);fireEvent.click(screen.getByText('Print record'));
 await waitFor(()=>expect(calls.printAuditRecord).toHaveBeenCalledWith({accountID:1,userID:2,customerID:7},{startDate:'',endDate:'',recordType:'client'}));
 await waitFor(()=>expect(calls.openAuditRecord).toHaveBeenCalledWith(expect.any(Object),'saved-id'));
 await waitFor(()=>expect(screen.getByText('Reopen exact PDF')).not.toBeDisabled());fireEvent.click(screen.getByText('Reopen exact PDF'));
 await waitFor(()=>expect(calls.openAuditRecord).toHaveBeenCalledTimes(2));expect(calls.printAuditRecord).toHaveBeenCalledTimes(1);
});
it('verifies and reports integrity failures',async()=>{calls.verifyAuditRecord.mockResolvedValue({valid:false});render(view());await screen.findByText(/SHA-256: 123abc/);fireEvent.click(screen.getByText('Verify'));expect(await screen.findByText('Verification failed')).toBeInTheDocument();});
it('shows load and print failures and allows retry',async()=>{calls.fetchAuditRecord.mockRejectedValueOnce({response:{data:{message:'Audit DB failed'}}});render(view());expect(await screen.findByText('Audit DB failed')).toBeInTheDocument();fireEvent.click(screen.getByText('Apply dates'));await screen.findByText('Saved database records');calls.printAuditRecord.mockRejectedValueOnce(Error('Storage unavailable'));fireEvent.click(screen.getByText('Print record'));expect(await screen.findByText('Storage unavailable')).toBeInTheDocument();expect(calls.openAuditRecord).not.toHaveBeenCalled();});
it('ignores a slower response for a previous customer',async()=>{let finish;calls.fetchAuditRecord.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const result=render(view());result.rerender(view('Admin',8));await screen.findByText('Saved database records');await act(async()=>finish({...history,methodology:'Wrong client'}));expect(screen.queryByText('Wrong client')).not.toBeInTheDocument();});
it('renders empty and reconstructed history honestly',async()=>{calls.fetchAuditRecord.mockResolvedValue({...history,entries:[],total:0});calls.fetchPrintedRecords.mockResolvedValue({records:[],total:0});const result=render(view());expect(await screen.findByText('No history in this date range.')).toBeInTheDocument();expect(screen.getByText('No printed records.')).toBeInTheDocument();result.unmount();calls.fetchAuditRecord.mockResolvedValue({...history,entries:[{...history.entries[0],reconstructed:true}]});render(view());expect(await screen.findByText('Reconstructed from existing records, before audit logging began')).toBeInTheDocument();});

it('offers full evidence printing and shows type without exposing raw fields or payloads',async()=>{
 calls.fetchPrintedRecords.mockResolvedValue({records:[{...record,record_type:'full_evidence'}],total:1});
 render(view());await screen.findByText(/SHA-256: 123abc/);
 expect(screen.getByLabelText('Print option')).toHaveValue('client');
 fireEvent.change(screen.getByLabelText('Print option'),{target:{value:'full_evidence'}});
 fireEvent.click(screen.getByText('Print record'));
 await waitFor(()=>expect(calls.printAuditRecord).toHaveBeenCalledWith(expect.any(Object),{startDate:'',endDate:'',recordType:'full_evidence'}));
 expect(screen.getByRole('table',{name:'Account history'})).not.toHaveTextContent('customer_transactions');
 expect(screen.getByRole('table',{name:'Account history'})).not.toHaveTextContent('request-id');
 expect(screen.getByRole('table',{name:'Printed audit records'})).toHaveTextContent('Full evidence record');
 await waitFor(()=>expect(screen.getByText('Print record')).not.toBeDisabled());
 for(const name of ['Debit','Credit','Balance','Retainer'])expect(screen.getByRole('columnheader',{name,exact:true})).toHaveClass('MuiTableCell-alignRight');
});

it('shows one archive summary with its full change count and plain verification instructions',async()=>{
 const normal=history.entries[0].presentation.changes[0];
 const summary='Invoice INV-2026-00001 finalized (sent and locked): 2 statement items archived - 1 invoice balance, 1 payment. Covers 2 captured changes (change numbers 2-3). Itemized in the full evidence record.';
 const copies=[2,3].map(event_id=>({...normal,event_id,label:'Payment (statement copy)'}));
 calls.fetchAuditRecord.mockResolvedValue({...history,entries:[{...history.entries[0],presentation:{...history.entries[0].presentation,changes:[normal,...copies],client_changes:[normal,{event_id:2,kind:'statement_archive',text:summary,actor:'Ada Admin',change_count:2}]}}]});
 render(view());await screen.findByText('Changes (3)');
 const table=screen.getByRole('table',{name:'Account history'});
 expect(table).toHaveTextContent(summary);expect(table).not.toHaveTextContent('(statement copy)');expect(table).toHaveTextContent('Charge: $10.00 → $30.00');
 expect(screen.getByText(/To confirm a document is authentic and unchanged/)).toHaveTextContent("give the firm its record ID; the firm's system recomputes the SHA-256 digest and checks it against the stored original and the audit chain");
 expect(screen.queryByText(/Retrieve via GET/)).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Print option'),{target:{value:'full_evidence'}});
 expect(table).toHaveTextContent(summary);expect(table).not.toHaveTextContent('(statement copy)');
});
