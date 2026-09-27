import {useContext,useEffect,useState} from 'react';
import axios from 'axios';
import {context} from '../../App';
import config from '../../config';
// A new client/business invalidates choices immediately. Aborted and late
// responses never replace the choices for the current selection.
export default function useJobChoices(customerId,entityId,search='',revision=0,selectedId,currentCycle=false){
 const {accountID,userID}=useContext(context).loggedInUser;
 const key=`${accountID}:${userID}:${customerId}:${entityId}:${search}:${revision}:${currentCycle}`;
 const [state,setState]=useState({key:null,rows:[],loading:false,error:''});
 useEffect(()=>{
  if(!customerId)return;
  const controller=new AbortController();setState({key,rows:[],loading:true,error:''});
  const timer=setTimeout(async()=>{
   try{
    const {data}=await axios.get(`${config.API_ENDPOINT}/jobs/getActiveCustomerJobs/${accountID}/${userID}/${customerId}`,{signal:controller.signal,params:{limit:100,search,...(entityId?{entityId}:{}),...(currentCycle?{currentCycle:true}:{})}});
    if(data.status!==200)throw new Error(data.message);
    let rows=data.activeCustomerJobData.activeCustomerJobs;
    if(selectedId && !rows.some(j=>Number(j.customer_job_id)===Number(selectedId))){const {data:detail}=await axios.get(`${config.API_ENDPOINT}/jobs/getSingleJob/${selectedId}/${accountID}/${userID}`,{signal:controller.signal});const row=detail.activeJobData?.activeJobs?.[0];if(row && Number(row.customer_id)===Number(customerId) && (!entityId || !row.billing_entity_id || Number(row.billing_entity_id)===Number(entityId)))rows=[row,...rows];}
    if(!controller.signal.aborted)setState({key,rows,loading:false,error:''});
   }catch(e){if(!controller.signal.aborted)setState({key,rows:[],loading:false,error:e.response?.data?.message||e.message||'Unable to load jobs. Retry the search.'});}
  },search?200:0);
  return()=>{clearTimeout(timer);controller.abort();};
 },[accountID,userID,customerId,entityId,search,revision,selectedId,currentCycle,key]);
 return customerId && state.key===key?state:{rows:[],loading:Boolean(customerId),error:''};
}
