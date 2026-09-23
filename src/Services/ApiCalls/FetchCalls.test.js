jest.mock('axios', () => ({}));
import axios from 'axios';
import { fetchCustomerProfileInformation } from './FetchCalls';

// E6 — a real HTTP 404 (unknown/deleted customer) must preserve status and
// message, not collapse to [] (an empty array can't be told apart from "still
// loading" by any consumer, which is exactly what let the invoices/
// transactions/jobs tabs spin on "Loading..." forever for a customer that
// simply doesn't exist).
describe('fetchCustomerProfileInformation', () => {
   afterEach(() => jest.restoreAllMocks());

   it('preserves status and message from a real HTTP 404 instead of returning []', async () => {
      axios.get = jest.fn().mockRejectedValue({ response: { status: 404, data: { status: 404, message: 'Customer not found.' } } });
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});

      let result;
      try {
         result = await fetchCustomerProfileInformation(9001, 90013, 999999, 'session');
      } finally {
         silence.mockRestore();
      }

      expect(result).toEqual({ status: 404, message: 'Customer not found.' });
      expect(Array.isArray(result)).toBe(false);
   });

   it('falls back to the response status/a generic message when the body carries no status/message of its own', async () => {
      axios.get = jest.fn().mockRejectedValue({ response: { status: 404, data: {} } });
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});

      let result;
      try {
         result = await fetchCustomerProfileInformation(9001, 90013, 999999, 'session');
      } finally {
         silence.mockRestore();
      }

      expect(result.status).toBe(404);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
   });

   it('falls back to 500 for a network failure with no response at all', async () => {
      axios.get = jest.fn().mockRejectedValue(new Error('Network Error'));
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});

      let result;
      try {
         result = await fetchCustomerProfileInformation(9001, 90013, 999999, 'session');
      } finally {
         silence.mockRestore();
      }

      expect(result.status).toBe(500);
   });
});
