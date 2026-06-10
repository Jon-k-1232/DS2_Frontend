import axios from 'axios';
import config from '../../config';

const headers = memoryToken => {
   return { headers: {} };
};

export const fetchAuditableCustomers = async (
   accountID,
   userID,
   {
      page = 1,
      limit = 25,
      search = '',
      filter = null,
      sort = null,
      direction = 'asc',
      hideZeroAppBalance = true
   } = {},
   token
) => {
   const params = new URLSearchParams({ page, limit, search });
   if (filter) params.set('filter', filter);
   if (sort) {
      params.set('sort', sort);
      params.set('direction', direction);
   }
   if (hideZeroAppBalance) params.set('hideZeroAppBalance', 'true');
   const res = await axios.get(`${config.API_ENDPOINT}/accountAudit/customers/${accountID}/${userID}?${params.toString()}`, headers(token));
   return res.data;
};

export const runAccountAudits = async (accountID, userID, customerIds, notes, token) => {
   const res = await axios.post(
      `${config.API_ENDPOINT}/accountAudit/run/${accountID}/${userID}`,
      { customer_ids: customerIds, notes: notes || null },
      headers(token)
   );
   return res.data;
};

export const pollAuditJob = async (jobId, accountID, userID, token) => {
   const res = await axios.get(`${config.API_ENDPOINT}/accountAudit/job/${jobId}/${accountID}/${userID}`, headers(token));
   return res.data;
};

export const fetchAccountAuditDetail = async (auditID, accountID, userID, token) => {
   const res = await axios.get(`${config.API_ENDPOINT}/accountAudit/audit/${auditID}/${accountID}/${userID}`, headers(token));
   return res.data;
};

export const fetchAuditsForCustomer = async (customerID, accountID, userID, token) => {
   const res = await axios.get(`${config.API_ENDPOINT}/accountAudit/customer/${customerID}/${accountID}/${userID}`, headers(token));
   return res.data;
};

export const auditPdfUrl = (auditID, accountID, userID) =>
   `${config.API_ENDPOINT}/accountAudit/audit/${auditID}/pdf/${accountID}/${userID}`;

// Open the server-rendered PDF in a new tab. Uses axios so we can stream a
// blob with the bearer token attached — the endpoint does not accept query
// auth, so we can't just window.open() it directly.
export const openAuditPdf = async (auditID, accountID, userID, token) => {
   const res = await axios.get(auditPdfUrl(auditID, accountID, userID), {
      ...headers(token),
      responseType: 'blob'
   });
   const blob = new Blob([res.data], { type: 'application/pdf' });
   const url = window.URL.createObjectURL(blob);
   const w = window.open(url, '_blank');
   if (!w) window.location.href = url;
   setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};
