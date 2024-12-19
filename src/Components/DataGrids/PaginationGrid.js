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
   useClientPagination = false
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

   const getRowId = row => row.timesheet_entry_id || row.id || `${row.user_id}-${row.timesheet_name || row.date}`;

   const handlePaginationChange = pagination => {
      if (onPaginationModelChange) onPaginationModelChange(pagination);
   };

   const gridProps = {
      density: 'compact',
      components: {
         Toolbar: props => <CustomToolbar {...props} hideGridTools={hideGridTools} arrayOfButtons={arrayOfButtons} title={title} dialogSize={dialogSize} />
      },
      checkboxSelection,
      disableRowSelectionOnClick: !checkboxSelection,
      onRowSelectionModelChange: newSelection => {
         if (checkboxSelection && !rowSelectionOnly) {
            const selectedRowsData = newSelection.map(id => rows.find(row => getRowId(row) === id));
            setArrayOfSelectedRows?.(selectedRowsData);
         }
      },
      onRowClick: rowData => {
         if (enableSingleRowClick && !routeToPass) {
            setSingleSelectedRow?.(rowData.row);
         } else if (enableSingleRowClick && routeToPass) {
            navigate(routeToPass, { state: { rowData: rowData.row } });
         }
      },
      paginationMode: useClientPagination ? 'client' : 'server',
      rowCount: totalCount || rows.length,
      paginationModel: useClientPagination ? null : paginationModel,
      onPaginationModelChange: useClientPagination ? null : handlePaginationChange,
      getRowId,
      pageSize: pageSize || 10,
      pageSizeOptions: [5, 10, 25, 50, 100]
   };

   const dynamicColumns = rows.length && columns.length ? getDynamicColumnWidths(rows, columns) : columns;

   return (
      <Box ref={scrollRef} sx={{ height: passedHeight || 680, width: '100%' }}>
         <DataGrid rows={rows} columns={dynamicColumns} {...gridProps} />
      </Box>
   );
};

export default DataGridTable;
