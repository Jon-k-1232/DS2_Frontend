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

export const putUpdateAccount = async (data, token) => {
   const url = `${config.API_ENDPOINT}/account/updateAccount/:accountID`;
   try {
      const response = await axios.post(url, { account: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting update account:', error);
      throw error;
   }
};

export const putUpdateAccountAddress = async (data, token) => {
   const url = `${config.API_ENDPOINT}/account/updateAccountAddress/:accountID`;
   try {
      const response = await axios.post(url, { accountAddress: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting update account address:', error);
      throw error;
   }
};

export const putEditTransaction = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/transactions/updateTransaction/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { transaction: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting transaction edit:', error);
      throw error;
   }
};

export const putEditPayment = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/payments/updatePayment/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { payment: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting payment edit:', error);
      throw error;
   }
};

export const putEditCustomer = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/customer/updateCustomer/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { customer: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting customer edit:', error);
      throw error;
   }
};

export const postEditCustomerJob = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobs/updateJob/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { job: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new customer job:', error);
      throw error;
   }
};

export const postEditJobType = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobTypes/updateJobType/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { jobType: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new job type:', error);
      throw error;
   }
};

export const postEditWriteOff = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/writeOffs/updateWriteOffs/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { writeOff: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new write off:', error);
      throw error;
   }
};

export const postEditRetainer = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/retainers/updateRetainer/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { retainer: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new retainer:', error);
      throw error;
   }
};

export const postEditJobCategory = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/jobCategories/updateJobCategory/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { jobCategory: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new job category:', error);
      throw error;
   }
};

export const putEditTeamMember = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/user/updateUser/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { user: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new team member:', error);
      throw error;
   }
};

export const putEditUserLogin = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/user/updateUserLogin/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { userLogin: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new team member:', error);
      throw error;
   }
};

export const postEditWorkDescriptions = async (data, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/workDescriptions/updateWorkDescription/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { workDescription: data }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error while posting new work description:', error);
      throw error;
   }
};

export const updateAccountAutomationSetting = async (accountID, userID, automationKey, isEnabled, token) => {
   const url = `${config.API_ENDPOINT}/account/automations/${accountID}/${userID}`;
   try {
      const response = await axios.put(url, { automationKey, isEnabled }, headers(token));
      return response.data;
   } catch (error) {
      console.error('Error updating account automation setting:', error);
      throw error;
   }
};
