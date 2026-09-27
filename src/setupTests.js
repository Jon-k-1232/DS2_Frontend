// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
if (!window.crypto) Object.defineProperty(window, 'crypto', { configurable: true, value: {} });
if (!window.crypto.randomUUID) Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: () => 'a2eb6f85-4909-4c06-b817-c6fbb527fc42' });
// Existing screen tests have no recurring fixtures. H4 suites override this
// boundary to verify preparation, failures, periods and charge changes.
jest.mock('./Services/ApiCalls/RecurringCalls', () => ({ ...jest.requireActual('./Services/ApiCalls/RecurringValues'), recurringCall: jest.fn() }));
beforeEach(() => require('./Services/ApiCalls/RecurringCalls').recurringCall.mockResolvedValue({ status: 200, plans: [], generated: 0, remaining: 0, catchUpRequired: false }));

if (typeof window.matchMedia !== 'function') {
   Object.defineProperty(window, 'matchMedia', {
      writable: true,
      // Keep the browser shim across Jest's automatic mock resets.
      value: query => ({
         matches: false,
         media: query,
         onchange: null,
         addListener: jest.fn(),
         removeListener: jest.fn(),
         addEventListener: jest.fn(),
         removeEventListener: jest.fn(),
         dispatchEvent: jest.fn()
      })
   });
}

// Unit-test boundary for company lookup. Individual business tests replace this
// response to exercise selection, permission and failure behavior explicitly.
jest.mock('./Services/ApiCalls/BillingEntitiesCalls',()=>({
 entitiesCall:jest.fn(),entityError:e=>e.response?.data?.message || e.message || 'Unable to load businesses.'
}));
beforeEach(()=>{require('./Services/ApiCalls/BillingEntitiesCalls').entitiesCall.mockResolvedValue({entities:[{billing_entity_id:900101,name:'Fixture Tax',legal_name:'Fixture Tax',invoice_prefix:'INV',active:true,is_default:true}]});});
