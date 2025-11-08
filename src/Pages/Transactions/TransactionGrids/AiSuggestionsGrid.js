import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import { context } from '../../../App';
import { fetchOutstandingEmployeeEntriesByID } from '../../../Services/ApiCalls/FetchCalls';

const DEFAULT_PAGE_SIZE = 10;

export default function AiSuggestionsGrid({ selectedUserID, refreshKey }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [loading, setLoading] = useState(false);
   const [gridData, setGridData] = useState({ rows: [], columns: [], totalCount: 0 });
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });

   const buildRowsFromEntries = useCallback(entries => {
      if (!Array.isArray(entries)) return [];
      return entries
         .map(e => {
            const s = e.ai_suggestion || {};
            return {
               timesheet_entry_id: e.timesheet_entry_id,
               status: s.status || null,
               suggested_category: s.suggested_category || null,
               suggested_job_category_id: s.suggested_job_category_id || null,
               suggested_job_type_id: s.suggested_job_type_id || null,
               suggested_general_work_description_id: s.suggested_general_work_description_id || null,
               ai_confidence: s.ai_confidence ?? null,
               ai_reason: s.ai_reason || null
            };
         })
         .filter(r => r.status === 'completed' || r.status === 'applied')
         .map((r, idx) => ({ id: idx, ...r }));
   }, []);

   const columns = useMemo(
      () => [
         { field: 'timesheet_entry_id', headerName: 'Timesheet Entry ID', width: 160 },
         { field: 'status', headerName: 'Status', width: 120 },
         { field: 'suggested_category', headerName: 'Suggested Category', width: 180 },
         { field: 'suggested_job_category_id', headerName: 'Job Category ID', width: 150 },
         { field: 'suggested_job_type_id', headerName: 'Job Type ID', width: 130 },
         { field: 'suggested_general_work_description_id', headerName: 'Work Description ID', width: 180 },
         { field: 'ai_confidence', headerName: 'AI Confidence', width: 140 },
         { field: 'ai_reason', headerName: 'Reason', width: 300 }
      ],
      []
   );

   const loadSuggestions = useCallback(async () => {
      if (!selectedUserID || !accountID || !userID || !token) return;
      setLoading(true);
      try {
         // Fetch a large page client-side and paginate on the client (simplifies filtering by suggestion status)
         const res = await fetchOutstandingEmployeeEntriesByID(accountID, userID, selectedUserID, token, 1, 1000);
         const entries = Array.isArray(res?.outstandingTimesheetEntries) ? res.outstandingTimesheetEntries : [];
         const rows = buildRowsFromEntries(entries);
         setGridData({ rows, columns, totalCount: rows.length });
         // Reset to first page when dataset changes
         setPaginationModel(prev => ({ ...prev, page: 0 }));
      } catch (err) {
         console.error('Error loading AI suggestions:', err);
         setGridData({ rows: [], columns, totalCount: 0 });
      } finally {
         setLoading(false);
      }
   }, [accountID, userID, token, selectedUserID, buildRowsFromEntries, columns]);

   useEffect(() => {
      loadSuggestions();
   }, [loadSuggestions, refreshKey]);

   return (
      <PaginationGrid
         title='AI Suggestions'
         tableData={gridData}
         paginationModel={paginationModel}
         onPaginationModelChange={setPaginationModel}
         loading={loading}
         useClientPagination={true}
         showQuickFilter={false}
         passedHeight={window.innerHeight - 550}
      />
   );
}
