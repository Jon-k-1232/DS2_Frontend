import {render,screen} from '@testing-library/react';
import AccountsReceivablePage from './AccountsReceivablePage';
import {context} from '../../App';
import {fetchARAging} from '../../Services/ApiCalls/AccountsReceivableCalls';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Services/ApiCalls/AccountsReceivableCalls',()=>({fetchARAging:jest.fn(),downloadARAgingCsv:jest.fn()}));
it('shows a signed credit and no payment due, including its statement-age bucket',async()=>{
 fetchARAging.mockResolvedValue({status:200,arAging:{customers:[{customer_id:2,display_name:'Credit client',total_outstanding:-25,bucket_0_30:-25,bucket_31_60:0,bucket_61_90:0,bucket_over_90:0,oldest_days:0}],pagination:{totalPages:1,totalItems:1}}});
 render(<context.Provider value={{loggedInUser:{accountID:1,userID:1,token:'test'}}}><AccountsReceivablePage/></context.Provider>);
 expect(await screen.findByText('Credit — no payment due')).toBeInTheDocument();expect(screen.getAllByText('$-25.00').length).toBeGreaterThanOrEqual(2);expect(screen.getByText('Balance / credit')).toBeInTheDocument();
});
