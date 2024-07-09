import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
   };
};

export const deleteChargeOrTimeTransaction = async (transaction, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/transactions/deleteTransaction/${accountID}/${userID}`;
   try {
      const response = await axios({
         url: url,
         method: 'DELETE',
         data: { transaction: transaction },
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.error('Error while deleting transaction:', error);
      throw error;
   }
};

export const deletePayment = async (payment, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/payments/deletePayment/${accountID}/${userID}`;
   try {
      const response = await axios({
         url: url,
         method: 'DELETE',
         data: { payment: payment },
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.error('Error while deleting payment:', error);
      throw error;
   }
};

export const deleteWriteOff = async (writeOff, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/writeOffs/deleteWriteOffs/${accountID}/${userID}`;
   try {
      const response = await axios({
         url: url,
         method: 'DELETE',
         data: { writeOff: writeOff },
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.error('Error while deleting write off:', error);
      throw error;
   }
};

export const deleteJob = async (jobID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/jobs/deleteJob/${jobID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteJobType = async (jobTypeID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/jobTypes/deleteJobType/${jobTypeID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteRetainer = async (retainerID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/retainers/deleteRetainer/${retainerID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteJobCategory = async (jobCategoryID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/jobCategories/deleteJobCategory/${jobCategoryID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteUser = async (userID, accountID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/user/deleteUser/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteWorkDescription = async (workDescriptionID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/workDescriptions/deleteWorkDescription/${workDescriptionID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};

export const deleteCustomer = async (customerID, accountID, userID, token) => {
   try {
      const response = await axios.delete(`${config.API_ENDPOINT}/customer/deleteCustomer/${customerID}/${accountID}/${userID}`, {
         headers: { ...headers(token) }
      });
      return response.data;
   } catch (error) {
      console.log(error);
   }
};
