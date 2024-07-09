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
  TableContainer,
  TableRow,
  Alert,
  Typography,
  Divider
} from '@mui/material';
import { deleteJob } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DataGridTable from '../../../../Components/DataGrids/DataGrid';

const initialState = {
  accountID: null,
  createdAt: dayjs(),
  createdByUserID: null,
  customerID: null,
  customerJobID: null,
  isJobComplete: null,
  isQuote: null,
  jobQuoteAmount: '',
  jobTypeID: '',
  notes: ''
};

export default function DeleteJob({ customerData, setCustomerData, jobData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [selectedJob, setSelectedJob] = useState(initialState);
  const [postStatus, setPostStatus] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [mappedWriteOffs, setMappedWriteOffs] = useState({ columns: [], rows: [] });
  const [mappedTransactions, setMappedTransactions] = useState({ columns: [], rows: [] });

  const {
    teamMembersList: { activeUserData: { activeUsers } = [] } = [],
    customersList: { activeCustomerData: { activeCustomers } = [] } = [],
    jobTypesList: { activeJobTypesData: { jobTypesData } = [] } = [],
    transactionsList: { activeTransactionsData = [] } = [],
    writeOffsList: { activeWriteOffsData = [] } = []
  } = { ...customerData };

  const {
    account_id,
    created_at,
    created_by_user_id,
    customer_id,
    customer_job_id,
    is_job_complete,
    is_quote,
    job_quote_amount,
    job_type_id,
    notes
  } = jobData || {};

  useEffect(() => {
    if (jobData && Object.keys(jobData).length) {
      const foundUser = activeUsers.find(user => user.user_id === created_by_user_id);
      const foundCustomer = activeCustomers.find(customer => customer.customer_id === customer_id);
      const foundJobType = jobTypesData.find(type => type.job_type_id === job_type_id);

      const newWriteOffRows = activeWriteOffsData.grid.rows.filter(writeOff => writeOff.customer_job_id === customer_job_id);
      const newTransactionRows = activeTransactionsData.grid.rows.filter(transaction => transaction.customer_job_id === customer_job_id);
      setMappedWriteOffs({ columns: activeWriteOffsData.grid.columns, rows: newWriteOffRows });
      setMappedTransactions({ columns: activeTransactionsData.grid.columns, rows: newTransactionRows });

      setSelectedJob({
        accountID: account_id,
        createdAt: dayjs(created_at),
        createdByUserID: foundUser ? foundUser.display_name : null,
        customerID: foundCustomer ? foundCustomer.display_name : null,
        customerJobID: customer_job_id,
        isJobComplete: is_job_complete,
        isQuote: is_quote,
        jobQuoteAmount: job_quote_amount,
        jobTypeID: foundJobType ? foundJobType.job_description : null,
        notes
      });
    }
    // eslint-disable-next-line
  }, [jobData]);

  const handleSubmit = () => {
    setIsConfirmationOpen(true);
  };

  const handleConfirmation = async () => {
    setIsConfirmationOpen(false);
    const postedJob = await deleteJob(customer_job_id, accountID, userID);

    setPostStatus(postedJob);
    if (postedJob.status === 200) {
      setCustomerData({ ...customerData, accountJobsList: postedJob.accountJobsList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/jobsList');
      setSelectedJob(initialState);
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
              <TableRow>
                <TableCell>Created At:</TableCell>
                <TableCell>{selectedJob.createdAt ? dayjs(selectedJob.createdAt).format('MMMM DD, YYYY') : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Created By:</TableCell>
                <TableCell>{selectedJob.createdByUserID || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Is Job Complete:</TableCell>
                <TableCell>{selectedJob.isJobComplete !== null ? String(selectedJob.isJobComplete) : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Job Quote Amount:</TableCell>
                <TableCell>{selectedJob.jobQuoteAmount || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Job Type ID:</TableCell>
                <TableCell>{selectedJob.jobTypeID || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Notes:</TableCell>
                <TableCell>{selectedJob.notes || 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box style={{ margin: '10px', textAlign: 'center' }}>
          <Button disabled={mappedWriteOffs.rows.length > 0 || mappedTransactions.rows.length > 0} onClick={handleSubmit}>
            Delete Job
          </Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>

        {mappedWriteOffs.rows.length > 0 ||
          (mappedTransactions.rows.length > 0 && (
            <Box style={{ width: '100vh' }}>
              <Typography variant='h6' style={{ color: 'red' }}>
                Before deletion, please re-parent the following items:
              </Typography>

              <Divider />

              {mappedWriteOffs.rows.length > 0 && (
                <Box style={{ margin: '20px 0px' }}>
                  <DataGridTable
                    title='Linked Write Offs'
                    tableData={mappedWriteOffs}
                    passedHeight='350px'
                    enableSingleRowClick
                    routeToPass={'/transactions/customerWriteOffs/editWriteOff'}
                  />
                </Box>
              )}
              <Box style={{ margin: '20px 0px' }}>
                {mappedTransactions.rows.length > 0 && (
                  <DataGridTable
                    title='Linked Transactions'
                    tableData={mappedTransactions}
                    passedHeight='350px'
                    enableSingleRowClick
                    routeToPass={'/transactions/customerTransactions/editTransaction'}
                  />
                )}
              </Box>
            </Box>
          ))}

        <Dialog open={isConfirmationOpen} onClose={handleCancel}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent>Are you sure you want to delete this job?</DialogContent>
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
