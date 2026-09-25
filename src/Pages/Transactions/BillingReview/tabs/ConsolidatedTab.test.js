import { render, screen } from '@testing-library/react';
import { context } from '../../../../App';
import ConsolidatedTab from './ConsolidatedTab';
import { fetchConsolidatedTransactions, fetchDistinctEntities, fetchEarliestUnbilledMonth } from '../../../../Services/ApiCalls/BillingReviewCalls';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/BillingReviewCalls',()=>({fetchConsolidatedTransactions:jest.fn(),fetchDistinctEntities:jest.fn(),fetchEarliestUnbilledMonth:jest.fn(),updateFinalizedTransaction:jest.fn()}));
jest.mock('../../../Jobs/JobForms/AddJob/NewJob',()=>()=>null);
it('identifies a sent transaction and disables inline editing',async()=>{
 fetchDistinctEntities.mockResolvedValue([]);fetchEarliestUnbilledMonth.mockResolvedValue('2026-09-01');
 fetchConsolidatedTransactions.mockResolvedValue({transactions:[{transaction_id:10,customer_id:1,customer_name:'Synthetic customer',transaction_date:'2026-09-25',quantity:1,unit_cost:100,total_transaction:100,sent_locked:true,locked_invoice_number:'INV-10'}],totalCount:1,totalSum:100});
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013,token:'local'}}}><ConsolidatedTab period='month' customerData={{}} setCustomerData={()=>{}} /></context.Provider>);
 expect(await screen.findByText('Sent — locked · INV-10')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Edit'})).toBeDisabled();
});
