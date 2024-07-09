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

export default function NewJob({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = useContext(context).loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const handleSubmit = async () => {
      const dataToPost = formObjectForJobPost(selectedItems, loggedInUser);
      const postedItem = await postNewCustomerJob(dataToPost, accountID, userID);

      setPostStatus(postedItem);
      if (postedItem.status === 200) resetState(postedItem);
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
