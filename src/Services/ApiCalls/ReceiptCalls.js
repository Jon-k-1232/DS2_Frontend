import axios from 'axios';
import config from '../../config';
export async function receiptCall(path,method='get',body,key){
 const {data}=await axios({url:`${config.API_ENDPOINT}/payments${path}`,method,data:body,...(key?{headers:{'Idempotency-Key':key}}:{})});
 if(data.status>=400)throw new Error(data.message);return data;
}
export const receiptError=e=>e.response?.data?.message || e.message || 'Unable to save the payment. Please retry.';

export async function creditCall(path,method='get',body,key){const {data}=await axios({url:`${config.API_ENDPOINT}/credits${path}`,method,data:body,...(key?{headers:{'Idempotency-Key':key}}:{})});if(data.status>=400)throw new Error(data.message);return data;}
