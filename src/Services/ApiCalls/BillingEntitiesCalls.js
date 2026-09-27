import axios from 'axios';
import config from '../../config';
export async function entitiesCall(path='',method='get',body,options={}) {
   const response=await axios({url:`${config.API_ENDPOINT}/billing-entities${path}`,method,data:body,...options});
   if(response.data?.status>=400)throw new Error(response.data.message);
   return response.data;
}
export const entityError=e=>e.response?.data?.message || e.message || 'Unable to load businesses. Please retry.';
