/**
 * Pending-payment approval is ONE atomic request. The legacy two-step flow
 * (create payment, then PUT /pending-payments/approve/:paymentID) is gone: the
 * backend now answers that PUT with 410, and a retry after the first step had
 * already posted the receipt could post it twice.
 */
import axios from 'axios';
import * as calls from './PendingPaymentsCalls';

// Factory mock: axios ships ESM that jest's default transform ignores, so an
// automock (which loads the real module to learn its shape) fails to parse.
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), get: jest.fn() } }));

describe('PendingPaymentsCalls — atomic approval only', () => {
   afterEach(() => jest.resetAllMocks());

   it('no longer exports the legacy two-step PUT approval', () => {
      expect(calls.approvePendingPayment).toBeUndefined();
   });

   it('approvePendingPaymentAtomic sends exactly one POST and never a PUT', async () => {
      axios.post.mockResolvedValue({ data: { status: 200, message: 'ok' } });
      const result = await calls.approvePendingPaymentAtomic(9001, 90013, 555, { paymentAmount: 10 }, 'token');
      expect(result).toEqual({ status: 200, message: 'ok' });
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post.mock.calls[0][0]).toMatch(/\/pending-payments\/approve\/9001\/90013$/);
      expect(axios.put).not.toHaveBeenCalled();
   });

   it('a non-JSON 404 (route not deployed) is recognised as "approval unavailable" — a hard stop', () => {
      const routeMissing = { response: { status: 404, data: '<html>Cannot POST /pending-payments/approve</html>' } };
      expect(calls.isApprovalRouteMissing(routeMissing)).toBe(true);
      expect(calls.APPROVAL_UNAVAILABLE_MESSAGE).toMatch(/do not retry/i);
   });

   it("the API's own business-logic 404 (JSON with a numeric status) is NOT a missing route", () => {
      const businessNotFound = { response: { status: 404, data: { status: 404, message: 'Pending payment record not found.' } } };
      expect(calls.isApprovalRouteMissing(businessNotFound)).toBe(false);
      expect(calls.isApprovalRouteMissing({ response: { status: 500, data: 'boom' } })).toBe(false);
      expect(calls.isApprovalRouteMissing(new Error('network'))).toBe(false);
   });

   it('a rejected POST propagates without any second request', async () => {
      const routeMissing = Object.assign(new Error('Request failed with status code 404'), { response: { status: 404, data: '<html>' } });
      axios.post.mockRejectedValue(routeMissing);
      await expect(calls.approvePendingPaymentAtomic(9001, 90013, 555, {}, 'token')).rejects.toBe(routeMissing);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.put).not.toHaveBeenCalled();
   });
});
