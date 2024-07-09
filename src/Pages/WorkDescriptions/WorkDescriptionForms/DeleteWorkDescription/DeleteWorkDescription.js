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
  Alert
} from '@mui/material';
import { deleteWorkDescription } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const initialState = {
  generalWorkDescriptionID: '',
  generalWorkDescription: '',
  estimatedTime: '',
  isGeneralWorkDescriptionActive: true,
  createdAt: '',
  createdByUserID: ''
};

export default function DeleteWorkDescription({ customerData, setCustomerData, workDescriptionData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID, userID } = loggedInUser;

  const [selectedItems, setSelectedItems] = useState(initialState);
  const [postStatus, setPostStatus] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

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

  const handleSubmit = () => {
    setIsConfirmationOpen(true);
  };

  const handleConfirmation = async () => {
    setIsConfirmationOpen(false);
    const postedJob = await deleteWorkDescription(general_work_description_id, accountID, userID);

    setPostStatus(postedJob);
    if (postedJob.status === 200) {
      setCustomerData({ ...customerData, workDescriptionsList: postedJob.workDescriptionsList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/jobs/workDescriptionsList');
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
              <TableRow>
                <TableCell>Created At:</TableCell>
                <TableCell>{selectedItems.createdAt ? dayjs(selectedItems.createdAt).format('MMMM DD, YYYY') : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Created By:</TableCell>
                <TableCell>{selectedItems.createdByUserID || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Is Work Description Active:</TableCell>
                <TableCell>
                  {selectedItems.isGeneralWorkDescriptionActive !== null ? String(selectedItems.isGeneralWorkDescriptionActive) : 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Estimated Time:</TableCell>
                <TableCell>{selectedItems.estimatedTime || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>General Work Description ID:</TableCell>
                <TableCell>{selectedItems.generalWorkDescriptionID || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>General Work Description:</TableCell>
                <TableCell>{selectedItems.generalWorkDescription || 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box style={{ margin: '10px', textAlign: 'center' }}>
          <Button onClick={handleSubmit}>Delete Work Description</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>

        <Dialog open={isConfirmationOpen} onClose={handleCancel}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent>Are you sure you want to delete this work description?</DialogContent>
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
