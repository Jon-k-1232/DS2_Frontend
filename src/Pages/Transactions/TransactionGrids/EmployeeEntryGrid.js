import React, { useState, useEffect, useContext } from 'react';
import { Stack, CircularProgress } from '@mui/material';
import { context } from '../../../App';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import { fetchOutstandingEmployeeEntriesByID } from '../../../Services/ApiCalls/FetchCalls';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function EmployeeEntryGrid({ selectedUserID, setSelectedRowDataForTransaction, refreshKey }) {
   const [entriesGrid, setEntriesGrid] = useState({ rows: [], columns: [], totalCount: 0 });
   const [entriesById, setEntriesById] = useState({});
   const [loading, setLoading] = useState(true);
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
   const [filters, setFilters] = useState('');

   const { accountID, userID, token } = useContext(context).loggedInUser;

   // Function to fetch paginated and filtered data
   const fetchPageData = async (page = 1, limit = 10, filterQuery = '') => {
      setLoading(true);
      try {
         const response = await fetchOutstandingEmployeeEntriesByID(accountID, userID, selectedUserID, token, page, limit, filterQuery);
         setEntriesGrid({
            rows: response.grid.rows || [],
            columns: response.grid.columns || [],
            totalCount: response.pagination.totalItems || 0
         });
         const mappedEntries = (response.outstandingTimesheetEntries || []).reduce((acc, entry) => {
            if (entry?.timesheet_entry_id) {
               acc[entry.timesheet_entry_id] = entry;
            }
            return acc;
         }, {});
         setEntriesById(mappedEntries);
      } catch (error) {
         console.error('Error fetching paginated data:', error);
      } finally {
         setLoading(false);
      }
   };

   // Fetch initial data or on filters/pagination changes
   useEffect(() => {
      if (selectedUserID) {
         const { page, pageSize } = paginationModel;
         fetchPageData(page + 1, pageSize, filters);
      }
      // eslint-disable-next-line
   }, [selectedUserID, paginationModel, filters, refreshKey]);

   // Handle filtering
   const handleFilterChange = filterModel => {
      const filterQuery = filterModel.items
         .filter(item => item.value)
         .map(item => `${item.columnField}=${item.value}`)
         .join('&');
      setFilters(filterQuery);
   };

   const handleRowSelection = row => {
      if (!row) {
         return;
      }
      const entryId = row.timesheet_entry_id;
      const hydratedEntry = (entryId && entriesById[entryId]) || row;
      setSelectedRowDataForTransaction(hydratedEntry);
   };

   // Limit visible columns to a curated subset from timesheet_entries
   // Schema reference (tables.sql -> timesheet_entries):
   // timesheet_entry_id, account_id, user_id, employee_name, timesheet_name,
   // time_tracker_start_date, time_tracker_end_date, date, entity, category,
   // company_name, first_name, last_name, duration, notes, is_processed,
   // is_deleted, created_at
   const arrayOfColumnNames = [
      'timesheet_entry_id',
      'employee_name',
      'timesheet_name',
      'time_tracker_start_date',
      'time_tracker_end_date',
      'date',
      'entity',
      'category',
      'company_name',
      'first_name',
      'last_name',
      'duration',
      'notes'
   ];

   const filteredEntriesGrid = (() => {
      try {
         const base = { rows: entriesGrid.rows || [], columns: entriesGrid.columns || [] };
         const filtered = filterGridByColumnName(base, arrayOfColumnNames);
         return { ...filtered, totalCount: entriesGrid.totalCount || 0 };
      } catch {
         return entriesGrid;
      }
   })();

   return (
      <Stack spacing={3}>
         {loading ? (
            <CircularProgress />
         ) : (
            <PaginationGrid
               title='Employee Entries'
               tableData={filteredEntriesGrid}
               passedHeight={window.innerHeight - 550}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               fetchPageData={fetchPageData}
               onFilterModelChange={handleFilterChange}
               enableSingleRowClick={true}
               setSingleSelectedRow={handleRowSelection}
               initiallyHiddenColumns={['timesheet_entry_id', 'date', 'timesheet_name', 'employee_name', 'time_tracker_start_date', 'time_tracker_end_date']}
            />
         )}
      </Stack>
   );
}
