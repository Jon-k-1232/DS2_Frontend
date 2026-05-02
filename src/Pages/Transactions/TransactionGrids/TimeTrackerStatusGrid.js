import { useEffect, useState, useContext } from 'react';
import { Stack } from '@mui/material';
import { context } from '../../../App';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { fetchBaseStatusData, composeTimeTrackerStatusGrid } from './helpers/timeTrackerStatusService';

export default function TimeTrackerStatusGrid({ refreshTrackerStatusKey }) {
   const [outstandingTimesheetCountsGrid, setOutstandingTimesheetCountsGrid] = useState({});
   const { accountID, userID, token } = useContext(context).loggedInUser;

   useEffect(() => {
      const load = async () => {
         const { baseGrid } = await fetchBaseStatusData(accountID, userID, token);
         // Phase 1 cutover: AI suggestion columns moved to /transactions/billingReview.
         // Render the base grid only.
         const grid = composeTimeTrackerStatusGrid(baseGrid, false, [], arrayOfColumnNamesNoAI, arrayOfColumnNamesNoAI);
         setOutstandingTimesheetCountsGrid(grid);
      };
      load();
      // eslint-disable-next-line
   }, [refreshTrackerStatusKey]);

   return (
      <Stack spacing={3}>
         <DataGridTable
            title='Time Tracker Status'
            tableData={outstandingTimesheetCountsGrid}
            rowSelectionOnly
            pageSize={5}
            passedHeight={400}
            enableColumnsOnClick={enableColumnsOnClick}
            initiallyHiddenColumns={['user_id']}
         />
      </Stack>
   );
}

const enableColumnsOnClick = [
   { field: 'transaction_count', route: 'employeeEntries' },
   { field: 'trackers_by_month', route: 'trackersByMonth' },
   { field: 'trackers_to_date', route: 'trackersToDate' }
];
const arrayOfColumnNamesNoAI = ['display_name', 'user_id', 'transaction_count', 'trackers_by_month', 'trackers_to_date'];
