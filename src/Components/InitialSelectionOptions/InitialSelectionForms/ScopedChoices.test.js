import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {context} from '../../../App';
import useJobChoices from '../../Lookups/useJobChoices';
import {fetchCustomerProfileInformation} from '../../../Services/ApiCalls/FetchCalls';
import JobChoices from './JobDropWithCurrentCycleJobAmount';
import InvoiceChoices from './InvoiceDropWithInvoiceAmounts';
jest.mock('../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Lookups/useJobChoices',()=>jest.fn());
jest.mock('../../../Services/ApiCalls/FetchCalls',()=>({fetchCustomerProfileInformation:jest.fn()}));
const initial={selectedCustomer:{customer_id:7},entityId:9,selectedInvoice:{customer_invoice_id:12,invoice_number:'KEPT'},selectedJob:null,note:'Keep edits'};
const wrapper=({children})=><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}>{children}</context.Provider>;
function Jobs(){const [selectedItems,setSelectedItems]=useState(initial);return <><JobChoices selectedItems={selectedItems} setSelectedItems={setSelectedItems} dropDownPlaceholderText='Cycle job'/><output>{JSON.stringify(selectedItems)}</output></>;}
beforeEach(()=>{jest.clearAllMocks();useJobChoices.mockReturnValue({rows:[],loading:false,error:''});});
test('current-cycle jobs request business-scoped type-ahead, display their amount and atomically clear the invoice only on selection',async()=>{
 useJobChoices.mockReturnValue({rows:[{customer_job_id:3,job_description:'Tax',total_transaction:'40.00'},{customer_job_id:4,job_description:'Tax',total_transaction:'0.00'}],loading:false,error:''});
 render(<Jobs/>,{wrapper});expect(useJobChoices).toHaveBeenLastCalledWith(7,9,'',0,undefined,true);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Tax'}});expect(useJobChoices).toHaveBeenLastCalledWith(7,9,'Tax',0,undefined,true);
 fireEvent.click(await screen.findByRole('option',{name:/Tax \(#3\).*Current Cycle:\$40.00/}));
 expect(screen.getByRole('combobox')).toHaveValue('Tax Current Cycle:$40.00');expect(screen.getByRole('status')).toHaveTextContent('"selectedInvoice":null');expect(screen.getByRole('status')).toHaveTextContent('Keep edits');
});
test('current-cycle read errors are visible',()=>{useJobChoices.mockReturnValue({rows:[],loading:false,error:'Retry job search'});render(<Jobs/>,{wrapper});expect(screen.getByText('Retry job search')).toBeVisible();});
const invoice=(id,number)=>({customer_invoice_id:id,invoice_number:number,invoice_date:'2026-09-26',created_at:'2026-09-26T12:00:00Z',remaining_balance_on_invoice:'20.00'});
function Invoices({clientId=7,entityId=9}){const [items,setItems]=useState({...initial,selectedInvoice:null,selectedJob:{customer_job_id:3}});return <><InvoiceChoices selectedItems={{...items,selectedCustomer:{customer_id:clientId},entityId}} setSelectedItems={setItems} dropDownPlaceholderText='Prior invoice'/><output>{JSON.stringify(items)}</output></>;}
test('invoice choices fetch only snapshots and preserve other input when the chosen invoice clears the job',async()=>{
 fetchCustomerProfileInformation.mockResolvedValue({status:200,customerInvoiceData:{customerInvoices:[invoice(8,'CURRENT')]}});
 render(<Invoices/>,{wrapper});await waitFor(()=>expect(fetchCustomerProfileInformation).toHaveBeenCalledWith(9001,90013,7,undefined,9,'invoices'));
 fireEvent.mouseDown(screen.getByRole('combobox'));fireEvent.click(await screen.findByRole('option',{name:/CURRENT/}));
 expect(screen.getByRole('status')).toHaveTextContent('"selectedJob":null');expect(screen.getByRole('status')).toHaveTextContent('Keep edits');
});
test('switching business discards late invoice choices from the previous business',async()=>{
 let finish;fetchCustomerProfileInformation.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue({status:200,customerInvoiceData:{customerInvoices:[invoice(9,'RIGHT')]}});
 const view=render(<Invoices/>,{wrapper});await waitFor(()=>expect(fetchCustomerProfileInformation).toHaveBeenCalledTimes(1));view.rerender(<Invoices entityId={10}/>);
 fireEvent.mouseDown(screen.getByRole('combobox'));expect(await screen.findByRole('option',{name:/RIGHT/})).toBeVisible();
 await act(async()=>finish({status:200,customerInvoiceData:{customerInvoices:[invoice(10,'WRONG')]}}));expect(screen.queryByRole('option',{name:/WRONG/})).not.toBeInTheDocument();
});
test('invoice failures explain the problem and leave entered values alone',async()=>{
 fetchCustomerProfileInformation.mockResolvedValue({status:500,message:'Invoice lookup unavailable'});render(<Invoices/>,{wrapper});expect(await screen.findByText('Invoice lookup unavailable')).toBeVisible();expect(screen.getByRole('status')).toHaveTextContent('Keep edits');
});

test('a new client or business clears both the visible job text and the old server search',()=>{
 const props={setSelectedItems:jest.fn(),dropDownPlaceholderText:'Cycle job'};
 const view=render(<JobChoices {...props} selectedItems={{...initial,selectedInvoice:null}}/>,{wrapper});
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Old search'}});expect(useJobChoices).toHaveBeenLastCalledWith(7,9,'Old search',0,undefined,true);
 view.rerender(<JobChoices {...props} selectedItems={{...initial,selectedCustomer:{customer_id:8},selectedInvoice:null}}/>);
 expect(screen.getByRole('combobox')).toHaveValue('');expect(useJobChoices).toHaveBeenLastCalledWith(8,9,'',0,undefined,true);
 view.rerender(<JobChoices {...props} selectedItems={{...initial,selectedInvoice:null}}/>);
 expect(screen.getByRole('combobox')).toHaveValue('');expect(useJobChoices).toHaveBeenLastCalledWith(7,9,'',0,undefined,true);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Different search'}});
 view.rerender(<JobChoices {...props} selectedItems={{...initial,selectedCustomer:{customer_id:8},entityId:10,selectedInvoice:null}}/>);
 expect(screen.getByRole('combobox')).toHaveValue('');expect(useJobChoices).toHaveBeenLastCalledWith(8,10,'',0,undefined,true);
});
