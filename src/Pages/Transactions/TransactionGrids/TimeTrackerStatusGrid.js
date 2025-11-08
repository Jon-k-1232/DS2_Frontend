import { useEffect, useState, useContext } from 'react';
import { Stack } from '@mui/material';
import { context } from '../../../App';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { fetchOutstandingEmployeeEntriesByID } from '../../../Services/ApiCalls/FetchCalls';
import { postAiKickoff } from '../../../Services/ApiCalls/PostCalls';
import { buildAiColumns, composeTimeTrackerStatusGrid, fetchBaseStatusData } from './helpers/timeTrackerStatusService';
//

export default function TimeTrackerStatusGrid({ refreshTrackerStatusKey, onOpenAiSuggestions }) {
   const [outstandingTimesheetCountsGrid, setOutstandingTimesheetCountsGrid] = useState({});
   const [retryLoadingByUser, setRetryLoadingByUser] = useState({});
   const [retryErrorByUser, setRetryErrorByUser] = useState({});
   // Removed local AI suggestions grid rendering; route to dedicated component instead
   const { accountID, userID, token } = useContext(context).loggedInUser;

   useEffect(() => {
      fetchInitialAppData(accountID, userID, token);
      // eslint-disable-next-line
   }, [refreshTrackerStatusKey]);

   const fetchInitialAppData = async (accountID, userID, token) => {
      const { baseGrid, isEnabled, processingByUser: procMap } = await fetchBaseStatusData(accountID, userID, token);

      // Build AI columns with minimal inline UI logic; tooltips/icons are handled in the main component
      const aiColumns = buildAiColumns({
         processingByUser: procMap,
         onCompletedClick: () => {
            if (typeof onOpenAiSuggestions === 'function') onOpenAiSuggestions();
         },
         onRetryClick: async rowUserId => {
            setRetryErrorByUser(prev => ({ ...prev, [rowUserId]: '' }));
            setRetryLoadingByUser(prev => ({ ...prev, [rowUserId]: true }));
            try {
               const res = await fetchOutstandingEmployeeEntriesByID(accountID, userID, rowUserId, token, 1, 1000);
               const entries = Array.isArray(res?.outstandingTimesheetEntries) ? res.outstandingTimesheetEntries : [];
               const failedEntries = entries.filter(e => (e?.ai_suggestion?.status || e?.ai_status) === 'failed');
               const ids = failedEntries.map(e => e?.timesheet_entry_id).filter(Boolean);
               if (!ids.length) {
                  setRetryErrorByUser(prev => ({ ...prev, [rowUserId]: 'No failed entries to retry.' }));
                  return;
               }
               await postAiKickoff(accountID, userID, token, { entry_ids: ids });
               await fetchInitialAppData(accountID, userID, token);
            } catch (err) {
               setRetryErrorByUser(prev => ({ ...prev, [rowUserId]: err?.message || 'Retry failed to start.' }));
            } finally {
               setRetryLoadingByUser(prev => ({ ...prev, [rowUserId]: false }));
            }
         },
         retryLoadingByUser,
         retryErrorByUser
      });

      const filteredGrid = composeTimeTrackerStatusGrid(baseGrid, isEnabled, aiColumns, arrayOfColumnNamesWithAI, arrayOfColumnNamesNoAI);
      setOutstandingTimesheetCountsGrid(filteredGrid);
   };

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
            // No local AI suggestions rendering
         />
      </Stack>
   );
}

const enableColumnsOnClick = [
   {
      field: 'transaction_count',
      route: '/time-tracking/trackingAdministration/employeeEntries'
   },
   {
      field: 'trackers_by_month',
      route: '/time-tracking/trackingAdministration/trackersByMonth'
   },
   {
      field: 'trackers_to_date',
      route: '/time-tracking/trackingAdministration/trackersToDate'
   }
];

const arrayOfColumnNamesWithAI = ['user_id', 'display_name', 'ai_status', 'ai_failed_count', 'ai_completed_count', 'retry_failed', 'transaction_count', 'trackers_by_month', 'trackers_to_date'];
const arrayOfColumnNamesNoAI = ['user_id', 'display_name', 'transaction_count', 'trackers_by_month', 'trackers_to_date'];

// No local grid builder; AI suggestions are handled in a dedicated component
