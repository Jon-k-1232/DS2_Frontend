import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {context} from '../../App';
import ReceivePaymentPage,{allocateOldest} from './ReceivePaymentPage';
import ReceiptsPage from './ReceiptsPage';
import ReceiptDetailPage from './ReceiptDetailPage';
import {receiptCall} from '../../Services/ApiCalls/ReceiptCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/ReceiptCalls',()=>({receiptCall:jest.fn(),receiptError:e=>e.message}));
jest.mock('../../Components/BillingEntities/EntityPicker',()=>({__esModule:true,default:({onChange,value})=><label>Billing business<select value={value || ''} onChange={e=>onChange(Number(e.target.value))}><option value=''>Choose</option><option value='1'>Tax</option><option value='2'>Advisory</option></select></label>}));
const obligations=[300,450,400].map((n,i)=>({obligation_id:String(i+1),invoice_number:`INV-${i+1}`,obligation_date:'2026-01-01',original_invoice_id:i+1,openCents:n*100}));
const data={customersList:{activeCustomerData:{activeCustomers:[{customer_id:7,display_name:'Client One'},{customer_id:8,display_name:'Client Two'}]}}};
const mount=(child,role='admin',path='/')=>render(<MemoryRouter initialEntries={[path]}><context.Provider value={{loggedInUser:{accountID:9001,userID:90013,accessLevel:role}}}>{child}</context.Provider></MemoryRouter>);
const ready=async(amount='1000')=>{mount(<ReceivePaymentPage customerData={data}/>);fireEvent.change(screen.getByLabelText('Client'),{target:{value:'7'}});fireEvent.change(screen.getByLabelText('Billing business'),{target:{value:'1'}});await screen.findByLabelText('Apply to INV-1');fireEvent.change(screen.getByLabelText('Amount received'),{target:{value:amount}});fireEvent.change(screen.getByLabelText('Check / payment reference'),{target:{value:'CHECK-123'}});};
beforeEach(()=>{jest.clearAllMocks();Object.defineProperty(window,'crypto',{configurable:true,value:{randomUUID:()=> '10000000-0000-4000-8000-000000000001'}});receiptCall.mockImplementation(async(path,method)=>method==='post'?{receipt:{receipt_id:9},applied:'1000.00',remainingCredit:'0.00'}:{obligations,ledgerFingerprint:'v1',receipts:[],totalCount:0});});
test('allocates integer cents oldest first and leaves excess out of invoice applications',()=>{expect(allocateOldest(obligations,100000)).toEqual({'1':'300.00','2':'450.00','3':'250.00'});expect(allocateOldest(obligations,150000)).toEqual({'1':'300.00','2':'450.00','3':'400.00'});});
test('reviews one check and blocks double click during an outstanding save',async()=>{
 await ready();let resolve;receiptCall.mockImplementation((path,method)=>method==='post'?new Promise(r=>{resolve=r;}):Promise.resolve({obligations,ledgerFingerprint:'v1'}));
 fireEvent.click(screen.getByRole('button',{name:'Review payment'}));fireEvent.click(screen.getByRole('button',{name:'Record payment'}));fireEvent.click(screen.getByRole('button',{name:'Saving…'}));expect(receiptCall.mock.calls.filter(c=>c[1]==='post')).toHaveLength(1);
 await act(async()=>resolve({receipt:{receipt_id:9},applied:'1000.00',remainingCredit:'0.00'}));expect(await screen.findByRole('link',{name:'View receipt'})).toHaveAttribute('href','/payments/receipts/9');
});
test('shows the $350 remainder when the check exceeds all three invoices',async()=>{await ready('1500');expect(screen.getByText('Remaining credit: $350.00')).toBeVisible();});
for(const [amount,message] of [['0','Allocation lines must be positive'],['-1','Allocation lines must be positive'],['300.001','Allocation lines must be positive'],['1001','Applied total exceeds'],['301','allocation exceeds']])test(`prevents an invalid application ${amount}`,async()=>{await ready(amount==='301'?'1500':'1000');fireEvent.change(screen.getByLabelText('Apply to INV-1'),{target:{value:amount}});expect(screen.getByText(new RegExp(message,'i'))).toBeVisible();expect(screen.getByRole('button',{name:'Review payment'})).toBeDisabled();});
test('preserves entered receipt details after stale failure and explicitly refreshes allocations',async()=>{await ready();receiptCall.mockRejectedValueOnce(new Error('The open invoices changed. Refresh and review.'));fireEvent.click(screen.getByRole('button',{name:'Review payment'}));fireEvent.click(screen.getByRole('button',{name:'Record payment'}));expect(await screen.findByText(/open invoices changed/)).toBeVisible();expect(screen.getByLabelText('Check / payment reference')).toHaveValue('CHECK-123');await waitFor(()=>expect(screen.getByRole('button',{name:'Refresh open invoices'})).toBeVisible());fireEvent.click(screen.getByRole('button',{name:'Refresh open invoices'}));await screen.findByLabelText('Apply to INV-1');expect(screen.getByLabelText('Amount received')).toHaveValue('1000');});
test('requires a reason to deviate from FIFO and discards allocations when changing the client',async()=>{await ready();fireEvent.change(screen.getByLabelText('Apply to INV-1'),{target:{value:''}});expect(screen.getByRole('button',{name:'Review payment'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Allocation reason'),{target:{value:'Client identified the later invoice'}});expect(screen.getByRole('button',{name:'Review payment'})).toBeEnabled();fireEvent.change(screen.getByLabelText('Client'),{target:{value:'8'}});expect(screen.queryByLabelText('Apply to INV-1')).not.toBeInTheDocument();await waitFor(()=>expect(receiptCall).toHaveBeenLastCalledWith('/open-obligations?customerId=8&entityId=1'));});
test('lists receipt history with business and a detail link',async()=>{receiptCall.mockResolvedValue({receipts:[{receipt_id:9,display_name:'Client One',billing_entity_name:'Tax',receipt_date:'2026-09-01',amount:1000,reference:'123'}],totalCount:1});mount(<ReceiptsPage/>);expect(await screen.findByRole('link',{name:'Receipt #9'})).toHaveAttribute('href','/payments/receipts/9');expect(screen.getByText('$1000.00')).toBeVisible();});
for(const role of ['manager','employee','admin','Super Admin'])test(`${role} receipt correction permissions`,async()=>{
 receiptCall.mockImplementation(async path=>path.includes('open-obligations')?{obligations}: {receipt:{receipt_id:9,source_kind:'manual',amount:1000,method:'check',customer_id:7,billing_entity_id:1},applications:[],events:[],ledgerFingerprint:'v'});
 mount(<Routes><Route path='/payments/receipts/:receiptId' element={<ReceiptDetailPage/>}/></Routes>,role,'/payments/receipts/9');await screen.findByText('Receipt history');
 if(['admin','Super Admin'].includes(role)){expect(screen.getByRole('button',{name:'Flag complete receipt as bounced'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Reason for correction'),{target:{value:'Returned by bank'}});expect(screen.getByRole('button',{name:'Flag complete receipt as bounced'})).toBeEnabled();}
 else{expect(screen.getByText(/Only admins can correct applications/)).toBeVisible();expect(screen.queryByRole('button',{name:/bounced/})).not.toBeInTheDocument();}
});

test('receipt detail hides actions until both reads finish and retains no controls after a load failure',async()=>{
 let finish;receiptCall.mockImplementation(path=>path.includes('open-obligations')?new Promise(resolve=>{finish=resolve;}):Promise.resolve({receipt:{receipt_id:9,source_kind:'manual',amount:1000,method:'check',customer_id:7,billing_entity_id:1},applications:[{application_id:2,obligation_id:1,invoice_number:'INV-ONE',direction:1,amount:'10.00'}],events:[],ledgerFingerprint:'v'}));
 mount(<Routes><Route path='/payments/receipts/:receiptId' element={<ReceiptDetailPage/>}/></Routes>,'admin','/payments/receipts/9');
 await waitFor(()=>expect(finish).toBeDefined());expect(screen.queryByRole('button',{name:'Flag complete receipt as bounced'})).not.toBeInTheDocument();
 await act(async()=>finish({obligations}));expect(await screen.findByText(/INV-ONE/,{selector:'p'})).toBeVisible();expect(screen.queryByText(/Obligation #/)).not.toBeInTheDocument();
});


test('carried debt explains the later statement without presenting an internal invoice key as its document number',async()=>{
 receiptCall.mockResolvedValue({obligations:[{...obligations[0],carrying_invoice_id:99999}],ledgerFingerprint:'v1'});await ready('300');
 expect(screen.getByText('Later statement')).toBeVisible();expect(screen.queryByText('Statement #99999')).not.toBeInTheDocument();expect(screen.getByText('INV-1')).toBeVisible();
});
