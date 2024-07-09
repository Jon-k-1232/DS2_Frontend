import React, { useState } from 'react';
import { Stack, Button, Alert, Box } from '@mui/material';
import { formObjectForJobTypePost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postNewJobType } from '../../../../Services/ApiCalls/PostCalls';
import { useContext } from 'react';
import { context } from '../../../../App';
import NewJobDescriptionSelections from './FormSubComponents/NewJobDescriptionSelections';

const initialState = {
  jobDescription: '',
  customerJobCategory: null,
  bookRate: '',
  estimatedStraightTime: ''
};

export default function NewJobType({ customerData, setCustomerData }) {
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const handleSubmit = async () => {
    const dataToPost = formObjectForJobTypePost(selectedItems, loggedInUser);
    const postedItem = await postNewJobType(dataToPost, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) resetState(postedItem);
  };

  const resetState = postedItem => {
    setCustomerData({ ...customerData, jobTypesList: postedItem.jobTypesList });
    setTimeout(() => setPostStatus(null), 4000);
    setSelectedItems(initialState);
  };

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <NewJobDescriptionSelections
            customerData={customerData}
            selectedItems={selectedItems}
            setSelectedItems={data => setSelectedItems(data)}
          />
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Button onClick={handleSubmit}>Submit</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>
      </Stack>
    </>
  );
}
