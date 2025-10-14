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
  TableContainer
} from '@mui/material';
import { deleteUser } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const initialState = {
  userDisplayName: '',
  userEmail: '',
  costRate: 0,
  billingRate: 0,
  role: '',
  accessLevel: '',
  userLoginName: '',
  userLoginPassword: '',
  isUserActive: true
};

export default function DeleteUser({ customerData, setCustomerData, userData }) {
  const navigate = useNavigate();
  const { loggedInUser } = useContext(context);
  const { accountID } = loggedInUser;

  const [selectedUser, setSelectedUser] = useState(initialState);
  const [postStatus, setPostStatus] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  useEffect(() => {
    if (userData && Object.keys(userData).length) {
      setSelectedUser({
        accountID: userData.account_id,
        userID: userData.user_id,
        createdAt: userData.created_at,
        isUserActive: userData.is_user_active,
        userDisplayName: userData.display_name,
        userEmail: userData.email,
        costRate: userData.cost_rate,
        billingRate: userData.billing_rate,
        role: userData.job_title,
        accessLevel: userData.access_level
      });
    }
    // eslint-disable-next-line
  }, [userData]);

  const handleSubmit = () => setIsConfirmationOpen(true);

  const handleConfirmation = async () => {
    setIsConfirmationOpen(false);
    const postedItem = await deleteUser(selectedUser.userID, accountID);
    setPostStatus(postedItem);

    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, teamMembersList: postedItem.teamMembersList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/account/accountUsers');
      setSelectedUser(initialState);
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
                <TableCell>{selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('MMMM DD, YYYY') : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>User ID:</TableCell>
                <TableCell>{selectedUser.userID || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Is User Active:</TableCell>
                <TableCell>{selectedUser.isUserActive !== null ? String(selectedUser.isUserActive) : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>User Display Name:</TableCell>
                <TableCell>{selectedUser.userDisplayName || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>User Email:</TableCell>
                <TableCell>{selectedUser.userEmail || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cost Rate:</TableCell>
                <TableCell>{selectedUser.costRate || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Billing Rate:</TableCell>
                <TableCell>{selectedUser.billingRate || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Role:</TableCell>
                <TableCell>{selectedUser.role || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Access Level:</TableCell>
                <TableCell>{selectedUser.accessLevel || 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Box style={{ margin: '10px', textAlign: 'center' }}>
          <Button onClick={handleSubmit}>Delete User</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>

        <Dialog open={isConfirmationOpen} onClose={handleCancel}>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogContent style={{ color: 'red', fontWeight: 'bold' }}>
            Caution: If the user has entered any data, it is recommended to deactivate the user rather than delete them.
          </DialogContent>
          <DialogContent sx={{ alignSelf: 'center' }}>Are you sure you want to delete this user?</DialogContent>
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
