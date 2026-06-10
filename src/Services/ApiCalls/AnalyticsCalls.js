import axios from 'axios';
import config from '../../config';

const headers = () => ({ headers: {} });

// Serialize the exclude-customer ids into a query fragment ('' when none).
const excludeParam = exclude => (Array.isArray(exclude) && exclude.length ? `&exclude=${exclude.join(',')}` : '');

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

export const fetchExclusions = async (accountID, userID) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/exclusions/${accountID}/${userID}`, headers());
   return res.data;
};

export const fetchClientRates = async (accountID, userID, { yearsBack = 6, exclude = [] } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/clientRates/${accountID}/${userID}?yearsBack=${yearsBack}${excludeParam(exclude)}`, headers());
   return res.data;
};

export const downloadClientRatesCsv = (accountID, userID, { yearsBack = 6, exclude = [] } = {}) =>
   downloadCsv(`${config.API_ENDPOINT}/analytics/clientRates/${accountID}/${userID}/export?yearsBack=${yearsBack}${excludeParam(exclude)}`, 'client_rates.csv');

export const fetchTimeAllocation = async (accountID, userID, { year, exclude = [] } = {}) => {
   const params = `?${year ? `year=${year}` : ''}${excludeParam(exclude)}`;
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/timeAllocation/${accountID}/${userID}${params}`, headers());
   return res.data;
};

export const downloadTimeAllocationCsv = (accountID, userID, { year, exclude = [] } = {}) =>
   downloadCsv(`${config.API_ENDPOINT}/analytics/timeAllocation/${accountID}/${userID}/export?${year ? `year=${year}` : ''}${excludeParam(exclude)}`, 'time_allocation.csv');

export const saveRateAgreement = async (accountID, userID, { customerId, year, agreedRate, notes }) => {
   const res = await axios.post(`${config.API_ENDPOINT}/analytics/rateAgreement/${accountID}/${userID}`, { customerId, year, agreedRate, notes }, headers());
   return res.data;
};

export const fetchWipAging = async (accountID, userID, { exclude = [] } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/wipAging/${accountID}/${userID}?${excludeParam(exclude).slice(1)}`, headers());
   return res.data;
};

export const fetchJobBudgets = async (accountID, userID, { exclude = [] } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/jobBudgets/${accountID}/${userID}?${excludeParam(exclude).slice(1)}`, headers());
   return res.data;
};

export const fetchTaxSeasonCapacity = async (accountID, userID, { year, exclude = [] } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/taxSeasonCapacity/${accountID}/${userID}?${year ? `year=${year}` : ''}${excludeParam(exclude)}`, headers());
   return res.data;
};

export const downloadYearEndPacket = async (accountID, userID, { year, exclude = [] } = {}) => {
   const res = await axios.get(`${config.API_ENDPOINT}/analytics/yearEndPacket/${accountID}/${userID}?${year ? `year=${year}` : ''}${excludeParam(exclude)}`, {
      ...headers(),
      responseType: 'blob'
   });
   const blob = new Blob([res.data], { type: 'application/zip' });
   const objectUrl = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = objectUrl;
   a.download = `year_end_packet_${year || ''}.zip`;
   document.body.appendChild(a);
   a.click();
   a.remove();
   window.URL.revokeObjectURL(objectUrl);
};

export const downloadCustomerStatement = async (accountID, userID, customerID, { start, end } = {}) => {
   const params = new URLSearchParams();
   if (start) params.set('start', start);
   if (end) params.set('end', end);
   const res = await axios.get(`${config.API_ENDPOINT}/customer/statement/${accountID}/${userID}/${customerID}?${params.toString()}`, {
      ...headers(),
      responseType: 'blob'
   });
   const blob = new Blob([res.data], { type: 'application/pdf' });
   const objectUrl = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = objectUrl;
   a.download = `statement_${customerID}.pdf`;
   document.body.appendChild(a);
   a.click();
   a.remove();
   window.URL.revokeObjectURL(objectUrl);
};

