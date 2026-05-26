import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import CustomToolbar from './CustomToolbar';
import getDynamicColumnWidths from './DynamicColumnSizing';

const DataGridTable = ({
   tableData,
   passedHeight,
   checkboxSelection = false,
   rowSelectionOnly = false,
   enableSingleRowClick = false,
   setArrayOfSelectedRows,
   setSingleSelectedRow,
   routeToPass,
   arrayOfButtons = [],
   title = '',
   dialogSize,
   hideGridTools = false,
   paginationModel,
   onPaginationModelChange,
   pageSize,
   scrollOnPagination = false,
   useClientPagination = false,
   loading = false,
   onFilterModelChange,
   getRowId,
   showQuickFilter = true,
   renderToolbarContent,
   renderExport,
   initiallyHiddenColumns = []
}) => {
   const navigate = useNavigate();
   const { rows = [], columns = [], totalCount = 0 } = tableData;

   const scrollRef = useRef(null);

   // Scroll to bottom when pagination changes
   useEffect(() => {
      if (scrollOnPagination) {
         window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'instant'
         });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [paginationModel]);

   const defaultGetRowId = row => row.timesheet_entry_id || row.id || `${row.user_id}-${row.timesheet_name || row.date}`;
   const deriveRowId = getRowId || defaultGetRowId;

   const handlePaginationChange = (pagination, details) => {
      if (onPaginationModelChange) {
         onPaginationModelChange(pagination, details);
      }
   };

   const isServerFiltering = !useClientPagination && typeof onFilterModelChange === 'function';

   const gridProps = {
      density: 'compact',
      components: {
         Toolbar: props => (
            <CustomToolbar
               {...props}
               hideGridTools={hideGridTools}
               showGridTools={!hideGridTools}
               arrayOfButtons={arrayOfButtons}
               title={title}
               dialogSize={dialogSize}
               showQuickFilter={showQuickFilter}
               renderToolbarContent={renderToolbarContent}
               renderExport={renderExport}
            />
         )
      },
      checkboxSelection,
      disableRowSelectionOnClick: !checkboxSelection,
      onRowSelectionModelChange: newSelection => {
         if (checkboxSelection && !rowSelectionOnly) {
            const selectedRowsData = newSelection.map(id => rows.find(row => deriveRowId(row) === id));
            setArrayOfSelectedRows?.(selectedRowsData);
         }
      },
      onRowClick: rowData => {
         if (enableSingleRowClick && !routeToPass) {
            setSingleSelectedRow?.(rowData.row);
         } else if (enableSingleRowClick && routeToPass) {
            // routeToPass may be a string OR a function (row) => string — the
            // function form lets callers stamp row-derived ids into the URL
            // itself (preferred over location.state so Back-navigation works).
            const resolvedRoute = typeof routeToPass === 'function' ? routeToPass(rowData.row) : routeToPass;
            navigate(resolvedRoute, { state: { rowData: rowData.row } });
         }
      },
      paginationMode: useClientPagination ? 'client' : 'server',
      filterMode: isServerFiltering ? 'server' : 'client',
      rowCount: totalCount || rows.length,
      paginationModel: useClientPagination ? null : paginationModel,
      onPaginationModelChange: useClientPagination ? null : handlePaginationChange,
      onFilterModelChange: isServerFiltering ? onFilterModelChange : null,
      getRowId: deriveRowId,
      pageSize: pageSize || 10,
      pageSizeOptions: [5, 10, 25, 50, 100],
      loading
   };

   const dynamicColumns = rows.length && columns.length ? getDynamicColumnWidths(rows, columns) : columns;

   // Build initial column visibility model: columns listed are hidden (false), others default to true
   const columnVisibilityModel = (initiallyHiddenColumns || []).reduce((acc, col) => {
      acc[col] = false;
      return acc;
   }, {});

   return (
      <Box ref={scrollRef} sx={{ height: passedHeight || 680, width: '100%' }}>
         <DataGrid rows={rows} columns={dynamicColumns} initialState={{ columns: { columnVisibilityModel } }} {...gridProps} />
      </Box>
   );
};

export default DataGridTable;
