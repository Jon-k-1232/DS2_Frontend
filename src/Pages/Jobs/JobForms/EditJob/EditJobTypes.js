import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Button, Alert, Box } from '@mui/material';
import { formObjectForJobTypePost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postEditJobType } from '../../../../Services/ApiCalls/PutCalls';
import { useContext } from 'react';
import { context } from '../../../../App';
import NewJobDescriptionSelections from '../AddJob/FormSubComponents/NewJobDescriptionSelections';

const initialState = {
  jobDescription: '',
  customerJobCategory: null,
  bookRate: '',
  estimatedStraightTime: ''
};

export default function EditJobTypes({ customerData, setCustomerData, jobTypeData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const { jobCategoriesList: { activeJobCategoriesData: { activeJobCategories } = [] } = [] } = { ...customerData };

  const {
    account_id,
    book_rate,
    created_at,
    created_by_user_id,
    customer_job_category_id,
    estimated_straight_time,
    is_job_type_active,
    job_description,
    job_type_id
  } = jobTypeData || {};

  useEffect(() => {
    if (jobTypeData && Object.keys(jobTypeData).length) {
      setSelectedItems({
        ...selectedItems,
        jobDescription: job_description,
        customerJobCategory: activeJobCategories.find(category => category.customer_job_category_id === customer_job_category_id),
        bookRate: book_rate,
        estimatedStraightTime: estimated_straight_time,
        accountID: account_id,
        jobTypeID: job_type_id,
        createdAt: created_at,
        isJobTypeActive: is_job_type_active,
        createdByUserID: created_by_user_id
      });
    }
    // eslint-disable-next-line
  }, [jobTypeData]);

  const handleSubmit = async () => {
    const dataToPost = formObjectForJobTypePost(selectedItems, loggedInUser);
    const postedItem = await postEditJobType(dataToPost, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, jobTypesList: postedItem.jobTypesList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/jobTypesList');
      setSelectedItems(initialState);
    }
  };

  return (
    <>
      <Box spacing={3} sx={{ marginTop: '25px' }}>
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
      </Box>
    </>
  );
}
