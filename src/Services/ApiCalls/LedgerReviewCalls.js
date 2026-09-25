import axios from 'axios';
import config from '../../config';
async function call(method, path, body) {
   try { const result = await axios[method](`${config.API_ENDPOINT}${path}`, body); return result.data; }
   catch (error) { return { status:error.response?.status || 500, message:error.response?.data?.message || 'Unable to complete the request. Please retry.' }; }
}
export const retainerEventsCall = ({accountID,userID,retainerID,body}) => call(body ? 'post':'get', `/retainers/${retainerID}/events/${accountID}/${userID}`,body);
export const duplicatesCall = ({accountID,userID,operation='list',duplicateID,body,customerId,status='open'}) => {
   const suffix=`${accountID}/${userID}`;
   const path=operation==='resolve' ? `/duplicates/${duplicateID}/resolve/${suffix}` : operation==='scan' ? `/duplicates/scan/${suffix}` : `/duplicates/${suffix}`;
   const query=operation==='list' ? `?status=${encodeURIComponent(status)}${customerId ? `&customerId=${encodeURIComponent(customerId)}`:''}` : '';
   return call(operation==='list'?'get':'post',path+query,body);
};
