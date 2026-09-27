import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {context} from '../../App';
import useExcludedCustomers from './useExcludedCustomers';
import {fetchExclusions} from '../../Services/ApiCalls/AnalyticsCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AnalyticsCalls',()=>({fetchExclusions:jest.fn()}));
function Probe(){const {filter,excludedIds}=useExcludedCustomers();return <>{filter}<output>{JSON.stringify(excludedIds)}</output></>;}
test('keeps help text visible without blocking excluded-customer options',async()=>{
 sessionStorage.clear();fetchExclusions.mockResolvedValue({exclusions:{customers:[{customer_id:1,display_name:'Acme Corp'}],defaultExcludedIds:[]}});
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Probe/></context.Provider>);
 const input=screen.getByRole('combobox',{name:'Filter out (exclude)'});
 fireEvent.mouseOver(input);const tooltip=await screen.findByRole('tooltip');
 expect(tooltip).toHaveTextContent('Customers excluded from every analytics page.');
 expect(window.getComputedStyle(tooltip).pointerEvents).toBe('none');
 fireEvent.change(input,{target:{value:'Acme'}});fireEvent.click(await screen.findByRole('option',{name:/Acme Corp/}));
 await waitFor(()=>expect(sessionStorage.getItem('ds2_analytics_exclude_9001')).toBe('[1]'));
 expect(screen.getByRole('status')).toHaveTextContent('[1]');
});
