import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Stack, Box, Divider, Snackbar, Alert } from '@mui/material';
import TimeTrackerStatusGrid from '../../../Pages/Transactions/TransactionGrids/TimeTrackerStatusGrid';
import EmployeeEntryGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeEntryGrid';
import EmployeeErrorGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeErrorGrid';
import EmployeeTimesheetsGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeTimesheetsGrid';
import TimesheetsByMonthGrid from '../../../Pages/Transactions/TransactionGrids/TimesheetsByMonthGrid';
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

   const basePath = useMemo(() => {
      const pathname = location.pathname || '';
      if (pathname.startsWith('/transactions/employeeTimeTrackerTransactions')) {
         return '/transactions/employeeTimeTrackerTransactions';
      }
      return '/time-tracking/trackingAdministration';
   }, [location.pathname]);

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
         if (location.pathname !== basePath) {
            navigate(basePath, { replace: true });
         }
      }
   }, [rowData, contextRowData, navigate, basePath, location.pathname]);

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
            {selectedColumnName === 'transaction_count' && (
               <Route
                  path='employeeEntries'
                  element={<EmployeeEntryGrid selectedUserID={selectedUserID} setSelectedRowDataForTransaction={handleRowSelection} refreshKey={refreshTrackerStatusKey} />}
               />
            )}
            {selectedColumnName === 'trackers_by_month' && (
               <Route
                  path='trackersByMonth'
                  element={<TimesheetsByMonthGrid selectedUserID={selectedUserID} setSelectedRowDataForTransaction={handleRowSelection} refreshKey={refreshTrackerStatusKey} />}
               />
            )}
            {selectedColumnName === 'trackers_to_date' && (
               <Route
                  path='trackersToDate'
                  element={<EmployeeTimesheetsGrid selectedUserID={selectedUserID} setSelectedRowDataForTransaction={handleRowSelection} refreshKey={refreshTrackerStatusKey} />}
               />
            )}
            {selectedColumnName === 'error_count' && <Route path='employeeErrors' element={<EmployeeErrorGrid selectedUserID={selectedUserID} />} />}
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
