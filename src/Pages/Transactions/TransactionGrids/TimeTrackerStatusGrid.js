import { useEffect, useState, useContext } from 'react';
import { Stack } from '@mui/material';
import { context } from '../../../App';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { fetchOutstandingTimesheetCounts } from '../../../Services/ApiCalls/FetchCalls';

export default function TimeTrackerStatusGrid({ refreshTrackerStatusKey }) {
   const [outstandingTimesheetCountsGrid, setOutstandingTimesheetCountsGrid] = useState({});
   const { accountID, userID, token } = useContext(context).loggedInUser;

   useEffect(() => {
      fetchInitialAppData(accountID, userID, token);
      // eslint-disable-next-line
   }, [refreshTrackerStatusKey]);

   const fetchInitialAppData = async (accountID, userID, token) => {
      const fetchedOutstandingTimesheetCounts = await fetchOutstandingTimesheetCounts(accountID, userID, token);
      const filteredGrid = filterGridByColumnName(fetchedOutstandingTimesheetCounts.grid, arrayOfColumnNames);
      setOutstandingTimesheetCountsGrid(filteredGrid);
   };

   return (
      <Stack spacing={3}>
         <DataGridTable title='Time Tracker Status' tableData={outstandingTimesheetCountsGrid} rowSelectionOnly pageSize={5} passedHeight={400} enableColumnsOnClick={enableColumnsOnClick} />
      </Stack>
   );
}

const enableColumnsOnClick = [
   {
      field: 'transaction_count',
      route: '/transactions/employeeTimeTrackerTransactions/employeeEntries'
   },
   {
      field: 'trackers_by_month',
      route: '/transactions/employeeTimeTrackerTransactions/trackersByMonth'
   },
   {
      field: 'trackers_to_date',
      route: '/transactions/employeeTimeTrackerTransactions/trackersToDate'
   },
   {
      field: 'error_count',
      route: '/transactions/employeeTimeTrackerTransactions/employeeErrors'
   }
];

const arrayOfColumnNames = ['user_id', 'display_name', 'transaction_count', 'trackers_by_month', 'trackers_to_date', 'error_count'];
