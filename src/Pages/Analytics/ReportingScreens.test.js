import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {context} from '../../App';
import ClientRatesPage from './ClientRatesPage';
import TimeAllocationPage from './TimeAllocationPage';
import WipAgingPage from './WipAgingPage';
import JobBudgetsPage from './JobBudgetsPage';
import TaxSeasonCapacityPage from './TaxSeasonCapacityPage';
import * as api from '../../Services/ApiCalls/AnalyticsCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AnalyticsCalls',()=>Object.fromEntries(['fetchClientRates','fetchTimeAllocation','fetchWipAging','fetchJobBudgets','fetchTaxSeasonCapacity','downloadClientRatesCsv','downloadTimeAllocationCsv','downloadYearEndPacket','saveRateAgreement'].map(k=>[k,jest.fn()])));
jest.mock('./useExcludedCustomers',()=>{const value={ready:true,excludedIds:[],filter:null};return()=>value;});
jest.mock('../../Components/BillingEntities/EntityPicker',()=>({value,onChange,allowInactive})=><select aria-label='Billing business' value={value || ''} onChange={e=>onChange(Number(e.target.value)||null)}><option value=''>All businesses</option>{allowInactive && <option value='2'>Inactive advisory business</option>}</select>);
jest.mock('@mui/x-data-grid',()=>({DataGrid:({rows,columns})=><div>{columns.map(c=><span key={c.field}>{c.headerName}</span>)}<div data-testid='rows'>{JSON.stringify(rows)}</div></div>}));
const cases=[
 ['rates',ClientRatesPage,'fetchClientRates',{clientRates:{clients:[],years:[],firm:{years:{}}}},/Rates and margins use issued/],
 ['time',TimeAllocationPage,'fetchTimeAllocation',{timeAllocation:{summary:{entries:0,total_hours:0,billable_hours:0,nonbillable_hours:0,work_entered_value:0,billed_amount:0},byWorkDescription:[],byCustomer:[],monthly:[],trackerByCategory:[]}},/Hours use service dates/],
 ['WIP',WipAgingPage,'fetchWipAging',{wipAging:[]},/WIP is billable work/],
 ['budgets',JobBudgetsPage,'fetchJobBudgets',{jobBudgets:[]},/Budget used means billable work/],
 ['capacity',TaxSeasonCapacityPage,'fetchTaxSeasonCapacity',{taxSeasonCapacity:{current:[{user_id:9,employee:'Former staff',is_active:false,week:3,hours:2}],prior:[]}},/Capacity includes actual service hours/]
];
const mount=Page=>render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Page/></context.Provider>);
beforeEach(()=>{jest.clearAllMocks();for(const [, ,fn,data] of cases)api[fn].mockResolvedValue(data);});
for(const [name,Page,fn,,label] of cases){
 it(`${name} explains its measure and supports all or inactive businesses`,async()=>{mount(Page);expect(screen.getByText(label)).toBeInTheDocument();await waitFor(()=>expect(api[fn]).toHaveBeenCalled());fireEvent.change(screen.getByLabelText('Billing business'),{target:{value:'2'}});await waitFor(()=>expect(api[fn]).toHaveBeenLastCalledWith(9001,90013,expect.objectContaining({entityId:2})));fireEvent.change(screen.getByLabelText('Billing business'),{target:{value:''}});await waitFor(()=>expect(api[fn]).toHaveBeenLastCalledWith(9001,90013,expect.objectContaining({entityId:null})));});
 it(`${name} displays a server refusal instead of old results`,async()=>{api[fn].mockRejectedValueOnce(Error('Business unavailable'));mount(Page);expect(await screen.findByText('Business unavailable')).toBeInTheDocument();});
}
it('capacity retains inactive staff and their hours',async()=>{mount(TaxSeasonCapacityPage);expect(await screen.findByText('Former staff (#9) — inactive')).toBeInTheDocument();});
for(const [name,Page,fn] of cases.filter(([n])=>['WIP','budgets'].includes(n)))it(`${name} supplies service and knowledge cutoffs`,async()=>{mount(Page);await waitFor(()=>expect(api[fn]).toHaveBeenCalled());fireEvent.change(screen.getByLabelText('As of'),{target:{value:'2025-12-31'}});fireEvent.click(screen.getByRole('button',{name:'Advanced: reproduce an earlier report'}));fireEvent.change(screen.getByLabelText('Include records saved through'),{target:{value:'2026-01-31T00:00:00Z'}});await waitFor(()=>expect(api[fn]).toHaveBeenLastCalledWith(9001,90013,expect.objectContaining({asOf:'2025-12-31',recordedThrough:'2026-01-31T00:00:00Z'})));});

for(const [name,Page] of cases.filter(([n])=>['WIP','budgets'].includes(n)))it(`${name} keeps technical cutoff under clear advanced help`,async()=>{mount(Page);expect(screen.getByRole('button',{name:'Advanced: reproduce an earlier report'})).toHaveAttribute('aria-expanded','false');fireEvent.click(screen.getByRole('button',{name:'Advanced: reproduce an earlier report'}));expect(screen.getByLabelText('Include records saved through')).toBeVisible();});
