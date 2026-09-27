import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Customers from './CustomerGrid';
import { context } from '../../../App';
import { fetchCustomers } from '../../../Services/ApiCalls/FetchCalls';
jest.mock('../../../App', () => ({context:require('react').createContext({})}));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({fetchCustomers:jest.fn()}));
jest.mock('../CustomerForms/AddCustomer/NewCustomer', () => () => null);
jest.mock('../../../Components/DataGrids/PaginationGrid', () => props => <div>{props.renderToolbarContent()}</div>);
it('keeps focus and entered text in an open form when a delayed customer page arrives', async () => {
 const pending=[];fetchCustomers.mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,token:'synthetic'}}}><Customers customerData={{}} setCustomerData={()=>{}} /><div role='dialog'><input aria-label='First name' /></div></context.Provider>);
 const first=screen.getByLabelText('First name');first.focus();fireEvent.change(first,{target:{value:'Mary Ann'}});
 await act(async()=>{for(const resolve of pending)resolve({customersList:{activeCustomerData:{grid:{rows:[],columns:[]},pagination:{totalItems:0}}}});});
 expect(first).toHaveFocus();expect(first).toHaveValue('Mary Ann');expect(screen.getByPlaceholderText('Search customers')).toHaveValue('');
});

it('a delayed customer page respects an already focused header action',async()=>{
 const pending=[];fetchCustomers.mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,token:'synthetic'}}}><Customers customerData={{}} setCustomerData={()=>{}}/><button>About this page</button></context.Provider>);
 const help=screen.getByRole('button',{name:'About this page'});help.focus();
 await act(async()=>{for(const resolve of pending)resolve({customersList:{activeCustomerData:{grid:{rows:[],columns:[]},pagination:{totalItems:0}}}});});
 expect(help).toHaveFocus();
});
