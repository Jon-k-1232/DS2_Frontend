import React, { useState } from 'react';
import { Button, Alert, Box } from '@mui/material';
import { formObjectForJobPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postNewCustomerJob } from '../../../../Services/ApiCalls/PostCalls';
import { useContext } from 'react';
import { context } from '../../../../App';
import NewJobSelections from './FormSubComponents/NewJobSelections';

const initialState = {
   selectedCustomer: null,
   selectedJobDescription: null,
   isQuote: false,
   quoteAmount: '',
   agreedJobAmount: '',
   notes: ''
};

export default function NewJob({ customerData, setCustomerData, onSuccess, defaultCustomer = null }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = useContext(context).loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   // Pre-fill the customer when the parent form already knows who the job is for —
   // saves the reviewer from re-picking the customer they just selected outside.
   const [selectedItems, setSelectedItems] = useState({ ...initialState, selectedCustomer: defaultCustomer || null });

   const handleSubmit = async () => {
      // Snapshot the existing parent-job IDs for this customer BEFORE posting,
      // so we can identify the newly-created one by diff (more reliable than
      // sorting by created_at — child tracking rows can clutter the list).
      const customerID = selectedItems.selectedCustomer?.customer_id;
      const beforeIds = new Set(
         ((customerData?.accountJobsList?.activeJobData?.activeJobs || [])
            .filter(j => Number(j.customer_id) === Number(customerID) && !j.parent_job_id)
            .map(j => j.customer_job_id))
      );

      const dataToPost = formObjectForJobPost(selectedItems, loggedInUser);
      const postedItem = await postNewCustomerJob(dataToPost, accountID, userID);

      setPostStatus(postedItem);
      if (postedItem.status === 200) {
         const afterJobs = postedItem?.accountJobsList?.activeJobData?.activeJobs || [];
         const newJob = customerID
            ? afterJobs
                 .filter(j => Number(j.customer_id) === Number(customerID) && !j.parent_job_id)
                 .find(j => !beforeIds.has(j.customer_job_id))
            : null;
         resetState(postedItem);
         if (typeof onSuccess === 'function') onSuccess(newJob);
      }
   };

   const resetState = postedItem => {
      setTimeout(() => setPostStatus(null), 2000);
      setSelectedItems(initialState);
      setCustomerData({ ...customerData, accountJobsList: postedItem.accountJobsList });
   };

   return (
      <>
         <Box>
            <Box>
               <NewJobSelections customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} pageName='newJob' />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}
