import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import dayjs from 'dayjs';
import {DataGrid} from '@mui/x-data-grid';
import {context} from '../../../App';
import ThemeConfig from '../../../Theme';
import PendingPaymentsPage from './PendingPaymentsPage';
import NewPaymentsTab from './tabs/NewPaymentsTab';
import ProcessedPaymentsTab from './tabs/ProcessedPaymentsTab';
import AllPaymentsTab from './tabs/AllPaymentsTab';
import {fetchPendingPayments, fetchPendingPaymentCounts} from '../../../Services/ApiCalls/PendingPaymentsCalls';

jest.mock('../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../Services/ApiCalls/PendingPaymentsCalls',()=>({fetchPendingPayments:jest.fn(),fetchPendingPaymentCounts:jest.fn(),softDeletePendingPayment:jest.fn()}));
jest.mock('./components/ReviewPaymentDialog',()=>()=>null);
jest.mock('./components/PaymentPdfPreview',()=>()=>null);
jest.mock('./tabs/UploadTab',()=>()=>null);

const empty={status:200,payments:[],pagination:{totalItems:0}};
const cases=[
 ['new',NewPaymentsTab,'No new payments to review. Use Upload to add a payment file.'],
 ['processed',ProcessedPaymentsTab,'No processed payments for this month. Choose another month to see earlier payments.'],
 ['all',AllPaymentsTab,'No imported payments. Use Upload to add a payment file.']
];
const mount=Component=>render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,token:'local'}}}><Component customerData={{}} setCustomerData={jest.fn()} onCountsChanged={jest.fn()}/></context.Provider>);
beforeEach(()=>{jest.clearAllMocks();fetchPendingPayments.mockReset().mockResolvedValue(empty);fetchPendingPaymentCounts.mockResolvedValue({counts:{newPayments:0,all:0}});jest.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());

test.each(cases)('%s import list explains an empty result and uses business labels',async(status,Component,message)=>{
 mount(Component);
 expect(await screen.findByText(message)).toBeVisible();
 expect(screen.getByRole('columnheader',{name:'Name on payment'})).toBeVisible();
 expect(screen.getByRole('columnheader',{name:'Matched client'})).toBeVisible();
 expect(fetchPendingPayments).toHaveBeenCalledWith(9001,90013,'local',expect.objectContaining({status}));
});
test.each(cases)('%s import read failure is not an empty list and reload recovers',async(status,Component,message)=>{
 fetchPendingPayments.mockRejectedValueOnce(new Error('Read failed')).mockResolvedValueOnce(empty);
 mount(Component);
 expect(await screen.findByRole('alert')).toHaveTextContent('Payments could not be loaded. Reload the list to try again.');
 expect(screen.queryByText(message)).not.toBeInTheDocument();
 expect(screen.queryByRole('grid')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Reload payments'}));
 expect(await screen.findByText(message)).toBeVisible();
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 expect(fetchPendingPayments).toHaveBeenCalledTimes(2);
});
test('an older processed-month response cannot replace the newly selected month',async()=>{
 let finishOld;
 fetchPendingPayments.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;})).mockResolvedValueOnce({payments:[{payment_id:2,customer_name:'Latest payer'}],pagination:{totalItems:1}});
 mount(ProcessedPaymentsTab);
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Month'}));
 fireEvent.click(await screen.findByRole('option',{name:dayjs().subtract(1,'month').format('MMMM YYYY')}));
 expect(await screen.findByText('Latest payer')).toBeVisible();
 await act(async()=>finishOld({payments:[{payment_id:1,customer_name:'Older payer'}],pagination:{totalItems:1}}));
 expect(screen.queryByText('Older payer')).not.toBeInTheDocument();
 expect(screen.getByText('Latest payer')).toBeVisible();
});
test('loading page two preserves the selected page instead of resetting to page one',async()=>{
 const first={payments:Array.from({length:20},(_,i)=>({payment_id:i+1,customer_name:'First payer '+i})),pagination:{totalItems:21}};
 let finishSecond;
 fetchPendingPayments.mockResolvedValue(first).mockResolvedValueOnce(first).mockImplementationOnce(()=>new Promise(resolve=>{finishSecond=resolve;}));
 mount(AllPaymentsTab);expect(await screen.findByText('First payer 0')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Go to next page'}));
 await waitFor(()=>expect(fetchPendingPayments).toHaveBeenCalledTimes(2));
 await act(async()=>finishSecond({payments:[{payment_id:21,customer_name:'Second page payer'}],pagination:{totalItems:21}}));
 expect(await screen.findByText('Second page payer')).toBeVisible();
 expect(screen.queryByText('First payer 0')).not.toBeInTheDocument();
 expect(fetchPendingPayments).toHaveBeenLastCalledWith(9001,90013,'local',expect.objectContaining({page:2}));
});
test('import tabs use sentence case',async()=>{
 mount(PendingPaymentsPage);
 expect(await screen.findByRole('tab',{name:'New payments'})).toBeVisible();
 expect(screen.getByRole('tab',{name:'All payments'})).toBeVisible();
});
test('other empty grids explain that the current selection has no records',async()=>{
 render(<ThemeConfig><DataGrid autoHeight rows={[]} columns={[{field:'name',headerName:'Name'}]}/></ThemeConfig>);
 expect(await screen.findByText('No records to show for this selection.')).toBeVisible();
});
