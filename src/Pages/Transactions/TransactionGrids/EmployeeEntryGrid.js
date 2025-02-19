import React, { useState, useEffect, useContext } from 'react';
import { Stack, CircularProgress } from '@mui/material';
import { context } from '../../../App';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import { fetchOutstandingEmployeeEntriesByID } from '../../../Services/ApiCalls/FetchCalls';

export default function EmployeeEntryGrid({ selectedUserID, setSelectedRowDataForTransaction, refreshKey }) {
   const [entriesGrid, setEntriesGrid] = useState({ rows: [], columns: [], totalCount: 0 });
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

   return (
      <Stack spacing={3}>
         {loading ? (
            <CircularProgress />
         ) : (
            <PaginationGrid
               title='Employee Entries'
               tableData={entriesGrid}
               passedHeight={500}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               scrollOnPagination={true}
               fetchPageData={fetchPageData}
               onFilterModelChange={handleFilterChange}
               enableSingleRowClick={true}
               setSingleSelectedRow={setSelectedRowDataForTransaction}
            />
         )}
      </Stack>
   );
}
