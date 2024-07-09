import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Button, Alert, Box, FormControlLabel, Checkbox } from '@mui/material';
import { postEditJobCategory } from '../../../../Services/ApiCalls/PutCalls';
import { useContext } from 'react';
import { context } from '../../../../App';
import NewJobCategorySelections from '../AddJob/FormSubComponents/NewJobCategory';

const initialState = {
  selectedNewJobCategory: '',
  isJobCategoryActive: true
};

export default function EditJobCategory({ customerData, setCustomerData, jobCategoryData }) {
  const navigate = useNavigate();
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const { account_id, created_at, created_by_user_id, customer_job_category, customer_job_category_id, is_job_category_active } =
    jobCategoryData || {};

  useEffect(() => {
    if (jobCategoryData && Object.keys(jobCategoryData).length) {
      setSelectedItems({
        ...selectedItems,
        selectedNewJobCategory: customer_job_category,
        accountID: account_id,
        customerJobCategoryID: customer_job_category_id,
        createdAt: created_at,
        isJobCategoryActive: is_job_category_active,
        createdByUserID: created_by_user_id
      });
    }
    // eslint-disable-next-line
  }, [jobCategoryData]);

  const handleSubmit = async () => {
    const postedItem = await postEditJobCategory(selectedItems, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, jobCategoriesList: postedItem.jobCategoriesList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/jobCategoriesList');
      setSelectedItems(initialState);
    }
  };

  return (
    <>
      <Stack spacing={3} sx={{ marginTop: '25px' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <NewJobCategorySelections
            customerData={customerData}
            selectedItems={selectedItems}
            setSelectedItems={data => setSelectedItems(data)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedItems.isJobCategoryActive}
                onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isJobCategoryActive: e.target.checked }))}
              />
            }
            label='Active'
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

// account_id,
// created_at,
// created_by_user_id,
// customer_job_category,
// customer_job_category_id,
// is_job_category_active
