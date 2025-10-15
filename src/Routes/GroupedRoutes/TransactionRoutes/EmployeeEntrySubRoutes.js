import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Stack, Divider } from '@mui/material';
import TimeTrackerStatusGrid from '../../../Pages/Transactions/TransactionGrids/TimeTrackerStatusGrid';
import EmployeeEntryGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeEntryGrid';
import EmployeeTimesheetsGrid from '../../../Pages/Transactions/TransactionGrids/EmployeeTimesheetsGrid';
import TimesheetsByMonthGrid from '../../../Pages/Transactions/TransactionGrids/TimesheetsByMonthGrid';
import { context } from '../../../App';
import { useRowData } from '../../../Routes/useRowData';
import { postUserTimeEntryToTransactions } from '../../../Services/ApiCalls/PostCalls';
import Time from '../../../Pages/Transactions/TransactionForms/AddTransaction/Time';
import GeneralDialog from '../../../Components/Dialogs/GeneralDialog';

const ALLOWED_STATUS_COLUMNS = ['transaction_count', 'trackers_by_month', 'trackers_to_date'];

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
   const [selectedColumnName, setSelectedColumnName] = useState(null);
   const [selectedRowDataForTransaction, setSelectedRowDataForTransaction] = useState({});
   const [openDialog, setOpenDialog] = useState(false);

   const { rowData: contextRowData } = useRowData();

   useEffect(() => {
      if (rowData || contextRowData) {
         const incomingColumnName = rowData?.columnName || contextRowData?.columnName;
         const incomingUserId = rowData?.user_id || contextRowData?.user_id;

         const columnIsAllowed = incomingColumnName && ALLOWED_STATUS_COLUMNS.includes(incomingColumnName);

         if (columnIsAllowed) {
            setSelectedColumnName(incomingColumnName);
         } else {
            setSelectedColumnName(null);
            if (location.pathname !== basePath) {
               navigate(basePath, { replace: true });
            }
         }

         if (incomingUserId) {
            setSelectedUserID(incomingUserId);
         }
      } else {
         if (location.pathname !== basePath) {
            navigate(basePath, { replace: true });
         }
      }
   }, [rowData, contextRowData, navigate, basePath, location.pathname]);

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
         </Routes>

      </Stack>
   );
}
