import axios from 'axios';
import config from '../../config';

const headers = () => ({ headers: {} });

const downloadCsv = async (url, fallbackName) => {
   const res = await axios.get(url, { ...headers(), responseType: 'blob' });
   const disposition = res.headers?.['content-disposition'] || '';
   const match = /filename="?([^";]+)"?/i.exec(disposition);
   const fileName = match ? match[1] : fallbackName;

   const blob = new Blob([res.data], { type: 'text/csv' });
   const objectUrl = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = objectUrl;
   a.download = fileName;
   document.body.appendChild(a);
   a.click();
   a.remove();
   window.URL.revokeObjectURL(objectUrl);
};

export const fetchClientRates = async (accountID, userID, { yearsBack = 6 } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/clientRates/${accountID}/${userID}?yearsBack=${yearsBack}`, headers());
   return res.data;
};

export const downloadClientRatesCsv = (accountID, userID, { yearsBack = 6 } = {}) =>
   downloadCsv(`${config.API_ENDPOINT}/analytics/clientRates/${accountID}/${userID}/export?yearsBack=${yearsBack}`, 'client_rates.csv');

export const fetchTimeAllocation = async (accountID, userID, { year } = {}) => {
   const params = year ? `?year=${year}` : '';
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/timeAllocation/${accountID}/${userID}${params}`, headers());
   return res.data;
};

export const downloadTimeAllocationCsv = (accountID, userID, { year } = {}) =>
   downloadCsv(`${config.API_ENDPOINT}/analytics/timeAllocation/${accountID}/${userID}/export${year ? `?year=${year}` : ''}`, 'time_allocation.csv');
