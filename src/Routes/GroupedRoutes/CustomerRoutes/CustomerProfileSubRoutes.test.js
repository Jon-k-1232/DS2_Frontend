import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerProfileSubRoutes from './CustomerProfileSubRoutes';
import { context } from '../../../App';
import { fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';

jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ fetchCustomerProfileInformation: jest.fn() }));

// Isolate CustomerProfileSubRoutes' own gating/race logic from the real tab
// pages — each just echoes that it rendered, and with what profileData.
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfile', () => props => <div>CustomerProfileHeader:{props.profileData?.customerData?.customerData?.customer_name}</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfileInvoices', () => () => <div>InvoicesTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfileTransactions', () => () => <div>TransactionsTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfileJobs', () => () => <div>JobsTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfilePayments', () => () => <div>PaymentsTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerRetainers', () => () => <div>RetainersTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/CustomerProfileAIAudit', () => () => <div>AiAuditTab</div>);
jest.mock('../../../Pages/Customer/CustomerProfile/EditCustomerProfile', () => () => <div>EditTab</div>);

const loggedInUser = { accountID: 9001, userID: 90013, token: 'session', accessLevel: 'Admin' };

const renderAt = customerId =>
   render(
      <MemoryRouter initialEntries={[`/customers/customersList/customerProfile/${customerId}/customerInvoices`]}>
         <context.Provider value={{ loggedInUser }}>
            <Routes>
               <Route
                  path='/customers/customersList/customerProfile/:customerId/*'
                  element={<CustomerProfileSubRoutes customerData={{}} setCustomerData={() => {}} />}
               />
            </Routes>
         </context.Provider>
      </MemoryRouter>
   );

const successResponse = (customerId, name) => ({
   status: 200,
   customerData: { customerData: { customer_id: customerId, customer_name: name } }
});

describe('CustomerProfileSubRoutes — gates children on a successful load', () => {
   beforeEach(() => jest.clearAllMocks());

   it('shows a loading indicator before the fetch resolves, not an empty/broken tab', async () => {
      let resolveFetch;
      fetchCustomerProfileInformation.mockReturnValue(new Promise(resolve => (resolveFetch = resolve)));

      render(
         <MemoryRouter initialEntries={['/customers/customersList/customerProfile/123/customerInvoices']}>
            <context.Provider value={{ loggedInUser }}>
               <Routes>
                  <Route path='/customers/customersList/customerProfile/:customerId/*' element={<CustomerProfileSubRoutes customerData={{}} setCustomerData={() => {}} />} />
               </Routes>
            </context.Provider>
         </MemoryRouter>
      );

      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      expect(screen.queryByText('InvoicesTab')).not.toBeInTheDocument();

      await act(async () => resolveFetch(successResponse(123, 'Jane Doe')));
   });

   it('shows an Alert and no tab content on a real HTTP 404 (fetch helper\'s {status, message} shape)', async () => {
      fetchCustomerProfileInformation.mockResolvedValue({ status: 404, message: 'Customer not found.' });

      await act(async () => renderAt(999999));

      expect(screen.getByText('Customer not found.')).toBeInTheDocument();
      expect(screen.queryByText('InvoicesTab')).not.toBeInTheDocument();
      expect(screen.queryByText(/CustomerProfileHeader/)).not.toBeInTheDocument();
   });

   it('shows an Alert and no tab content on a body-status 404 (HTTP 200, {status: 404} payload)', async () => {
      fetchCustomerProfileInformation.mockResolvedValue({ status: 404, message: 'Customer not found.', customerData: null });

      await act(async () => renderAt(999999));

      expect(screen.getByText('Customer not found.')).toBeInTheDocument();
      expect(screen.queryByText('InvoicesTab')).not.toBeInTheDocument();
   });

   it('falls back to a default message when the error response carries none', async () => {
      fetchCustomerProfileInformation.mockResolvedValue({ status: 500 });

      await act(async () => renderAt(999999));

      expect(screen.getByText('Customer not found.')).toBeInTheDocument();
   });

   it('renders the tab content on a genuine successful load', async () => {
      fetchCustomerProfileInformation.mockResolvedValue(successResponse(123, 'Jane Doe'));

      await act(async () => renderAt(123));

      expect(screen.getByText('InvoicesTab')).toBeInTheDocument();
      expect(screen.getByText('CustomerProfileHeader:Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('Customer not found.')).not.toBeInTheDocument();
   });

   it('discards an obsolete response: navigating to a second customer before the first resolves only ever shows the second', async () => {
      const requests = [];
      fetchCustomerProfileInformation.mockImplementation((accountID, userID, customerID) => new Promise(resolve => requests.push({ customerID, resolve })));

      render(
         <MemoryRouter initialEntries={['/customers/customersList/customerProfile/1/customerInvoices']}>
            <context.Provider value={{ loggedInUser }}>
               {/* A real in-tree link, so this exercises actual router
                   navigation (a new :customerId param on the SAME mounted
                   CustomerProfileSubRoutes instance) rather than a remount —
                   MemoryRouter's initialEntries is a first-render-only lazy
                   initializer, so swapping it via rerender() wouldn't navigate
                   at all. */}
               <Link to='/customers/customersList/customerProfile/2/customerInvoices'>Go to customer 2</Link>
               <Routes>
                  <Route path='/customers/customersList/customerProfile/:customerId/*' element={<CustomerProfileSubRoutes customerData={{}} setCustomerData={() => {}} />} />
               </Routes>
            </context.Provider>
         </MemoryRouter>
      );

      // Rapid navigation to a second customer profile before #1's request resolves.
      await act(async () => fireEvent.click(screen.getByText('Go to customer 2')));

      expect(requests.map(request => request.customerID)).toEqual([1, 2]);

      // Resolve customer 2 (the current one) first, then the stale customer 1
      // request late — the stale response must never overwrite it.
      await act(async () => requests[1].resolve(successResponse(2, 'Customer Two')));
      expect(screen.getByText('CustomerProfileHeader:Customer Two')).toBeInTheDocument();

      await act(async () => requests[0].resolve(successResponse(1, 'Customer One')));
      expect(screen.getByText('CustomerProfileHeader:Customer Two')).toBeInTheDocument();
      expect(screen.queryByText('CustomerProfileHeader:Customer One')).not.toBeInTheDocument();
   });
});
