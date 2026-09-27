import {useMemo} from 'react';
import {useCustomerChoices} from './CustomerPicker';
import useJobChoices from './useJobChoices';
// Name matching remains an exact match after the bounded server search.
// Suggestions are never silently replaced by an unrelated first result.
export default function useReviewReferences(workspace,entry){
 const name=entry?.company_name || [entry?.first_name,entry?.last_name].filter(Boolean).join(' ');
 const choices=useCustomerChoices(workspace,name,entry?.suggested_customer_id);
 const client=choices.rows.find(c=>entry?.suggested_customer_id?Number(c.customer_id)===Number(entry.suggested_customer_id):c.display_name?.trim().toLowerCase()===name?.trim().toLowerCase());
 const jobs=useJobChoices(client?.customer_id,entry?.billing_entity_id,'',0,entry?.customer_job_id);
 return useMemo(()=>({...workspace,
  customersList:{activeCustomerData:{...workspace?.customersList?.activeCustomerData,activeCustomers:choices.rows,scope:'record'}},
  referencesLoading: choices.loading || jobs.loading,
  referencesError: choices.error || jobs.error,
  accountJobsList:{activeJobData:{activeJobs:jobs.rows}}
 }),[workspace,choices.rows,choices.loading,choices.error,jobs.rows,jobs.loading,jobs.error]);
}
