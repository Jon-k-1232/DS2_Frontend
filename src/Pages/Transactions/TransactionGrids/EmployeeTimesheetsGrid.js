import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Stack, CircularProgress, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { context } from '../../../App';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import { fetchAllEmployeeTimesheetsByID } from '../../../Services/ApiCalls/FetchCalls';
import { downloadTimeTrackerByName } from '../../../Services/ApiCalls/TimeTrackingCalls';

export default function EmployeeTimesheetsGrid({ selectedUserID, setSelectedRowDataForTransaction, refreshKey }) {
   const [entriesGrid, setEntriesGrid] = useState({ rows: [], columns: [], totalCount: 0 });
   const [loading, setLoading] = useState(true);
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
   const [filters, setFilters] = useState('');
   const [downloadError, setDownloadError] = useState('');

   const { accountID, userID, token } = useContext(context).loggedInUser;

   const fetchPageData = useCallback(async (page = 1, limit = 10, filterQuery = '') => {
      setLoading(true);
      try {
         const response = await fetchAllEmployeeTimesheetsByID(accountID, userID, selectedUserID, token, page, limit, filterQuery);
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
   }, [accountID, userID, selectedUserID, token]);

   useEffect(() => {
      if (selectedUserID) {
         const { page, pageSize } = paginationModel;
         fetchPageData(page + 1, pageSize, filters);
      }
   }, [selectedUserID, paginationModel.pageSize, filters, refreshKey, fetchPageData]);

   const handleFilterChange = filterModel => {
      const filterQuery = filterModel.items
         .filter(item => item.value)
         .map(item => `${item.columnField}=${item.value}`)
         .join('&');
      setPaginationModel(prev => ({ ...prev, page: 0 }));
      setFilters(filterQuery);
   };

   const handlePaginationModelChange = useCallback(
      newModel => {
         setPaginationModel(newModel);
         fetchPageData(newModel.page + 1, newModel.pageSize, filters);
      },
      [fetchPageData, filters]
   );

   const triggerFileDownload = (blob, fileName) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
   };

   const handleDownload = useCallback(
      async timesheetName => {
         if (!timesheetName) return;
         try {
            const { blob, fileName } = await downloadTimeTrackerByName(accountID, userID, selectedUserID, timesheetName, token);
            triggerFileDownload(blob, fileName);
         } catch (error) {
            console.error('Error downloading time tracker:', error);
            const message =
               error?.response?.data?.message ||
               error?.message ||
               'We could not download that time tracker. Please try again later.';
            setDownloadError(message);
         }
      },
      [accountID, userID, selectedUserID, token]
   );

   const enhancedGrid = useMemo(() => {
      if (!entriesGrid?.columns?.length) return entriesGrid;

      const downloadColumn = {
         field: '__download__',
         headerName: 'Download',
         sortable: false,
         filterable: false,
         width: 130,
         renderCell: params => {
            const timesheetName = params?.row?.timesheet_name;
            const disabled = !timesheetName;
            return (
               <Tooltip title={disabled ? 'Timesheet name unavailable' : 'Download tracker'}>
                  <span>
                     <IconButton
                        size='small'
                        color='primary'
                        disabled={disabled}
                        onClick={() => handleDownload(timesheetName)}
                     >
                        <DownloadIcon fontSize='small' />
                     </IconButton>
                  </span>
               </Tooltip>
            );
         }
      };

      const hasDownloadColumn = entriesGrid.columns.some(column => column.field === downloadColumn.field);

      return {
         ...entriesGrid,
         columns: hasDownloadColumn ? entriesGrid.columns : [...entriesGrid.columns, downloadColumn]
      };
   }, [entriesGrid, handleDownload]);

   return (
      <Stack spacing={3}>
         {loading ? (
            <CircularProgress />
         ) : (
            <PaginationGrid
               title='Employee Timesheets To Date'
               tableData={enhancedGrid}
               passedHeight={500}
               paginationModel={paginationModel}
               onPaginationModelChange={handlePaginationModelChange}
               scrollOnPagination={true}
               fetchPageData={fetchPageData}
               onFilterModelChange={handleFilterChange}
               // enableSingleRowClick={true}
               // setSingleSelectedRow={setSelectedRowDataForTransaction}
            />
         )}
         <Snackbar
            open={!!downloadError}
            autoHideDuration={6000}
            onClose={() => setDownloadError('')}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
         >
            <Alert onClose={() => setDownloadError('')} severity='error' sx={{ width: '100%' }}>
               {downloadError}
            </Alert>
         </Snackbar>
      </Stack>
   );
}
