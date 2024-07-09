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
import { deleteJobType } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DataGridTable from '../../../../Components/DataGrids/DataGrid';

const initialState = {
  accountId: null,
  bookRate: '',
  createdAt: dayjs(),
  createdByUserId: null,
  customerJobCategoryId: null,
  estimatedStraightTime: '',
  isJobTypeActive: null,
  jobDescription: '',
  jobTypeID: ''
};

const selectJobType = jobTypeData => ({
  accountId: jobTypeData.account_id,
  bookRate: jobTypeData.book_rate,
  createdAt: dayjs(jobTypeData.created_at),
  createdByUserId: jobTypeData.created_by_user_id,
  customerJobCategoryId: jobTypeData.customer_job_category_id,
  estimatedStraightTime: jobTypeData.estimated_straight_time,
  isJobTypeActive: jobTypeData.is_job_type_active,
  jobDescription: jobTypeData.job_description,
  jobTypeID: jobTypeData.job_type_id
});

const JobTypeRow = ({ label, value }) => (
  <TableRow>
    <TableCell>{label}</TableCell>
    <TableCell>{value || 'N/A'}</TableCell>
  </TableRow>
);

export default function DeleteJobTypes({ customerData, setCustomerData, jobTypeData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [selectedJobType, setSelectedJobType] = useState(initialState);
  const [postStatus, setPostStatus] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [mappedJobs, setMappedJobs] = useState({ columns: [], rows: [] });

  const { accountJobsList: { activeJobData = [] } = [] } = { ...customerData };

  useEffect(() => {
    if (jobTypeData && Object.keys(jobTypeData).length) {
      const matchedJobRows = activeJobData.grid.rows.filter(job => job.job_type_id === jobTypeData.job_type_id);
      setMappedJobs({ columns: activeJobData.grid.columns, rows: matchedJobRows });
      setSelectedJobType(selectJobType(jobTypeData));
    }
    // eslint-disable-next-line
  }, [jobTypeData]);

  const handleSubmit = () => {
    setIsConfirmationOpen(true);
  };

  const handleConfirmation = async () => {
    setIsConfirmationOpen(false);
    const postedJobType = await deleteJobType(selectedJobType.jobTypeID, accountID, userID);
    setPostStatus(postedJobType);
    if (postedJobType.status === 200) {
      setCustomerData({ ...customerData, jobTypesList: postedJobType.jobTypesList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/jobTypesList');
      setSelectedJobType(initialState);
    }
  };

  const handleCancel = () => {
    setIsConfirmationOpen(false);
  };

  const { jobTypeID, createdAt, createdByUserId, bookRate, estimatedStraightTime, isJobTypeActive, jobDescription } = selectedJobType;

  return (
    <>
      <Box style={{ width: 'fit-content' }}>
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              <JobTypeRow label='Job Type ID:' value={jobTypeID} />
              <JobTypeRow label='Created At:' value={createdAt ? dayjs(createdAt).format('MMMM DD, YYYY') : null} />
              <JobTypeRow label='Created By:' value={createdByUserId} />
              <JobTypeRow label='Book Rate:' value={bookRate} />
              <JobTypeRow label='Estimated Straight Time:' value={estimatedStraightTime} />
              <JobTypeRow label='Is Job Type Active:' value={isJobTypeActive !== null ? String(isJobTypeActive) : null} />
              <JobTypeRow label='Job Description:' value={jobDescription} />
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
