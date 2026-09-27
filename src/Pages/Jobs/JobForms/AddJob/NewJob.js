import EntityPicker from '../../../../Components/BillingEntities/EntityPicker';
import React, { useState, useRef } from 'react';
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

   const flight=useRef(false);
   const [busy,setBusy]=useState(false);
   const [postStatus, setPostStatus] = useState(null);
   // Pre-fill the customer when the parent form already knows who the job is for —
   // saves the reviewer from re-picking the customer they just selected outside.
   const [selectedItems, setSelectedItems] = useState({ ...initialState, selectedCustomer: defaultCustomer || null });

   const handleSubmit = async () => {
    if(flight.current)return;
    if (!selectedItems.entityId) { setPostStatus({status:400,message:'Choose a billing business.'}); return; }
      flight.current=true;setBusy(true);
      try {
      const dataToPost = formObjectForJobPost(selectedItems, loggedInUser);
      const postedItem = await postNewCustomerJob(dataToPost, accountID, userID);

      setPostStatus(postedItem);
      if (postedItem.status === 200) {
         const newJob = postedItem.changed?.jobs?.[0] || null;
         resetState(postedItem);
         if (typeof onSuccess === 'function') onSuccess(newJob);
      }
      }catch(e){setPostStatus({status:500,message:e.message||'Unable to save job. Check the list before retrying.'});}finally{flight.current=false;setBusy(false);}
   };

   const resetState = postedItem => {
      setTimeout(() => setPostStatus(null), 2000);
      setSelectedItems(initialState);
      setCustomerData({ ...customerData, accountJobsList: postedItem.accountJobsList });
   };

   return (
      <>
      <EntityPicker value={selectedItems.entityId} customerId={selectedItems.selectedCustomer?.customer_id} onChange={entityId=>setSelectedItems(prev=>({...prev,entityId}))} />
         <Box>
            <Box>
               <NewJobSelections customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} pageName='newJob' />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
               <Button disabled={busy} onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}
