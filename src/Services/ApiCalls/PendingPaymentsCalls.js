import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return {
      headers: {
         Authorization: `Bearer ${token}`,
         'Content-Type': 'application/json'
      }
   };
};

const getHeaders = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return { headers: { Authorization: `Bearer ${token}` } };
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

export const approvePendingPayment = async (paymentID, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/approve/${paymentID}/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, {}, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error approving pending payment:', error);
      throw error;
   }
};

export const uploadPaymentFile = async (file, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/pending-payments/upload/${accountID}/${userID}`;
   const arrayBuffer = await file.arrayBuffer();
   try {
      const response = await axios.post(url, arrayBuffer, {
         headers: {
            Authorization: `Bearer ${token}`,
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
         headers: { Authorization: `Bearer ${token}` },
         responseType: 'blob'
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching file preview:', error);
      throw error;
   }
};
