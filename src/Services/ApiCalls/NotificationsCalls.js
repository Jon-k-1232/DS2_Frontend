import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const _headers = memoryToken => {
   const token = memoryToken || TokenService.getAuthToken();
   return { headers: { Authorization: `Bearer ${token}` } };
};

export const fetchNotifications = async (accountID, userID, token, { unreadOnly = false, limit = 30 } = {}) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/notifications/${accountID}/${userID}`, {
         ..._headers(token),
         params: { unreadOnly, limit }
      });
      return response.data;
   } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], error: error.message };
   }
};

export const fetchUnreadCount = async (accountID, userID, token) => {
   try {
      const response = await axios.get(`${config.API_ENDPOINT}/notifications/${accountID}/${userID}/unread-count`, _headers(token));
      return Number(response?.data?.count || 0);
   } catch (error) {
      // 401 etc — surface as 0; the bell stays quiet rather than shouting.
      return 0;
   }
};

export const markNotificationRead = async (accountID, userID, notificationID, token) => {
   try {
      const response = await axios.put(`${config.API_ENDPOINT}/notifications/${notificationID}/${accountID}/${userID}/read`, {}, _headers(token));
      return response.data;
   } catch (error) {
      console.error('Error marking notification read:', error);
      return null;
   }
};

export const markAllNotificationsRead = async (accountID, userID, token) => {
   try {
      const response = await axios.put(`${config.API_ENDPOINT}/notifications/${accountID}/${userID}/read-all`, {}, _headers(token));
      return response.data;
   } catch (error) {
      console.error('Error marking all notifications read:', error);
      return null;
   }
};
