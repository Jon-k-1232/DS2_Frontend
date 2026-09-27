import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {context} from '../../App';
import {entitiesCall} from '../../Services/ApiCalls/BillingEntitiesCalls';
import BillingEntitiesPage from './BillingEntitiesPage';
import EntityReviewPage from './EntityReviewPage';
import CreditTransferPage from './CreditTransferPage';
import CutoverPage from './CutoverPage';
import EntityPicker,{sameEntity,filterEntityGrid} from '../../Components/BillingEntities/EntityPicker';
import ReclassifyWork from '../../Components/BillingEntities/ReclassifyWork';
jest.mock('../../Services/ApiCalls/ReceiptCalls',()=>({creditCall:jest.fn().mockResolvedValue({transfers:[],credits:[]}),receiptError:e=>e.message}));
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/FetchCalls',()=>({fetchCustomerProfileInformation:jest.fn().mockResolvedValue({})}));
const entities=[{billing_entity_id:1,name:'Tax',legal_name:'Tax LLC',active:true,is_default:true,invoice_prefix:'TAX',version:1},{billing_entity_id:2,name:'Advisory',legal_name:'Advisory LLC',active:true,is_default:false,invoice_prefix:'ADV'},{billing_entity_id:3,name:'Closed',active:false}];
const mount=(child,role='admin',path='/')=>render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,accessLevel:role}}}><MemoryRouter initialEntries={[path]}>{child}</MemoryRouter></context.Provider>);
beforeEach(()=>{require('../../Services/ApiCalls/ReceiptCalls').creditCall.mockResolvedValue({transfers:[],credits:[]});sessionStorage.clear();entitiesCall.mockImplementation(async path=>path==='/transfers'?{transfers:[]}:{entities});});
test('picker honors current-customer memory, exposes the choice and omits inactive businesses',async()=>{
 sessionStorage.setItem('ds2.business.9001.42','2');const change=jest.fn();mount(<EntityPicker customerId={42} onChange={change}/>);
 await waitFor(()=>expect(change).toHaveBeenCalledWith(2));expect(screen.queryByRole('option',{name:'Closed'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText(/Billing business/),{target:{value:'1'}});expect(sessionStorage.getItem('ds2.business.9001.42')).toBe('1');expect(sameEntity({billing_entity_id:2},1)).toBe(false);
});
test('all-business picker does not silently choose a default and frozen records cannot switch',async()=>{
 const change=jest.fn();mount(<EntityPicker value={3} all disabled onChange={change}/>);expect(await screen.findByRole('option',{name:'Closed (inactive)'})).toBeDisabled();expect(screen.getByLabelText(/Billing business/)).toBeDisabled();expect(change).not.toHaveBeenCalled();
});
test('grid filtering keeps shared job roots and narrows children',()=>{expect(filterEntityGrid({rows:[{id:1,billing_entity_id:null,children:[{id:2,billing_entity_id:2},{id:3,billing_entity_id:1}]},{id:4,billing_entity_id:2}]},1).rows).toEqual([{id:1,billing_entity_id:null,children:[{id:3,billing_entity_id:1}]}]);});
for(const role of ['manager','employee'])test(`${role} sees the permission explanation and no adjustment action`,async()=>{
 mount(<><BillingEntitiesPage/><EntityReviewPage/><CreditTransferPage/><CutoverPage/><ReclassifyWork transactionId={1}/></>,role);
 expect(await screen.findByText('No credit transfers.')).toBeVisible();expect(screen.queryByRole('button',{name:'Transfer credit'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Add business'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Reassign billing business'})).not.toBeInTheDocument();expect(entitiesCall).not.toHaveBeenCalledWith('/cutover');
});
for(const role of ['admin','Super Admin'])test(`${role} can open business administration and its related screens`,async()=>{mount(<BillingEntitiesPage/>,role);expect(await screen.findByRole('link',{name:'Edit Tax'})).toBeVisible();expect(screen.getByRole('link',{name:'Add business'})).toBeVisible();expect(screen.getByRole('link',{name:'Opening balances'})).toBeVisible();});
test('stale setting failure stays visible and a rapid double click sends one save',async()=>{
 let reject;entitiesCall.mockImplementation(async(path,method)=>method==='patch'?new Promise((_,r)=>{reject=r;}):path==='/1'?{entity:entities[0],aliases:[]}:{entities});
 mount(<Routes><Route path='/settings/entities/:entityId' element={<BillingEntitiesPage/>}/></Routes>,'admin','/settings/entities/1');
 await screen.findByDisplayValue('Tax LLC');fireEvent.change(screen.getByLabelText(/Reason for change/),{target:{value:'Updated phone'}});fireEvent.click(screen.getByRole('button',{name:'Save business'}));fireEvent.click(screen.getByRole('button',{name:/Saving/}));
 expect(entitiesCall.mock.calls.filter(c=>c[1]==='patch')).toHaveLength(1);reject(new Error('This business changed. Reload before saving.'));expect(await screen.findByText(/This business changed/)).toBeVisible();
});
test('a delayed business-list response preserves the new business draft and reason',async()=>{
 let finish;entitiesCall.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 mount(<Routes><Route path='/settings/entities/:entityId' element={<BillingEntitiesPage/>}/></Routes>,'admin','/settings/entities/new');
 fireEvent.change(screen.getByLabelText(/Business name/),{target:{value:'New Advisory'}});
 fireEvent.change(screen.getByLabelText(/Legal name/),{target:{value:'New Advisory LLC'}});
 fireEvent.change(screen.getByLabelText(/Invoice prefix/),{target:{value:'ADVISORY'}});
 fireEvent.change(screen.getByLabelText(/Reason for change/),{target:{value:'Separate advisory work'}});
 await act(async()=>finish({entities}));
 expect(screen.getByLabelText(/Business name/)).toHaveValue('New Advisory');
 expect(screen.getByLabelText(/Legal name/)).toHaveValue('New Advisory LLC');
 expect(screen.getByLabelText(/Invoice prefix/)).toHaveValue('ADVISORY');
 expect(screen.getByLabelText(/Reason for change/)).toHaveValue('Separate advisory work');
});
test('review requires a deliberate business and reason, preserves stale failure, and pages',async()=>{
 entitiesCall.mockImplementation(async(path,method)=>method==='post'?Promise.reject(new Error('This entry changed. Reload.')):path?.startsWith('/review?')?{reviews:[{review_id:7,raw_entity:'Advisry typo',sourceHash:'h',source:{notes:'Unknown tracker work'}}],totalCount:26}:{entities});
 mount(<EntityReviewPage/>);expect(await screen.findByText('Advisry typo')).toBeVisible();await screen.findByRole('option',{name:'Advisory'});expect(screen.getByRole('button',{name:'Save assignment'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Assign billing business'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('Reason for assignment'),{target:{value:'Verified advisory'}});fireEvent.click(screen.getByRole('button',{name:'Save assignment'}));expect(await screen.findByText(/This entry changed/)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Next'}));await waitFor(()=>expect(entitiesCall).toHaveBeenCalledWith('/review?limit=25&offset=25'));
});
test('cutover cannot submit slices that change the signed source total',async()=>{
 entitiesCall.mockResolvedValue({positions:[{position_id:4,billing_entity_id:1,opening_amount:90,display_name:'Client',source_sha256:'h'}],entities,total:90});mount(<CutoverPage/>);fireEvent.click(await screen.findByRole('checkbox'));fireEvent.change(screen.getByLabelText('Reason for opening allocation'),{target:{value:'Reviewed allocation'}});expect(screen.getByRole('button',{name:'Apply reviewed opening balances'})).toBeEnabled();fireEvent.change(screen.getByLabelText('Opening share'),{target:{value:'89'}});expect(screen.getByRole('button',{name:'Apply reviewed opening balances'})).toBeDisabled();expect(entitiesCall.mock.calls.filter(c=>c[1]==='post')).toHaveLength(0);
});

test('empty assignment review does not claim to show rows one through zero',async()=>{
 entitiesCall.mockResolvedValue({reviews:[],totalCount:0});mount(<EntityReviewPage/>);
 await screen.findByText('No business assignments need review.');expect(screen.queryByText(/Showing 1–0/)).not.toBeInTheDocument();
});
test('assignment review shows the available client name rather than its raw key',async()=>{
 entitiesCall.mockImplementation(async path=>path?.startsWith('/review?')?{reviews:[{review_id:7,customer_id:1234,raw_entity:'Unmatched business',source:{company_name:'Named client'}}],totalCount:1}:{entities});mount(<EntityReviewPage/>);
 expect(await screen.findByText(/Client Named client/)).toBeVisible();expect(screen.queryByText(/Client 1234/)).not.toBeInTheDocument();
});
