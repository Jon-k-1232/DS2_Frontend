import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
   Alert,
   Autocomplete,
   Box,
   CircularProgress,
   IconButton,
   Paper,
   Stack,
   TextField,
   Tooltip,
   Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { context } from '../../../App';
import {
   fetchTimeTrackerStaffSettings,
   addTimeTrackerStaffMembers,
   updateTimeTrackerStaffMember
} from '../../../Services/ApiCalls/TimeTrackingCalls';
import DeleteIcon from '@mui/icons-material/Delete';

const policyNote = 'Users can only submit their own time tracker files.';

const TimeTrackingSettings = () => {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser || {};
   const parsedAccountID = Number(accountID);
   const parsedUserID = Number(userID);

   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [availableUsers, setAvailableUsers] = useState([]);
   const [staffRecords, setStaffRecords] = useState([]);
   const [selectedUserIds, setSelectedUserIds] = useState([]);
   const [feedback, setFeedback] = useState({ type: null, message: '' });
   const [pendingAdd, setPendingAdd] = useState(null);

   const loadData = useCallback(async () => {
      const missingAccount = !accountID || accountID === 'undefined' || accountID === 'null';
      const missingUser = !userID || userID === 'undefined' || userID === 'null';

      if (missingAccount || missingUser) {
         setFeedback({ type: 'error', message: 'Missing account context. Please log in again.' });
         setLoading(false);
         return;
      }

      try {
         setLoading(true);
         if (!Number.isFinite(parsedAccountID) || !Number.isFinite(parsedUserID)) {
            setFeedback({ type: 'error', message: 'Invalid user session detected. Please sign out and sign back in.' });
            setLoading(false);
            return;
         }

         const data = await fetchTimeTrackerStaffSettings(parsedAccountID, parsedUserID, token);
         setAvailableUsers(data?.availableUsers || []);
         setStaffRecords(data?.staff || []);
         setSelectedUserIds((data?.activeStaffUserIds || []).map(id => Number(id)));
         setFeedback({ type: null, message: '' });
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to load time tracker staff.';
         setFeedback({ type: 'error', message });
      } finally {
         setLoading(false);
      }
   }, [accountID, parsedAccountID, parsedUserID, token, userID]);

   useEffect(() => {
      loadData();
   }, [loadData]);

   const activeStaffRows = useMemo(
      () =>
         staffRecords
            .filter(member => member.is_active)
            .map(member => ({
               id: member.id,
               name: member.display_name,
               email: member.email
            })),
      [staffRecords]
   );

   const addableUsers = useMemo(
      () => availableUsers.filter(user => !selectedUserIds.includes(user.user_id)),
      [availableUsers, selectedUserIds]
   );

   const handleRemoveMember = useCallback(
      async row => {
         try {
            setSaving(true);
            await updateTimeTrackerStaffMember(parsedAccountID, parsedUserID, row.id, false, token);
            await loadData();
            setFeedback({ type: 'success', message: `${row.name} removed from time tracker staff.` });
         } catch (error) {
            const message = error?.response?.data?.message || 'Unable to update time tracker staff.';
            setFeedback({ type: 'error', message });
         } finally {
            setSaving(false);
         }
      },
      [loadData, parsedAccountID, parsedUserID, token]
   );

   const staffColumns = useMemo(
      () => [
         { field: 'name', headerName: 'Name', flex: 1, sortable: false },
         { field: 'email', headerName: 'Email', flex: 1, sortable: false },
         {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: params => (
               <Tooltip title='Remove from Time Tracker Staff'>
                  <span>
                     <IconButton
                        size='small'
                        color='error'
                        disabled={saving}
                        onClick={() => handleRemoveMember(params.row)}
                     >
                        <DeleteIcon fontSize='small' />
                     </IconButton>
                  </span>
               </Tooltip>
            )
         }
      ],
      [handleRemoveMember, saving]
   );

   const handleAddMember = useCallback(
      async (_, newValue) => {
         if (!newValue) {
            setPendingAdd(null);
            return;
         }

         setPendingAdd(newValue);
         try {
            setSaving(true);
            await addTimeTrackerStaffMembers(parsedAccountID, parsedUserID, [newValue.user_id], token);
            await loadData();
            setFeedback({ type: 'success', message: `${newValue.display_name} added to time tracker staff.` });
         } catch (error) {
            const message = error?.response?.data?.message || 'Unable to update time tracker staff.';
            setFeedback({ type: 'error', message });
         } finally {
            setSaving(false);
            setPendingAdd(null);
         }
      },
      [loadData, parsedAccountID, parsedUserID, token]
   );

   return (
      <Stack spacing={3}>
         <Paper
            sx={{
               p: 4,
               display: 'flex',
               flexDirection: 'column',
               gap: 3
            }}
         >
            <Typography variant='h5'>Time Tracker Staff</Typography>

            <Autocomplete
               fullWidth
               options={addableUsers}
               getOptionLabel={option => option.display_name}
               value={pendingAdd}
               onChange={handleAddMember}
               disabled={loading || saving || !addableUsers.length}
               size='small'
               isOptionEqualToValue={(option, value) => option.user_id === value.user_id}
               renderInput={params => (
                  <TextField
                     {...params}
                     label='Add Time Tracker Staff'
                     placeholder={addableUsers.length ? 'Search users...' : 'All active users are assigned'}
                     size='small'
                  />
               )}
               noOptionsText='No additional active users available'
            />

            <Typography variant='body2' color='text.secondary'>
               {policyNote}
            </Typography>

            <Box>
               <Typography variant='subtitle1' sx={{ mb: 1 }}>
                  Active Time Tracker Staff
               </Typography>
               <DataGrid
                  rows={activeStaffRows}
                  columns={staffColumns}
                  autoHeight
                  hideFooter
                  disableColumnMenu
                  disableRowSelectionOnClick
                  loading={loading || saving}
                  components={{
                     NoRowsOverlay: () => (
                        <Stack height='100%' alignItems='center' justifyContent='center'>
                           {loading ? <CircularProgress size={24} /> : <Typography>No staff selected.</Typography>}
                        </Stack>
                     )
                  }}
               />
            </Box>

            {feedback.message && (
               <Alert severity={feedback.type || 'info'} onClose={() => setFeedback({ type: null, message: '' })}>
                  {feedback.message}
               </Alert>
            )}
         </Paper>
      </Stack>
   );
};

export default TimeTrackingSettings;
