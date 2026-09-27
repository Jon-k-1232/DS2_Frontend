import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {context} from '../../App';
import useExcludedCustomers from './useExcludedCustomers';
import {fetchExclusions} from '../../Services/ApiCalls/AnalyticsCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AnalyticsCalls',()=>({fetchExclusions:jest.fn()}));
jest.mock('@mui/material',()=>({Tooltip:({children})=>children,TextField:()=>null,Checkbox:()=>null,Autocomplete:({options,onChange})=><button onClick={()=>onChange(null,options.slice(0,1))}>Exclude first client</button>}));
function Probe(){const {ready,excludedIds,filter}=useExcludedCustomers();return <>{filter}<div data-testid='state'>{JSON.stringify({ready,excludedIds})}</div></>;}
const view=id=><context.Provider value={{loggedInUser:{accountID:id,userID:90013}}}><Probe/></context.Provider>;
const state=()=>JSON.parse(screen.getByTestId('state').textContent);
const response=(id,defaults=[])=>({exclusions:{customers:[{customer_id:id,display_name:'Client'}],defaultExcludedIds:defaults}});
beforeEach(()=>{sessionStorage.clear();jest.clearAllMocks();fetchExclusions.mockResolvedValue(response(1,[1]));});
it('ignores unscoped and other-account exclusions and saves only under this account',async()=>{sessionStorage.setItem('ds2_analytics_exclude','[77]');sessionStorage.setItem('ds2_analytics_exclude_700','[88]');render(view(9001));await waitFor(()=>expect(state()).toEqual({ready:true,excludedIds:[1]}));fireEvent.click(screen.getByText('Exclude first client'));expect(sessionStorage.getItem('ds2_analytics_exclude_9001')).toBe('[1]');expect(sessionStorage.getItem('ds2_analytics_exclude_700')).toBe('[88]');});
it('retains an explicit empty selection on reload',async()=>{sessionStorage.setItem('ds2_analytics_exclude_9001','[]');render(view(9001));await waitFor(()=>expect(state()).toEqual({ready:true,excludedIds:[]}));});
it('blocks reports during an account switch and restores that account alone',async()=>{const mounted=render(view(9001));await waitFor(()=>expect(state().ready).toBe(true));let done;fetchExclusions.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;}));sessionStorage.setItem('ds2_analytics_exclude_700','[2]');mounted.rerender(view(700));expect(state()).toEqual({ready:false,excludedIds:[]});await act(async()=>done(response(2)));expect(state()).toEqual({ready:true,excludedIds:[2]});});
it('ignores a late failure from the former account',async()=>{let fail;fetchExclusions.mockImplementationOnce(()=>new Promise((resolve,reject)=>{fail=reject;}));const mounted=render(view(9001));fetchExclusions.mockResolvedValueOnce(response(2,[2]));mounted.rerender(view(700));await waitFor(()=>expect(state()).toEqual({ready:true,excludedIds:[2]}));await act(async()=>fail(Error('Old request')));expect(state()).toEqual({ready:true,excludedIds:[2]});});
