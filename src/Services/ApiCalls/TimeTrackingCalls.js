import axios from 'axios';
import config from '../../config';
import TokenService from '../TokenService';

const buildAuthHeaders = token => {
   const authToken = token || TokenService.getAuthToken();
   return {
      Authorization: `Bearer ${authToken}`
   };
};

const extractFileName = contentDisposition => {
   if (!contentDisposition) return null;
   const match = contentDisposition.match(/filename\*=UTF-8''(.+)|filename="([^"]+)"/i);
   if (match) {
      return decodeURIComponent(match[1] || match[2]);
   }
   return null;
};

export const uploadTimeTrackerFile = async (file, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/upload/${accountID}/${userID}`;
   const authHeaders = buildAuthHeaders(token);
   const arrayBuffer = await file.arrayBuffer();

   const response = await axios.post(url, arrayBuffer, {
      headers: {
         ...authHeaders,
         'Content-Type': 'application/octet-stream',
         'x-file-name': encodeURIComponent(file.name),
         'x-file-type': file.type || 'application/octet-stream'
      }
   });

   return response.data;
};

export const fetchTimeTrackerHistory = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/history/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token)
   });

   return response.data?.history || [];
};

export const downloadTimeTrackerHistoryFile = async (accountID, userID, key, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/history/download/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token),
      params: { key },
      responseType: 'blob'
   });

   const headerName = response.headers['x-tracker-filename'];
   const fileName =
      headerName ||
      extractFileName(response.headers['content-disposition']) ||
      key.split('/').pop().replace(/\.gz$/, '');
   return { blob: response.data, fileName };
};

export const downloadTimeTrackerByName = async (accountID, userID, ownerUserID, timesheetName, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/download/by-name/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token),
      params: {
         ownerUserID,
         timesheetName
      },
      responseType: 'blob'
   });

   const trackerHeader = response.headers['x-tracker-filename'];
   const headerName = extractFileName(response.headers['content-disposition']);
   const fileName = trackerHeader || headerName || `${timesheetName}`;

   return { blob: response.data, fileName };
};

export const downloadLatestTimeTrackerTemplate = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/template/latest/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token),
      responseType: 'blob'
   });

   const fallbackName = 'timeTracker_latest.xlsx';
   const trackerHeader = response.headers['x-tracker-filename'];
   const headerName = extractFileName(response.headers['content-disposition']);
   const fileName = trackerHeader || headerName || fallbackName;
   return { blob: response.data, fileName };
};

export const uploadTimeTrackerTemplate = async (file, accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/template/upload/${accountID}/${userID}`;
   const authHeaders = buildAuthHeaders(token);
   const arrayBuffer = await file.arrayBuffer();

   const response = await axios.post(url, arrayBuffer, {
      headers: {
         ...authHeaders,
         'Content-Type': file.type || 'application/octet-stream',
         'x-file-name': encodeURIComponent(file.name),
         'x-file-type': file.type || 'application/octet-stream'
      }
   });

   return response.data;
};

export const fetchTimeTrackerTemplates = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/template/list/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token)
   });

   return response.data?.templates || [];
};

export const deleteTimeTrackerTemplate = async (accountID, userID, key, token) => {
   const url = `${config.API_ENDPOINT}/time-tracking/template/delete/${accountID}/${userID}`;
   await axios.delete(url, {
      headers: buildAuthHeaders(token),
      data: { key }
   });
};

export const fetchTimeTrackerStaffSettings = async (accountID, userID, token) => {
   const url = `${config.API_ENDPOINT}/time-tracker-staff/${accountID}/${userID}`;
   const response = await axios.get(url, {
      headers: buildAuthHeaders(token)
   });

   return response.data || {};
};

export const addTimeTrackerStaffMembers = async (accountID, userID, userIds, token) => {
   const url = `${config.API_ENDPOINT}/time-tracker-staff/${accountID}/${userID}`;
   const response = await axios.post(
      url,
      { userIds },
      {
         headers: {
            ...buildAuthHeaders(token),
            'Content-Type': 'application/json'
         }
      }
   );

   return response.data || {};
};

export const updateTimeTrackerStaffMember = async (accountID, userID, staffID, isActive, token) => {
   const url = `${config.API_ENDPOINT}/time-tracker-staff/${accountID}/${userID}/${staffID}`;
   const response = await axios.put(
      url,
      { isActive },
      {
         headers: {
            ...buildAuthHeaders(token),
            'Content-Type': 'application/json'
         }
      }
   );

   return response.data || {};
};
