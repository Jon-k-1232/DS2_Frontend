import { fetchOutstandingTimesheetCounts } from '../../../../Services/ApiCalls/FetchCalls';
import { filterGridByColumnName } from '../../../../Services/SharedFunctions';

export async function fetchBaseStatusData(accountID, userID, token) {
   const fetchedOutstandingTimesheetCounts = await fetchOutstandingTimesheetCounts(accountID, userID, token);
   const baseGrid = fetchedOutstandingTimesheetCounts.grid || { rows: [], columns: [] };
   return { baseGrid, isEnabled: false, processingByUser: {} };
}

// Phase 1 cutover: AI suggestion columns moved to /transactions/billingReview.
// composeTimeTrackerStatusGrid is preserved for callers that filter the
// base columns; the AI-related branches are now no-ops.
export function composeTimeTrackerStatusGrid(baseGrid, _isEnabled, _aiColumns, _arrayOfColumnNamesWithAI, arrayOfColumnNamesNoAI) {
   if (!baseGrid) return { rows: [], columns: [] };
   const fieldsToHide = new Set(['ai_processing_count', 'ai_failed_count', 'ai_completed_count', 'ai_status', 'retry_failed']);
   const filteredBaseCols = (baseGrid.columns || []).filter(c => !fieldsToHide.has(c.field));
   return filterGridByColumnName({ ...baseGrid, columns: filteredBaseCols }, arrayOfColumnNamesNoAI);
}
