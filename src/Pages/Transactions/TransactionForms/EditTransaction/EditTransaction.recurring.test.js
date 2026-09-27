import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import EditTransaction from './EditTransaction';
import {putEditTransaction} from '../../../../Services/ApiCalls/PutCalls';
jest.mock('axios',()=>({get:jest.fn(),post:jest.fn(),put:jest.fn()}));
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Services/ApiCalls/PutCalls',()=>({putEditTransaction:jest.fn()}));
test('a recurring charge uses its period controls even while customer lookups are loading',()=>{
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><EditTransaction customerData={{}} transactionData={{transaction_id:42,customer_id:17,recurring_plan_id:9}} /></context.Provider></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Open recurring plan'})).toHaveAttribute('href','/billing/recurring/9');
 expect(screen.queryByRole('button',{name:'Submit',exact:true})).not.toBeInTheDocument();
 expect(putEditTransaction).not.toHaveBeenCalled();
});
