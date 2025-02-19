import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Stack, Box, Divider, Snackbar, Alert } from '@mui/material';
import TimeTrackerStatusGrid from '../../../Pages/Transactions/TransactionGrids/TimeTrackerStatusGrid';
import EmployeeEntryGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeEntryGrid';
import EmployeeErrorGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeErrorGrid';
import { context } from '../../../App';
import { useRowData } from '../../../Routes/useRowData';
import ButtonWithLoader from '../../../Components/ButtonWithLoader';
import { manuallyRunTimeTrackers, postUserTimeEntryToTransactions } from '../../../Services/ApiCalls/PostCalls';
import Time from '../../../Pages/Transactions/TransactionForms/AddTransaction/Time';
import GeneralDialog from '../../../Components/Dialogs/GeneralDialog';

export default function EmployeeTimeTrackerSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};

   const [selectedUserID, setSelectedUserID] = useState(null);
   const [refreshTrackerStatusKey, setRefreshTrackerStatusKey] = useState(new Date());
   const [loading, setLoading] = useState(false);
   const [snackbar, setSnackbar] = useState({ message: '', severity: 'info' });
   const [selectedColumnName, setSelectedColumnName] = useState(null);
   const [selectedRowDataForTransaction, setSelectedRowDataForTransaction] = useState({});
   const [openDialog, setOpenDialog] = useState(false);

   const { rowData: contextRowData } = useRowData();

   useEffect(() => {
      if (rowData || contextRowData) {
         setSelectedColumnName(rowData?.columnName || contextRowData?.columnName);
         setSelectedUserID(rowData?.user_id || contextRowData?.user_id);
      } else {
         navigate('/transactions/employeeTimeTrackerTransactions');
      }
   }, [rowData, contextRowData, navigate]);

   const processTimeTrackersManually = async () => {
      setLoading(true);
      setSnackbar({ message: '', severity: 'info' });
      const response = await manuallyRunTimeTrackers(accountID, userID, token);

      if (response.status === 200 && !response.error) {
         setSnackbar({ message: response.data.message || 'Timesheets processed successfully!', severity: 'success' });
         setRefreshTrackerStatusKey(new Date());
      } else {
         setSnackbar({ message: response.data.message || 'An unknown error occurred', severity: 'error' });
      }
      setLoading(false);
   };

   const handleCloseSnackbar = (_, reason) => {
      if (reason === 'clickaway') return;
      setSnackbar({ message: '', severity: 'info' });
   };

   const handleRowSelection = rowData => {
      setSelectedRowDataForTransaction(rowData);
      setOpenDialog(true);
   };

   const handleCloseDialog = () => {
      setOpenDialog(false);
      setSelectedRowDataForTransaction({});
   };

   return (
      <Stack spacing={3}>
         <Box sx={{ alignSelf: 'self-end' }}>
            <ButtonWithLoader buttonText='Manually Run Timesheets' onClick={processTimeTrackersManually} loading={loading} />
         </Box>

         <TimeTrackerStatusGrid refreshTrackerStatusKey={refreshTrackerStatusKey} />

         <Divider sx={{ marginTop: '20px' }} />

         {openDialog && (
            <GeneralDialog dialogSize='xs' buttonText='Add Time' openDialogWindow={openDialog} onClose={handleCloseDialog}>
               <Time
                  customerData={customerData}
                  setCustomerData={setCustomerData}
                  passedTransactionData={selectedRowDataForTransaction}
                  passedPostCall={postUserTimeEntryToTransactions}
                  onSuccess={() => setRefreshTrackerStatusKey(new Date())}
               />
            </GeneralDialog>
         )}

         <Routes>
            {selectedColumnName === 'timesheet_count' && (
               <Route
                  path='/employeeEntries'
                  element={<EmployeeEntryGrid selectedUserID={selectedUserID} setSelectedRowDataForTransaction={handleRowSelection} refreshKey={refreshTrackerStatusKey} />}
               />
            )}
            {selectedColumnName === 'error_count' && <Route path='/employeeErrors' element={<EmployeeErrorGrid selectedUserID={selectedUserID} />} />}
         </Routes>

         {snackbar.message && (
            <Snackbar open={!!snackbar.message} autoHideDuration={8000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
               <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
                  {snackbar.message}
               </Alert>
            </Snackbar>
         )}
      </Stack>
   );
}
