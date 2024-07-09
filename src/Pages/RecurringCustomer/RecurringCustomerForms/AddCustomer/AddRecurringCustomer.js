import React, { useState } from 'react';
import { Button, Alert, Box } from '@mui/material';
import { formObjectForNewRecurringCustomerPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postNewRecurringCustomer } from '../../../../Services/ApiCalls/PostCalls';
import { useContext } from 'react';
import { context } from '../../../../App';
import RecurringOptions from './FormSubComponents/RecurringOptions';

const initialState = {
  selectedCustomer: null,
  selectedBillingDay: null,
  selectedFrequency: null,
  recurringAmount: '',
  selectedStartDate: ''
};

export default function AddRecurringCustomer({ customerData, setCustomerData }) {
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const handleSubmit = async () => {
    const dataToPost = formObjectForNewRecurringCustomerPost(selectedItems, loggedInUser);
    const postedItem = await postNewRecurringCustomer(dataToPost, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setTimeout(() => setPostStatus(null), 2000);
      setCustomerData({ ...customerData, recurringCustomersList: postedItem.recurringCustomersList });
      setSelectedItems(initialState);
    }
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <RecurringOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

        <Box style={{ textAlign: 'center', marginTop: '18px' }}>
          <Button onClick={handleSubmit}>Submit</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>
      </Box>
    </>
  );
}
