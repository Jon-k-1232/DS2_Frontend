import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {context} from '../../../App';
import {fetchPendingPayments} from '../../../Services/ApiCalls/PendingPaymentsCalls';

export default function usePendingPaymentList({status,paginationModel,month,year}) {
 const {loggedInUser:{accountID,userID,token}}=useContext(context);
 const [rows,setRows]=useState([]),[totalCount,setTotalCount]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const revision=useRef(0),{page,pageSize}=paginationModel;
 const loadData=useCallback(async()=>{
  const current=++revision.current;
  // Keep the last count while loading so the grid does not reset a later page.
  setRows([]);setError('');
  if(!accountID || !userID || !token || (status==='processed' && (!month || !year))){setLoading(false);return;}
  setLoading(true);
  try {
   const response=await fetchPendingPayments(accountID,userID,token,{page:page+1,limit:pageSize,status,...(month?{month,year}:{})});
   if(response?.status>=400 || !Array.isArray(response?.payments))throw new Error('Payment list unavailable');
   if(current!==revision.current)return;
   setRows(response.payments);setTotalCount(response.pagination?.totalItems || 0);
  } catch (_) {
   if(current===revision.current)setError('Payments could not be loaded. Reload the list to try again.');
  } finally {if(current===revision.current)setLoading(false);}
 },[accountID,userID,token,status,page,pageSize,month,year]);
 const cancelPending=useCallback(()=>{revision.current++;},[]);
 useEffect(()=>{loadData();return cancelPending;},[loadData,cancelPending]);
 return {rows,totalCount,loading,error,loadData};
}
