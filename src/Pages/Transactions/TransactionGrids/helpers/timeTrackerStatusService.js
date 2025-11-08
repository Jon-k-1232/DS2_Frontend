import { fetchOutstandingTimesheetCounts, fetchAiIntegrationSettings } from '../../../../Services/ApiCalls/FetchCalls';
import { filterGridByColumnName } from '../../../../Services/SharedFunctions';

export async function fetchBaseStatusData(accountID, userID, token) {
   const [aiSettings, fetchedOutstandingTimesheetCounts] = await Promise.all([fetchAiIntegrationSettings(accountID, userID, token), fetchOutstandingTimesheetCounts(accountID, userID, token)]);

   const baseGrid = fetchedOutstandingTimesheetCounts.grid || { rows: [], columns: [] };

   const processingByUser = {};
   (baseGrid.rows || []).forEach(r => {
      if (r && r.user_id != null) processingByUser[r.user_id] = Number(r.ai_processing_count || 0);
   });

   const anyAiActivity = Array.isArray(baseGrid?.rows) && baseGrid.rows.some(r => r.ai_processing_count || r.ai_completed_count || r.ai_failed_count);
   const isEnabled = Boolean(aiSettings?.integration?.isEnabled) || anyAiActivity;

   return { baseGrid, isEnabled, processingByUser };
}

export function buildAiColumns({ processingByUser, onCompletedClick, onRetryClick, retryLoadingByUser = {}, retryErrorByUser = {} }) {
   const aiFailedColumn = {
      field: 'ai_failed_count',
      headerName: 'AI Failed',
      width: 120,
      renderCell: params => {
         const count = Number(params?.row?.ai_failed_count || 0);
         if (count > 0) {
            return (
               <span title={`${count} failed entries`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#d32f2f' }}>
                  {/* icon rendered at caller level if needed */}
                  {count}
               </span>
            );
         }
         return 0;
      }
   };

   const aiCompletedColumn = {
      field: 'ai_completed_count',
      headerName: 'AI Completed',
      width: 130,
      renderCell: params => {
         const count = Number(params?.row?.ai_completed_count || 0);
         const rowUserId = params?.row?.user_id;
         if (count > 0) {
            return (
               <span
                  title='Show AI suggestions'
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  onClick={e => {
                     e.stopPropagation();
                     if (typeof onCompletedClick === 'function') onCompletedClick(rowUserId, count);
                  }}
               >
                  {count}
               </span>
            );
         }
         return 0;
      }
   };

   const aiStatusColumn = {
      field: 'ai_status',
      headerName: 'AI Status',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: params => {
         const processing = Number(processingByUser[params?.row?.user_id] || 0) > 0;
         const failed = Number(params?.row?.ai_failed_count || 0) > 0;
         const completed = Number(params?.row?.ai_completed_count || 0) > 0;
         if (processing) return 'Processing';
         if (failed && completed) return 'Mixed';
         if (failed) return 'Failed';
         if (completed) return 'Done';
         return '';
      }
   };

   const retryColumn = {
      field: 'retry_failed',
      headerName: 'Retry Failed',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: params => {
         const failedCount = Number(params?.row?.ai_failed_count || 0);
         const rowUserId = params?.row?.user_id;
         const loading = Boolean(retryLoadingByUser[rowUserId]);
         const errorMessage = retryErrorByUser[rowUserId] || '';
         const isDisabled = !failedCount;
         const style = {
            color: isDisabled ? '#9e9e9e' : '#2e7d32',
            cursor: isDisabled ? 'default' : 'pointer',
            fontWeight: 500,
            opacity: isDisabled ? 0.6 : 1
         };
         if (loading) return 'Retrying...';
         return (
            <span
               title={errorMessage || (failedCount ? 'Retry Failed Records' : 'No failed records')}
               onClick={
                  !isDisabled
                     ? e => {
                          e.stopPropagation();
                          if (typeof onRetryClick === 'function') onRetryClick(rowUserId, failedCount);
                       }
                     : undefined
               }
               style={style}
               aria-disabled={isDisabled}
               role='button'
            >
               Retry Failed Records
            </span>
         );
      }
   };

   return [aiFailedColumn, aiCompletedColumn, aiStatusColumn, retryColumn];
}

export function composeTimeTrackerStatusGrid(baseGrid, isEnabled, aiColumns, arrayOfColumnNamesWithAI, arrayOfColumnNamesNoAI) {
   if (!baseGrid) return { rows: [], columns: [] };
   const fieldsToReplace = new Set(['ai_processing_count', 'ai_failed_count', 'ai_completed_count', 'ai_status', 'retry_failed']);
   const filteredBaseCols = (baseGrid.columns || []).filter(c => !fieldsToReplace.has(c.field));
   const nextColumns = isEnabled ? [...filteredBaseCols, ...aiColumns] : filteredBaseCols;
   const working = { ...baseGrid, columns: nextColumns };
   return filterGridByColumnName(working, isEnabled ? arrayOfColumnNamesWithAI : arrayOfColumnNamesNoAI);
}
