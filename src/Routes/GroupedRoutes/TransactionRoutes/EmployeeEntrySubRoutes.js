import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Stack, Box, Divider, Snackbar, Alert } from '@mui/material';
import TimeTrackerStatusGrid from '../../../Pages/Transactions/TransactionGrids/TimeTrackerStatusGrid';
import EmployeeEntryGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeEntryGrid';
import EmployeeErrorGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeErrorGrid';
import { context } from '../../../App';
import { useRowData } from '../../../Routes/useRowData';
import ButtonWithLoader from '../../../Components/ButtonWithLoader';
import { manuallyRunTimeTrackers } from '../../../Services/ApiCalls/PostCalls';

export default function EmployeeTimeTrackerSubRoutes() {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};

   const [selectedUserID, setSelectedUserID] = useState(null);
   const [refreshTrackerStatusKey, setRefreshTrackerStatusKey] = useState(new Date());
   const [loading, setLoading] = useState(false);
   const [errorMessage, setErrorMessage] = useState('');
   const [successMessage, setSuccessMessage] = useState('');
   const [openSnackbar, setOpenSnackbar] = useState(false);
   const [selectedColumnName, setSelectedColumnName] = useState(null);

   const { rowData: contextRowData } = useRowData();

   useEffect(() => {
      if (rowData || contextRowData) {
         setSelectedColumnName(rowData?.columnName || contextRowData?.columnName);
         setSelectedUserID(rowData?.user_id || contextRowData?.user_id);
      } else {
         navigate('/transactions/employeeTimeTrackerTransactions');
      }
      // eslint-disable-next-line
   }, [rowData, contextRowData, location.state, navigate]);

   const processTimeTrackersManually = async () => {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const response = await manuallyRunTimeTrackers(accountID, userID, token);

      if (response.status === 200 && !response.error) {
         setSuccessMessage(response.data.message || 'Timesheets processed successfully!');
         setOpenSnackbar(true);
         setRefreshTrackerStatusKey(new Date());
      } else {
         console.error('Error Response:', response.data.message);
         setErrorMessage(response.data.message || 'An unknown error occurred');
         setOpenSnackbar(true);
      }
      setLoading(false);
   };

   const handleCloseSnackbar = (_, reason) => {
      if (reason === 'clickaway') return;
      setOpenSnackbar(false);
   };

   return (
      <Stack spacing={3}>
         {/* Button Component */}
         <Box style={styles.button}>
            <ButtonWithLoader buttonText='Manually Run Timesheets' onClick={processTimeTrackersManually} loading={loading} errorMessage={errorMessage} />
         </Box>

         {/* Upper Grid */}
         <TimeTrackerStatusGrid refreshTrackerStatusKey={refreshTrackerStatusKey} />

         <Divider style={styles.divider} />

         {/* Lower Grid */}
         <Routes>
            {selectedColumnName === 'timesheet_count' && <Route path='/employeeEntries' element={<EmployeeEntryGrid selectedUserID={selectedUserID} />} />}
            {selectedColumnName === 'error_count' && <Route path='/employeeErrors' element={<EmployeeErrorGrid selectedUserID={selectedUserID} />} />}
         </Routes>

         {/* Success/Error Snackbar */}
         <Snackbar open={openSnackbar} autoHideDuration={8000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Alert onClose={handleCloseSnackbar} severity={successMessage ? 'success' : 'error'} sx={{ width: '100%' }}>
               {successMessage || errorMessage}
            </Alert>
         </Snackbar>
      </Stack>
   );
}

const styles = {
   button: {
      alignSelf: 'self-end'
   },
   divider: {
      marginTop: '20px'
   }
};
