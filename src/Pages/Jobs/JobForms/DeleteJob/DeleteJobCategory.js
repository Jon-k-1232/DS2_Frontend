import React, { useState, useContext, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert,
  Divider,
  Typography,
  TableContainer
} from '@mui/material';
import { deleteJobCategory } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DataGridTable from '../../../../Components/DataGrids/DataGrid';

const initialState = {
  selectedNewJobCategory: '',
  isJobCategoryActive: true
};

const JobTypeRow = ({ label, value }) => (
  <TableRow>
    <TableCell>{label}</TableCell>
    <TableCell>{value || 'N/A'}</TableCell>
  </TableRow>
);

export default function DeleteJobCategory({ customerData, setCustomerData, jobCategoryData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [selectedItems, setSelectedItems] = useState(initialState);
  const [postStatus, setPostStatus] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [mappedJobs, setMappedJobs] = useState({ columns: [], rows: [] });

  const { accountJobsList: { activeJobData = [] } = [] } = { ...customerData };
  const { account_id, created_at, created_by_user_id, customer_job_category, customer_job_category_id, is_job_category_active } =
    jobCategoryData || {};
  const { selectedNewJobCategory, customerJobCategoryID, createdAt, isJobCategoryActive, createdByUserID } = selectedItems;

  useEffect(() => {
    if (jobCategoryData && Object.keys(jobCategoryData).length) {
      const matchedJobRows = activeJobData.grid.rows.filter(job => job.customer_job_category_id === customer_job_category_id);
      setMappedJobs({ columns: activeJobData.grid.columns, rows: matchedJobRows });

      setSelectedItems({
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

  const handleSubmit = () => {
    setIsConfirmationOpen(true);
  };

  const handleConfirmation = async () => {
    setIsConfirmationOpen(false);
    const postedItem = await deleteJobCategory(customerJobCategoryID, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, jobCategoriesList: postedItem.jobCategoriesList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/jobCategoriesList');
      setSelectedItems(initialState);
    }
  };

  const handleCancel = () => {
    setIsConfirmationOpen(false);
  };

  return (
    <>
      <Box style={{ width: 'fit-content' }}>
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              <JobTypeRow label='Job Category:' value={selectedNewJobCategory} />
              <JobTypeRow label='Job Category ID:' value={customerJobCategoryID} />
              <JobTypeRow label='Created At:' value={createdAt ? dayjs(createdAt).format('MMMM DD, YYYY') : null} />
              <JobTypeRow label='Is Job Category Active:' value={isJobCategoryActive !== null ? String(isJobCategoryActive) : null} />
              <JobTypeRow label='Created By User ID:' value={createdByUserID} />
            </TableBody>
          </Table>
        </TableContainer>

        <Box style={{ margin: '10px', textAlign: 'center' }}>
          <Button disabled={mappedJobs.rows.length > 0} onClick={handleSubmit}>
            Delete Job Type
          </Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>

        {mappedJobs.rows.length > 0 && (
          <Box style={{ width: '100vh' }}>
            <Typography variant='h6' style={{ color: 'red' }}>
              Before deletion, please re-parent the following items:
            </Typography>

            <Divider />

            <Box style={{ margin: '20px 0px' }}>
              <DataGridTable
                title='Linked Jobs'
                tableData={mappedJobs}
                passedHeight='350px'
                enableSingleRowClick
                routeToPass={'/jobs/jobsList/editJob'}
              />
            </Box>
          </Box>
        )}

        <Dialog open={isConfirmationOpen} onClose={handleCancel}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent>Are you sure you want to delete this job type?</DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleConfirmation} color='error'>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
