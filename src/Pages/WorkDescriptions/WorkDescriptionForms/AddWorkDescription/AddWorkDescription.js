import React, { useState, useContext } from 'react';
import { Box, Button, Alert } from '@mui/material';
import WorkDescriptionOptions from '../WorkDescriptionSubComponents/WorkDescriptionOptions';
import { postWorkDescription } from '../../../../Services/ApiCalls/PostCalls';
import { context } from '../../../../App';

const initialState = {
  estimatedTime: '',
  generalWorkDescription: '',
  isGeneralWorkDescriptionActive: true
};

export default function AddWorkDescription({ customerData, setCustomerData }) {
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const handleSubmit = async () => {
    const postedItem = await postWorkDescription(selectedItems, accountID, userID);

    setPostStatus();
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, workDescriptionsList: postedItem.workDescriptionsList });
      setSelectedItems(initialState);
      setTimeout(() => setPostStatus(null), 2000);
    }
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <WorkDescriptionOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

        <Box style={{ textAlign: 'center' }}>
          <Button onClick={handleSubmit}>Submit</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>
      </Box>
    </>
  );
}
