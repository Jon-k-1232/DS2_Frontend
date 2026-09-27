import {render,screen} from '@testing-library/react';
import {context} from '../../../../App';
import NeedsReviewTab from './NeedsReviewTab';
import {fetchPendingHeldEntries,fetchReprocessCount,fetchDistinctEntities} from '../../../../Services/ApiCalls/BillingReviewCalls';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/BillingReviewCalls',()=>({fetchPendingHeldEntries:jest.fn(),fetchReprocessCount:jest.fn(),fetchDistinctEntities:jest.fn()}));
jest.mock('../components/ReviewBillingDialog',()=>()=>null);
jest.mock('../../../../Components/Lookups/CustomerPicker',()=>()=>null);
test('unavailable automated matching explains the next action without server configuration instructions',async()=>{
 fetchPendingHeldEntries.mockResolvedValue({entries:[],total:0});fetchReprocessCount.mockResolvedValue({count:0,eligible:false});fetchDistinctEntities.mockResolvedValue([]);
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><NeedsReviewTab customerData={{}}/></context.Provider>);
 expect(await screen.findByText('Automated matching is unavailable for this account. Review held entries manually or ask an administrator for help.')).toBeVisible();
 expect(screen.queryByText(/TIME_TRACKER_AI/)).not.toBeInTheDocument();
});
