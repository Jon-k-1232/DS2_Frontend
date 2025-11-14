import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return {
      headers: {
         Authorization: `Bearer ${token}`
      }
   };
};

export const fetchServerHealth = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/api/health/backend/stats/${accountID}/${userID}`, headers(token));
      const serverHealth = response.data;
      return serverHealth;
   } catch (error) {
      console.error('Error fetching server health:', error);
      return [];
   }
};

export const getCustomerJobsList = async (accountID, userID, customerID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/jobs/getActiveCustomerJobs/${accountID}/${userID}/${customerID}`, headers(token));
      const customerJobsList = response.data;
      return customerJobsList;
   } catch (error) {
      console.error('Error fetching customer jobs data:', error);
      return [];
   }
};

export const fetchSingleJobCategory = async (jobCategoryID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/jobCategories/getSingleJobCategory/${jobCategoryID}/${accountID}/${userID}`, headers(token));
      const jobCategoryData = response.data;
      return jobCategoryData;
   } catch (error) {
      console.error('Error fetching job category data:', error);
      return [];
   }
};

export const getInitialAppData = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/initialData/initialBlob/${accountID}/${userID}`, headers(token));
      const initialAppData = response.data;
      return initialAppData;
   } catch (error) {
      console.error('Error fetching initial app data:', error);
      return [];
   }
};

export const fetchCustomerProfileInformation = async (accountID, userID, customerID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/customer/activeCustomers/customerByID/${accountID}/${userID}/${customerID}`, headers(token));
      const customerContactInformation = response.data;
      return customerContactInformation;
   } catch (error) {
      console.error('Error fetching customer contact information:', error);
      return [];
   }
};

export const fetchCustomers = async (accountID, userID, token, page = 1, limit = 20, search = '') => {
   const params = { page, limit };
   if (search && search.trim().length) params.search = search.trim();
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/customer/activeCustomers/${accountID}/${userID}`, {
         ...headers(token),
         params
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching customers:', error);
      return {
         status: 500,
         message: error.message || 'Unable to fetch customers.',
         customersList: {
            activeCustomerData: {
               grid: { rows: [], columns: [] },
               pagination: { page, limit, totalItems: 0, totalPages: 0 },
               searchTerm: search
            }
         }
      };
   }
};

export const fetchSingleUser = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/user/fetchSingleUser/${accountID}/${userID}`, headers(token));
      const singleUser = response.data;
      return singleUser;
   } catch (error) {
      console.error('Error fetching single user:', error);
      return [];
   }
};

export const getOutstandingBalanceList = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/invoices/createInvoice/AccountsWithBalance/${accountID}/${userID}`, headers(token));
      const outstandingInvoicesList = response.data;
      return outstandingInvoicesList;
   } catch (error) {
      console.error('Error fetching outstanding invoices data:', error);
      return [];
   }
};

export const fetchSingleTransaction = async (customer_id, transaction_id, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/transactions/getSingleTransaction/${customer_id}/${transaction_id}/${accountID}/${userID}`, headers(token));
      const transaction = response.data;
      return transaction;
   } catch (error) {
      console.error('Error fetching single transaction:', error);
      return [];
   }
};

export const fetchTransactions = async (accountID, userID, token, page = 1, limit = 20, search = '') => {
   const params = {
      page,
      limit
   };

   if (search && search.trim().length) {
      params.search = search.trim();
   }

   try {
      const response = await axios.get(`${config.API_ENDPOINT}/transactions/getTransactions/${accountID}/${userID}`, {
         ...headers(token),
         params
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching transactions:', error);
      return {
         status: 500,
         message: error.message || 'Unable to fetch transactions.',
         transactionsList: {
            activeTransactionsData: {
               grid: { rows: [], columns: [] },
               pagination: {
                  page,
                  limit,
                  totalItems: 0,
                  totalPages: 0
               },
               searchTerm: search
            }
         }
      };
   }
};

export const exportAllTransactions = async (accountID, userID, token, search = '') => {
   try {
      const params = {};
      if (search && search.trim().length) {
         params.search = search.trim();
      }

      const response = await axios.get(`${config.API_ENDPOINT}/transactions/exportTransactions/${accountID}/${userID}`, {
         ...headers(token),
         params,
         responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { status: 200 };
   } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
   }
};

export const fetchPayments = async (accountID, userID, token, page = 1, limit = 20, search = '') => {
   const params = { page, limit };
   if (search && search.trim().length) {
      params.search = search.trim();
   }

   try {
      const response = await axios.get(`${config.API_ENDPOINT}/payments/getPayments/${accountID}/${userID}`, {
         ...headers(token),
         params
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching payments:', error);
      return {
         status: 500,
         message: error.message || 'Unable to fetch payments.',
         paymentsList: {
            activePaymentsData: {
               grid: { rows: [], columns: [] },
               pagination: {
                  page,
                  limit,
                  totalItems: 0,
                  totalPages: 0
               },
               searchTerm: search
            }
         }
      };
   }
};

export const fetchInvoices = async (accountID, userID, token, page = 1, limit = 20, search = '') => {
   const params = { page, limit };
   if (search && search.trim().length) params.search = search.trim();
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/invoices/getInvoicesPaginated/${accountID}/${userID}`, {
         ...headers(token),
         params
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching invoices:', error);
      return {
         status: 500,
         message: error.message || 'Unable to fetch invoices.',
         invoicesList: {
            activeInvoiceData: {
               grid: { rows: [], columns: [] },
               pagination: { page, limit, totalItems: 0, totalPages: 0 },
               searchTerm: search
            }
         }
      };
   }
};

export const fetchSinglePayment = async (paymentID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/payments/getSinglePayment/${paymentID}/${accountID}/${userID}`, headers(token));
      const payment = response.data;
      return payment;
   } catch (error) {
      console.error('Error fetching single payment:', error);
      return [];
   }
};

export const fetchSingleWriteOff = async (writeOffID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/writeOffs/getSingleWriteOff/${writeOffID}/${accountID}/${userID}`, headers(token));
      const writeOff = response.data;
      return writeOff;
   } catch (error) {
      console.error('Error fetching single write off:', error);
      return [];
   }
};

export const fetchWriteOffs = async (accountID, userID, token, page = 1, limit = 20, search = '') => {
   const params = { page, limit };
   if (search && search.trim().length) params.search = search.trim();
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/writeOffs/getWriteOffs/${accountID}/${userID}`, {
         ...headers(token),
         params
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching write-offs:', error);
      return {
         status: 500,
         message: error.message || 'Unable to fetch write-offs.',
         writeOffsList: {
            activeWriteOffsData: {
               grid: { rows: [], columns: [] },
               pagination: { page, limit, totalItems: 0, totalPages: 0 },
               searchTerm: search
            }
         }
      };
   }
};

export const fetchSingleJob = async (customer_job_id, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/jobs/getSingleJob/${customer_job_id}/${accountID}/${userID}`, headers(token));
      const job = response.data;
      return job;
   } catch (error) {
      console.error('Error fetching single job:', error);
      return [];
   }
};

export const fetchSingleJobType = async (jobTypeID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/jobTypes/getSingleJobType/${jobTypeID}/${accountID}/${userID}`, headers(token));
      const job = response.data;
      return job;
   } catch (error) {
      console.error('Error fetching single job:', error);
      return [];
   }
};

export const fetchSingleRetainer = async (retainerID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/retainers/getSingleRetainer/${retainerID}/${accountID}/${userID}`, headers(token));
      const retainer = response.data;
      return retainer;
   } catch (error) {
      console.error('Error fetching single retainer:', error);
      return [];
   }
};

export const fetchSingleWorkDescription = async (workDescriptionID, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/workDescriptions/getSingleWorkDescription/${workDescriptionID}/${accountID}/${userID}`, headers(token));
      const workDescription = response.data;
      return workDescription;
   } catch (error) {
      console.error('Error fetching single work description:', error);
      return [];
   }
};

export const fetchCustomerRetainerAndPrepaymentList = async (accountID, userID, customerID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/retainers/getActiveRetainers/${customerID}/${accountID}/${userID}`, headers(token));
      const customerRetainersAndPrePayments = response.data;
      return customerRetainersAndPrePayments;
   } catch (error) {
      console.error('Error fetching customer retainers and prepayments:', error);
      return [];
   }
};

export const fetchFileDownload = async (fileLocation, fileName, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/invoices/downloadFile/${accountID}/${userID}?fileLocation=${fileLocation}`, {
         ...headers(token),
         responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // set filename from the server response
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { status: 200, message: 'Successfully downloaded file.' };
   } catch (error) {
      console.error('Error fetching download file:', error);
      return { status: 400, message: 'File download failure.' };
   }
};

export const fetchAccountInformation = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/account/AccountInformation/${accountID}/${userID}`, headers(token));
      const accountInformation = response.data;
      return accountInformation;
   } catch (error) {
      console.error('Error fetching account information:', error);
      return [];
   }
};

export const fetchAiIntegrationSettings = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/ai-integration/${accountID}/${userID}`, {
         ...headers(token),
         params: { t: Date.now() } // cache-buster to avoid 304/empty bodies
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching AI integration settings:', error);
      return { status: 500, message: 'Unable to load AI integration settings.' };
   }
};

export const fetchAiIntegrationModels = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/ai-integration/${accountID}/${userID}/models`, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching AI integration models:', error);
      return {
         status: error?.response?.status || 500,
         message: error?.response?.data?.message || 'Unable to load AI integration models.',
         connected: false,
         models: []
      };
   }
};

export const revealAiIntegrationKey = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/ai-integration/${accountID}/${userID}/reveal`, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error revealing AI integration key:', error);
      return { status: 500, message: 'Unable to reveal AI integration key.' };
   }
};

export const fetchAccountAutomations = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/account/automations/${accountID}/${userID}`, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error fetching account automation settings:', error);
      return { status: 500, message: 'Unable to fetch automation settings.', automations: [] };
   }
};

export const fetchCustomerInvoiceInformation = async (accountID, userID, customerInvoiceID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/invoices/getInvoiceDetails/${customerInvoiceID}/${accountID}/${userID}`, headers(token));
      const invoiceInformation = response.data;
      return invoiceInformation;
   } catch (error) {
      console.error('Error fetching invoice information:', error);
      return [];
   }
};

export const fetchAllEmployeeTransactionsBetweenDates = async (startDate, endDate, accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/transactions/fetchEmployeeTransactions/${startDate}/${endDate}/${accountID}/${userID}`, headers(token));
      const retainer = response.data;
      return retainer;
   } catch (error) {
      console.error('Error fetching single retainer:', error);
      return [];
   }
};

export const fetchAppVersion = async () => {
   try {
      const response = await fetch('/version.txt', { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      const trimmed = text.trim();

      if (!trimmed || /^<!doctype/i.test(trimmed) || /^<html/i.test(trimmed) || contentType.includes('text/html')) {
         return 'Unknown';
      }

      return trimmed.split(/\r?\n/)[0].trim();
   } catch (error) {
      console.error('Error fetching version:', error);
      return 'Unknown';
   }
};

export const fetchOutstandingTimesheetCounts = async (accountID, userID) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/timesheets/countsByEmployee/${accountID}/${userID}`, headers());
      const outstandingTimesheetCounts = response.data;
      return outstandingTimesheetCounts;
   } catch (error) {
      console.error('Error fetching outstanding timesheet counts:', error);
      return [];
   }
};

export const fetchOutstandingEmployeeEntriesByID = async (accountID, userID, selectedUserID, token, page = 1, limit = 10) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/timesheets/getTimesheetEntriesByUserID/${selectedUserID}/${accountID}/${userID}`, {
         headers: { Authorization: `Bearer ${token}` },
         params: { page, limit }
      });

      if (response.status === 200 && response.data) {
         // Safely return the data
         return response.data;
      } else {
         console.warn('Unexpected API response:', response);
         return { grid: { rows: [], columns: [] }, pagination: {} };
      }
   } catch (error) {
      console.error('Error fetching outstanding employee entries:', error.message);
      return { grid: { rows: [], columns: [] }, pagination: {} };
   }
};

export const fetchAllEmployeeTimesheetsByID = async (accountID, userID, selectedUserID, token, page = 1, limit = 10, filterQuery = '') => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/timesheets/getAllTimesheetsForEmployeeByUserID/${selectedUserID}/${accountID}/${userID}`, {
         headers: { Authorization: `Bearer ${token}` },
         params: { page, limit, filterQuery }
      });

      if (response.status === 200 && response.data) {
         // Safely return the data
         return response.data;
      } else {
         console.warn('Unexpected API response:', response);
         return { grid: { rows: [], columns: [] }, pagination: {} };
      }
   } catch (error) {
      console.error('Error fetching all employee timesheets:', error.message);
      return { grid: { rows: [], columns: [] }, pagination: {} };
   }
};

export const fetchTimesheetsByMonth = async (accountID, userID, selectedUserID, token, page = 1, limit = 10, filterQuery = '') => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/timesheets/fetchTimesheetsByMonth/${selectedUserID}/${accountID}/${userID}`, {
         headers: { Authorization: `Bearer ${token}` },
         params: { page, limit, filterQuery }
      });

      if (response.status === 200 && response.data) {
         // Safely return the data
         return response.data;
      } else {
         console.warn('Unexpected API response:', response);
         return { grid: { rows: [], columns: [] }, pagination: {} };
      }
   } catch (error) {
      console.error('Error fetching timesheets by month:', error.message);
      return { grid: { rows: [], columns: [] }, pagination: {} };
   }
};
