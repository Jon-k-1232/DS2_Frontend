import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return { headers: { Authorization: `Bearer ${token}` } };
};

export const fetchARAging = async (
   accountID,
   userID,
   { page = 1, limit = 50, search = '', filter = null, sort = null, direction = 'desc' } = {},
   token
) => {
   const params = new URLSearchParams({ page, limit, search });
   if (filter) params.set('filter', filter);
   if (sort) {
      params.set('sort', sort);
      params.set('direction', direction);
   }
   const res = await axios.get(
      `${config.API_ENDPOINT}/accountsReceivable/aging/${accountID}/${userID}?${params.toString()}`,
      headers(token)
   );
   return res.data;
};

// Download a CSV of the full filtered AR aging dataset.  Honors the same
// search term, filter, and sort so the export matches what the user is viewing.
export const downloadARAgingCsv = async (
   accountID,
   userID,
   { search = '', filter = null, sort = null, direction = 'desc' } = {},
   token
) => {
   const params = new URLSearchParams({ search });
   if (filter) params.set('filter', filter);
   if (sort) {
      params.set('sort', sort);
      params.set('direction', direction);
   }
   const res = await axios.get(
      `${config.API_ENDPOINT}/accountsReceivable/aging/${accountID}/${userID}/export?${params.toString()}`,
      { ...headers(token), responseType: 'blob' }
   );

   // Try to pull the filename from Content-Disposition; fall back to a default.
   const disposition = res.headers?.['content-disposition'] || '';
   const match = /filename="?([^";]+)"?/i.exec(disposition);
   const fileName = match ? match[1] : 'accounts_receivable.csv';

   const blob = new Blob([res.data], { type: 'text/csv' });
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = fileName;
   document.body.appendChild(a);
   a.click();
   a.remove();
   window.URL.revokeObjectURL(url);
};
