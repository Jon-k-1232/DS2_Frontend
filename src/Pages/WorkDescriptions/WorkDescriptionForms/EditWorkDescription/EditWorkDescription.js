import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Alert } from '@mui/material';
import WorkDescriptionOptions from '../WorkDescriptionSubComponents/WorkDescriptionOptions';
import { postEditWorkDescriptions } from '../../../../Services/ApiCalls/PutCalls';
import { context } from '../../../../App';

const initialState = {
  estimatedTime: '',
  generalWorkDescription: '',
  isGeneralWorkDescriptionActive: true
};

export default function EditWorkDescription({ customerData, setCustomerData, workDescriptionData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const {
    account_id,
    created_at,
    created_by_user_id,
    estimated_time,
    general_work_description,
    general_work_description_id,
    is_general_work_description_active
  } = workDescriptionData || {};

  useEffect(() => {
    if (workDescriptionData && Object.keys(workDescriptionData).length) {
      setSelectedItems({
        ...selectedItems,
        accountID: account_id,
        generalWorkDescriptionID: general_work_description_id,
        generalWorkDescription: general_work_description,
        estimatedTime: estimated_time,
        isGeneralWorkDescriptionActive: is_general_work_description_active,
        createdAt: created_at,
        createdByUserID: created_by_user_id
      });
    }
    // eslint-disable-next-line
  }, [workDescriptionData]);

  const handleSubmit = async () => {
    const postedItem = await postEditWorkDescriptions(selectedItems, accountID, userID);
    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, workDescriptionsList: postedItem.workDescriptionsList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/workDescriptionsList');
      setSelectedItems(initialState);
    }
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <WorkDescriptionOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

        <Box style={{ textAlign: 'center', marginTop: '18px' }}>
          <Button onClick={handleSubmit}>Submit</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>
      </Box>
    </>
  );
}
