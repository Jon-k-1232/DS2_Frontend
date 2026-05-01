import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const _headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return { headers: { Authorization: `Bearer ${token}` } };
};

export const fetchPendingHeldEntries = async (accountID, userID, token, { holdReason, timesheetName, page = 1, limit = 50 } = {}) => {
   const params = { page, limit };
   if (holdReason) params.hold_reason = holdReason;
   if (timesheetName) params.timesheet_name = timesheetName;
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/billing-review/pending/${accountID}/${userID}`, { ..._headers(token), params });
      return response.data;
   } catch (error) {
      console.error('Error fetching held entries:', error);
      return { entries: [], total: 0, error: error.message };
   }
};

export const applyHeldEntry = async (accountID, userID, entryID, edits, token) => {
   try {
      const response = await axios.put(`${config.API_ENDPOINT}/billing-review/${entryID}/${accountID}/${userID}`, edits, _headers(token));
      return response.data;
   } catch (error) {
      console.error('Error applying held entry:', error);
      const data = error?.response?.data || {};
      throw Object.assign(new Error(data.message || error.message), { code: data.code, field: data.field, status: error?.response?.status });
   }
};

export const fetchConsolidatedTransactions = async (accountID, userID, token, { start, end, customerId, employeeUserId, page = 1, limit = 200 } = {}) => {
   const params = { start, end, page, limit };
   if (customerId) params.customerId = customerId;
   if (employeeUserId) params.employeeUserId = employeeUserId;
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/billing-review/weekly/${accountID}/${userID}`, { ..._headers(token), params });
      return response.data;
   } catch (error) {
      console.error('Error fetching consolidated transactions:', error);
      return { transactions: [], totalSum: 0, error: error.message };
   }
};

export const fetchPreInvoiceReview = async (accountID, userID, token, { customerId, start, end } = {}) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/billing-review/pre-invoice/${accountID}/${userID}`, {
         ..._headers(token),
         params: { customerId, start, end }
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching pre-invoice review:', error);
      return { transactions: [], anomaly: null, error: error.message };
   }
};

export const fetchReprocessCount = async (accountID, userID, token, { mode = 'unprocessed' } = {}) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/billing-review/reprocess-count/${accountID}/${userID}`, {
         ..._headers(token),
         params: { mode }
      });
      return response.data;
   } catch (error) {
      return { count: 0, eligible: false, error: error.message };
   }
};

export const triggerReprocess = async (accountID, userID, token, { mode = 'unprocessed', batch_size = 500 } = {}) => {
   try {
      const response = await axios.post(
         `${config.API_ENDPOINT}/billing-review/reprocess/${accountID}/${userID}`,
         { mode, batch_size },
         _headers(token)
      );
      return response.data;
   } catch (error) {
      const data = error?.response?.data || {};
      throw Object.assign(new Error(data.message || error.message), { code: data.code, status: error?.response?.status });
   }
};

export const updateFinalizedTransaction = async (accountID, userID, transactionID, { updates, confirmCustomerChange = false }, token) => {
   try {
      const response = await axios.put(
         `${config.API_ENDPOINT}/billing-review/transaction/${transactionID}/${accountID}/${userID}`,
         { updates, confirmCustomerChange },
         _headers(token)
      );
      return response.data;
   } catch (error) {
      const data = error?.response?.data || {};
      const err = new Error(data.message || error.message);
      err.code = data.code;
      err.invoiceId = data.invoiceId;
      err.status = error?.response?.status;
      throw err;
   }
};
