import axios from 'axios';
import config from '../../config';
export async function correctionCall(path,method='get',body,key){const {data}=await axios({url:`${config.API_ENDPOINT}${path}`,method,data:body,...(key?{headers:{'Idempotency-Key':key}}:{})});if(data.status>=400)throw new Error(data.message);return data;}
export const correctionError=e=>e.response?.data?.message || e.message || 'Unable to record correction. Please retry.';
export async function correctionPdf(path){const r=await axios.get(`${config.API_ENDPOINT}${path}`,{responseType:'blob'});const url=URL.createObjectURL(r.data),a=document.createElement('a');a.href=url;a.download='correction.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
