import axios from 'axios';
import config from '../../config';

const headers = memoryToken => {
   return {
      headers: {
         'Content-Type': 'application/json'
      }
   };
};

export const postTransaction = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/transactions/createTransaction/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { transaction: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new transaction:', error);
      throw error;
   }
};

export const postNewPayment = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/payments/createPayment/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { payment: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new payment:', error);
      throw error;
   }
};

export const postReversePayment = async (accountID, userID, { paymentID, reason }, token) => {
   const url = `${config.API_ENDPOINT}/payments/reversePayment/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { payment: { paymentID, reason } }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while reversing payment:', error);
      throw error;
   }
};

export const postNewWriteOff = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/writeOffs/createWriteOffs/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { writeOff: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new write off:', error);
      throw error;
   }
};

export const postNewJobCategory = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobCategories/createJobCategory/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { jobCategory: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new job category:', error);
      throw error;
   }
};

export const postNewCustomer = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/customer/createCustomer/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { customer: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new customer:', error);
      throw error;
   }
};

export const postNewJobType = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobTypes/createJobType/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { jobType: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new job type:', error);
      throw error;
   }
};

export const postNewCustomerJob = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobs/createJob/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { job: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new customer job:', error);
      throw error;
   }
};

export const postNewTeamMember = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/user/createUser/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { user: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new team member:', error);
      throw error;
   }
};

export const postInvoiceCreation = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/invoices/createInvoice/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { invoiceConfiguration: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new invoice:', error);
      throw error;
   }
};

export const postNewRecurringCustomer = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/recurringCustomer/createRecurringCustomer/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { recurringCustomer: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new recurring customer:', error);
      throw error;
   }
};

export const postNewRetainer = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/retainers/createRetainer/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { retainer: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new retainer:', error);
      throw error;
   }
};

export const postGoogleAuth = async credential => {
   const url = `${config.API_ENDPOINT}/auth/google`;
   try {
      const response = await axios.post(url, { credential });
      return response.data;
   } catch (error) {
      console.error('Error while posting Google auth:', error);
      return error;
   }
};

// Clears the server-side httpOnly session cookie. Best-effort: local state is
// cleared regardless of the result.
export const postLogout = async () => {
   const url = `${config.API_ENDPOINT}/auth/logout`;
   try {
      const response = await axios.post(url, {});
      return response.data;
   } catch (error) {
      console.error('Error while logging out:', error);
      return null;
   }
};

export const postWorkDescription = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/workDescriptions/createWorkDescription/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { workDescription: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new work description:', error);
      throw error;
   }
};

export const postUserTimeEntryToTransactions = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/timesheets/moveToTransactions/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, { entry: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting time entry to transactions:', error);
      throw error;
   }
};

// Kickoff AI processing for a timesheet name or specific entry IDs
export const postAiKickoff = async (accountID, userID, token, payload) => {
   const url = `${config.API_ENDPOINT}/timesheets/ai/kickoff/${accountID}/${userID}`;
   try {
      const response = await axios.post(url, payload, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while kicking off AI suggestions:', error?.response?.data || error.message);
      throw error;
   }
};
