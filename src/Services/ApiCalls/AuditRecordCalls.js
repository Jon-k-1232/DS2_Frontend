import axios from 'axios';
import config from '../../config';
const base = ({customerID,accountID,userID}) => `${config.API_ENDPOINT}/auditRecord/customer/${customerID}/${accountID}/${userID}`;
export const fetchAuditRecord = async (ids, filter) => (await axios.get(base(ids), {params:filter})).data;
export const fetchPrintedRecords = async (ids, offset=0) => (await axios.get(`${base(ids)}/records`, {params:{offset,limit:25}})).data;
export const printAuditRecord = async (ids, range) => (await axios.post(`${base(ids)}/records`,range)).data;
export const verifyAuditRecord = async (ids, recordID) => (await axios.get(`${base(ids)}/records/${recordID}/verify`)).data;
export const openAuditRecord = async (ids, recordID) => {
   const response=await axios.get(`${base(ids)}/records/${recordID}/pdf`,{responseType:'blob'});
   const url=window.URL.createObjectURL(new Blob([response.data],{type:'application/pdf'}));
   const link=document.createElement('a');link.href=url;link.download=`audit-record-${recordID}.pdf`;link.click();
   setTimeout(()=>window.URL.revokeObjectURL(url),60000);
};
