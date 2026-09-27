import {act,render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import ReceiptsPage from './ReceiptsPage';
import {receiptCall} from '../../Services/ApiCalls/ReceiptCalls';
jest.mock('../../Services/ApiCalls/ReceiptCalls',()=>({receiptCall:jest.fn(),receiptError:e=>e.message}));
jest.mock('../../Components/BillingEntities/EntityPicker',()=>({onChange})=><button onClick={()=>onChange(2)}>Business 2</button>);
const mount=()=>render(<MemoryRouter><ReceiptsPage/></MemoryRouter>);
beforeEach(()=>jest.clearAllMocks());
test('loading, empty state and legacy application entry remain distinct',async()=>{
 let finish;receiptCall.mockReturnValue(new Promise(resolve=>finish=resolve));mount();expect(screen.getByRole('status')).toHaveTextContent('Loading receipts');await act(async()=>finish({receipts:[],totalCount:0}));expect(screen.getByRole('alert')).toHaveTextContent('No receipts match');expect(screen.getByRole('link',{name:'Legacy payments & applications'})).toHaveAttribute('href','/payments/receipts/legacy');
});
test('failure is retryable and late business results cannot replace the current list',async()=>{
 let finish;receiptCall.mockRejectedValueOnce(new Error('Offline')).mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue({receipts:[{receipt_id:2,customer_id:7,display_name:'Client Two',amount:20,receipt_date:'2026-09-01'}],totalCount:1});mount();expect(await screen.findByRole('alert')).toHaveTextContent('Offline');fireEvent.click(screen.getByRole('button',{name:'Try again'}));fireEvent.click(screen.getByRole('button',{name:'Business 2'}));await screen.findByRole('link',{name:'Receipt #2'});await act(async()=>finish({receipts:[],totalCount:0}));expect(screen.getByRole('link',{name:'Client Two'})).toHaveAttribute('href','/clients/7/receipts');expect(screen.queryByText(/No receipts match/)).not.toBeInTheDocument();
});
