import axios from 'axios';
import config from '../../config';
export async function invoiceExceptionCall({ accountID, userID, invoiceID, exceptionID, operation = 'history', body }) {
   const base = `${config.API_ENDPOINT}/invoices/${invoiceID}`;
   const route = operation === 'history' ? 'history' : operation === 'flag' ? 'exceptions' : `exceptions/${exceptionID}/${operation}`;
   try {
      const url = `${base}/${route}/${accountID}/${userID}`;
      const response = operation === 'history' ? await axios.get(url) : await axios.post(url, body || {});
      return response.data;
   } catch (error) {
      return { status: error.response?.status || 500, message: error.response?.data?.message || 'Invoice operation failed. Please reload and try again.' };
   }
}
