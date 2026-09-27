import {deriveViews} from '../Services/listViews';
import { useContext, useEffect, useState, lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import axios from 'axios';
import config from '../config';
import { context } from '../App';
import { validId } from './routePaths';
import { canOpenPage } from './SidebarRoutes';
import SelectionRecovery from '../Components/Workspace/SelectionRecovery';
import PageNavigationHeader from '../Components/PageNavigationHeader/PageNavigationHeader';

















import RouteLoading from './RouteLoading';
const EditTransaction=lazy(()=>import('../Pages/Transactions/TransactionForms/EditTransaction/EditTransaction'));
const DeleteTimeOrCharge=lazy(()=>import('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteTimeOrCharge'));
const DeletePayment=lazy(()=>import('../Pages/Transactions/TransactionForms/DeleteTransaction/DeletePayment'));
const ReversePayment=lazy(()=>import('../Pages/Transactions/TransactionForms/ReversePayment/ReversePayment'));
const DeleteRetainer=lazy(()=>import('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteRetainer'));
const DeleteWriteOff=lazy(()=>import('../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteWriteOff'));
const EditJob=lazy(()=>import('../Pages/Jobs/JobForms/EditJob/EditJob'));
const DeleteJob=lazy(()=>import('../Pages/Jobs/JobForms/DeleteJob/DeleteJob'));
const EditJobTypes=lazy(()=>import('../Pages/Jobs/JobForms/EditJob/EditJobTypes'));
const DeleteJobTypes=lazy(()=>import('../Pages/Jobs/JobForms/DeleteJob/DeleteJobTypes'));
const EditJobCategory=lazy(()=>import('../Pages/Jobs/JobForms/EditJob/EditJobCategory'));
const DeleteJobCategory=lazy(()=>import('../Pages/Jobs/JobForms/DeleteJob/DeleteJobCategory'));
const EditWorkDescription=lazy(()=>import('../Pages/WorkDescriptions/WorkDescriptionForms/EditWorkDescription/EditWorkDescription'));
const DeleteWorkDescription=lazy(()=>import('../Pages/WorkDescriptions/WorkDescriptionForms/DeleteWorkDescription/DeleteWorkDescription'));
const EditUser=lazy(()=>import('../Pages/Account/AccountForms/EditAccount/EditUser'));
const DeleteUser=lazy(()=>import('../Pages/Account/AccountForms/DeleteUser/DeleteUser'));

const types = {
 transaction: {base:'/work/entries', label:'Transaction', prop:'transactionData', key:'transaction_id', url:(a,u,id,c)=>`/transactions/getSingleTransaction/${c}/${id}/${a}/${u}`, pick:d=>d.activeTransactionsData?.transactionData?.[0], edit:EditTransaction, delete:DeleteTimeOrCharge},
 payment: {base:'/payments/receipts/legacy', label:'Payment', prop:'paymentData', key:'payment_id', url:(a,u,id)=>`/payments/getSinglePayment/${id}/${a}/${u}`, pick:d=>d.activePaymentData?.activePayments?.[0], delete:DeletePayment, reverse:ReversePayment},
 retainer: {base:'/payments/retainers', label:'Retainer', prop:'retainerData', key:'retainer_id', url:(a,u,id)=>`/retainers/getSingleRetainer/${id}/${a}/${u}`, pick:d=>d.activeRetainerData?.activeRetainer?.[0], delete:DeleteRetainer},
 writeoff: {base:'/receivables/write-offs', label:'Write Off', prop:'writeOffData', key:'writeoff_id', url:(a,u,id)=>`/writeOffs/getSingleWriteOff/${id}/${a}/${u}`, pick:d=>d.activeWriteOffsData?.activeWriteOffs?.[0], delete:DeleteWriteOff},
 job: {base:'/work/jobs', label:'Job', prop:'jobData', key:'customer_job_id', url:(a,u,id)=>`/jobs/getSingleJob/${id}/${a}/${u}`, pick:d=>d.activeJobData?.activeJobs?.[0], edit:EditJob, delete:DeleteJob},
 jobType: {base:'/settings/job-types', label:'Job Type', prop:'jobTypeData', key:'job_type_id', url:(a,u,id)=>`/jobTypes/getSingleJobType/${id}/${a}/${u}`, pick:d=>d.activeJobData?.activeJobs?.[0], edit:EditJobTypes, delete:DeleteJobTypes},
 jobCategory: {base:'/settings/job-categories', label:'Job Category', prop:'jobCategoryData', key:'customer_job_category_id', url:(a,u,id)=>`/jobCategories/getSingleJobCategory/${id}/${a}/${u}`, pick:d=>d.activeJobCategoriesData?.activeJobCategory?.[0], edit:EditJobCategory, delete:DeleteJobCategory},
 workDescription: {base:'/settings/work-descriptions', label:'Work Description', prop:'workDescriptionData', key:'general_work_description_id', url:(a,u,id)=>`/workDescriptions/getSingleWorkDescription/${id}/${a}/${u}`, pick:d=>d.activeWorkDescriptionData?.workDescriptionData?.[0], edit:EditWorkDescription, delete:DeleteWorkDescription},
 user: {base:'/settings/users', label:'User', prop:'userData', key:'user_id', url:(a,u,id)=>`/user/fetchSingleUser/${a}/${id}`, pick:d=>d.activeUserData?.activeUser, edit:EditUser, delete:DeleteUser}
};

export default function RecordPage({ kind, customerData, setCustomerData }) {
 const {recordId, customerId, action} = useParams();
 const {loggedInUser} = useContext(context);
 const {accountID,userID} = loggedInUser;
 const spec = types[kind];
 const [result,setResult] = useState(null), [retry,setRetry] = useState(0);
 const requestKey = `${kind}:${accountID}:${userID}:${customerId}:${recordId}`;
 const permitted = canOpenPage(loggedInUser, kind==='user'?'super':kind==='writeoff' || (kind==='payment' && action==='reverse')?'admin':'manager');
 const valid = validId(recordId) && (kind!=='transaction' || validId(customerId));
 useEffect(()=>{
  if(!valid || !permitted) return;
  const controller = new AbortController();
  setResult(null);
  const load=async()=>{
   try {
    const {data} = await axios.get(config.API_ENDPOINT+spec.url(accountID,userID,recordId,customerId),{signal:controller.signal});
    const row=spec.pick(data);
    if((data.status && data.status!==200) || !row || Number(row[spec.key])!==Number(recordId)) throw new Error(data.message || 'Record not found. It may have been removed or is outside your account.');
    let profile, references={};
    if(row.customer_id){
      const {data:client}=await axios.get(`${config.API_ENDPOINT}/customer/lookup/${accountID}/${userID}`,{signal:controller.signal,params:{customerId:row.customer_id}});
      references.customers=client.customers || [];
    }
    const jobId=row.customer_job_id;
    if(jobId && kind!=='job'){
      const {data:job}=await axios.get(`${config.API_ENDPOINT}/jobs/getSingleJob/${jobId}/${accountID}/${userID}`,{signal:controller.signal});
      references.jobs=job.activeJobData?.activeJobs || [];
    }
    if(kind==='job')references.jobs=[row];
    if(row.retainer_id && kind!=='retainer'){const {data:retainer}=await axios.get(`${config.API_ENDPOINT}/retainers/getSingleRetainer/${row.retainer_id}/${accountID}/${userID}`,{signal:controller.signal});references.retainers=retainer.activeRetainerData?.activeRetainer || [];}

    if(kind==='payment'){
      const {data:invoices}=await axios.get(`${config.API_ENDPOINT}/customer/activeCustomers/customerByID/${accountID}/${userID}/${row.customer_id}`,{signal:controller.signal,params:{section:'invoices',...(row.billing_entity_id?{entityId:row.billing_entity_id}:{})}});
      if(invoices.status && invoices.status!==200)throw new Error(invoices.message || 'Unable to load invoice choices.');
      profile={...invoices,customerJobData:{customerJobs:references.jobs || []},customerRetainerData:{customerRetainers:references.retainers || []}};
    }
    if(!controller.signal.aborted)setResult({key:requestKey,row,profile,references});
   } catch(e) { if(!controller.signal.aborted)setResult({key:requestKey,error:e.response?.data?.message || e.message || 'Unable to load this record. Try again.'}); }
  };
  load();return()=>controller.abort();
 },[valid,permitted,spec,accountID,userID,recordId,customerId,kind,requestKey,retry]);
 if(!permitted)return <Alert severity='info'>Only admins may apply write-offs and adjustments. You can view the records from the list.</Alert>;
 if(!valid || !['edit','delete','reverse'].includes(action) || !spec[action])return <SelectionRecovery/>;
 if(!result || result.key!==requestKey)return <Stack role='status' sx={{p:3}}>Loading record…</Stack>;
 if(result.error)return <Stack spacing={2} sx={{p:3}}><Alert severity='error'>{result.error}</Alert><Button onClick={()=>setRetry(x=>x+1)}>Try again</Button><Button component={Link} to={spec.base}>Back to list</Button></Stack>;
 if(kind==='payment' && result.row.receipt_id)return <Navigate replace to={`/payments/receipts/${result.row.receipt_id}`}/>;
 const base=`${spec.base}/${kind==='transaction'?customerId+'/':''}${recordId}`;
 const locked = kind==='transaction' && (result.row.sent_locked || result.row.recurring_plan_id);
 const menuOptions=['edit','delete','reverse'].filter(a=>spec[a] && !(locked && a==='edit') && (a!=='reverse' || canOpenPage(loggedInUser,'admin'))).map(a=>({value:a,display:a==='reverse'?'Reverse Payment (NSF)':`${a==='edit'?'Edit':'Delete'} ${spec.label}`,route:`${base}/${a}`}));
 if(locked && action==='edit')return <Alert severity='info'>This work is locked. Use its invoice correction or recurring plan controls.</Alert>;
 const Form=spec[action];
 const references=result.references||{};
 const recordData=deriveViews({...customerData,
   customersList:{activeCustomerData:{...customerData?.customersList?.activeCustomerData,scope:'record',activeCustomers:[...(references.customers||[]),...(customerData?.customersList?.activeCustomerData?.activeCustomers||[]).filter(c=>!references.customers?.some(r=>r.customer_id===c.customer_id))]}},
   accountJobsList:{activeJobData:{activeJobs:references.jobs||[]}},
   accountRetainersList:{activeRetainerData:{activeRetainers:[...(references.retainers||[]),...(customerData?.accountRetainersList?.activeRetainerData?.activeRetainers||[]).filter(r=>!references.retainers?.some(t=>t.retainer_id===r.retainer_id))]}}
 });
 return <Stack spacing={2}><PageNavigationHeader menuOptions={menuOptions}/><Suspense fallback={<RouteLoading/>}><Form key={`${requestKey}:${action}`} {...{customerData:recordData,setCustomerData,[spec.prop]:result.row,customerProfileData:result.profile}}/></Suspense></Stack>;
}
