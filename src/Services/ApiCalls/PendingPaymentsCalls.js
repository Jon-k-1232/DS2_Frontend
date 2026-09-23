import axios from 'axios';
import config from '../../config';

const headers = memoryToken => {
   return {
      headers: {
         'Content-Type': 'application/json'
      }
   };
};

const getHeaders = memoryToken => {
   return { headers: {} };
};

export const fetchPendingPayments = async (accountID, userID, token, { page = 1, limit = 20, search = '', status = 'new', month, year } = {}) => {
   const params = new URLSearchParams({ page, limit, search, status });
   if (month) params.append('month', month);
   if (year) params.append('year', year);
   const url = `${config.API_ENDPOINT}/pending-payments/list/${accountID}/${userID}?${params}`;
   try {
      const response = await axios.get(url, getHeaders(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching pending payments:', error);
      throw error;
   }
};

export const fetchPendingPaymentCounts = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/counts/${accountID}/${userID}`;
   try {
      const response = await axios.get(url, getHeaders(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching pending payment counts:', error);
      return { counts: { newPayments: 0, processed: 0, all: 0 } };
   }
};

export const fetchSinglePendingPayment = async (paymentID, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/single/${paymentID}/${accountID}/${userID}`;
   try {
      const response = await axios.get(url, getHeaders(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching single pending payment:', error);
      throw error;
   }
};

export const softDeletePendingPayment = async (paymentID, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/soft-delete/${paymentID}/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, {}, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error deleting pending payment:', error);
      throw error;
   }
};

// The legacy two-step approval (PUT /pending-payments/approve/:paymentID/...)
// is gone: the backend answers it with 410 because it marked money processed
// without posting it. Approval is ONLY the atomic POST below.

/**
 * True when the atomic approval route itself is missing (an Express default,
 * non-JSON 404) as opposed to the API's own business-logic 404, which arrives
 * as JSON with a numeric `status`. Callers must treat this as a hard stop —
 * never retry through another path.
 */
export const isApprovalRouteMissing = error => error?.response?.status === 404 && typeof error?.response?.data?.status !== 'number';

export const APPROVAL_UNAVAILABLE_MESSAGE = 'The payment approval endpoint is unavailable (backend not deployed). Nothing was posted — do not retry; contact support.';

// Single-request approve: creates the real payment AND marks the pending
// record processed atomically (one db transaction backend-side). Matches
// POST /pending-payments/approve/:accountID/:userID — body
// { pendingPaymentId, payment: <same shape postNewPayment takes> }, response
// { status, message, payment, pendingPayment, counts, paymentsList,
// invoicesList, accountRetainersList }. Every error this route returns
// (400/404/409/422/500, including a genuine "pending payment not found" 404)
// comes back as JSON with a numeric `status` field. A 404 with a NON-JSON body
// (Express's default not-found page) means approval is unavailable: callers
// stop and show APPROVAL_UNAVAILABLE_MESSAGE (see isApprovalRouteMissing).
// Never fall back to a separate payment POST or the retired approval PUT.
export const approvePendingPaymentAtomic = async (accountID, userID, pendingPaymentId, payment, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/approve/${accountID}/${userID}`;
   const response = await axios.post(url, { pendingPaymentId, payment }, headers(token));
   return response.data;
};

export const uploadPaymentFile = async (file, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/upload/${accountID}/${userID}`;
   const arrayBuffer = await file.arrayBuffer();
   try {
      const response = await axios.post(url, arrayBuffer, {
         headers: {
            'Content-Type': 'application/octet-stream',
            'x-file-name': encodeURIComponent(file.name),
            'x-file-type': file.type || 'application/pdf'
         }
      });
      return response.data;
   } catch (error) {
      console.error('Error uploading payment file:', error);
      throw error;
   }
};

export const fetchPaymentFiles = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/files/${accountID}/${userID}`;
   try {
      const response = await axios.get(url, getHeaders(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching payment files:', error);
      return { files: [] };
   }
};

export const deletePaymentFile = async (fileName, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/file/${accountID}/${userID}`;
   try {
      const response = await axios.delete(url, {
         ...headers(token),
         data: { fileName }
      });
      return response.data;
   } catch (error) {
      console.error('Error deleting payment file:', error);
      throw error;
   }
};

export const fetchPaymentFilePreview = async (fileName, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/file-preview/${accountID}/${userID}?fileName=${encodeURIComponent(fileName)}`;
   try {
      const response = await axios.get(url, {
         headers: {},
         responseType: 'blob'
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching file preview:', error);
      throw error;
   }
};
