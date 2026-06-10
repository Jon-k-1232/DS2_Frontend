import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import CustomToolbar from './CustomToolbar';
import getDynamicColumnWidths from './DynamicColumnSizing';

const DataGridTable = ({
   tableData,
   passedHeight,
   checkboxSelection,
   rowSelectionOnly,
   enableSingleRowClick,
   setArrayOfSelectedRows,
   setSingleSelectedRow,
   routeToPass,
   arrayOfButtons,
   title,
   dialogSize,
   hideGridTools,
   enableColumnsOnClick = [],
   pageSize = 5,
   onAnyCellClick,
   initiallyHiddenColumns = []
}) => {
   const navigate = useNavigate();
   const { rows, columns } = tableData;

   const matchingField = (array, field) => array.find(column => column.field === field);

   const gridProps = {
      density: 'compact',
      components: {
         Toolbar: props => <CustomToolbar {...props} hideGridTools={hideGridTools} showGridTools={!hideGridTools} arrayOfButtons={arrayOfButtons} title={title} dialogSize={dialogSize} />
      },
      checkboxSelection: checkboxSelection,
      onRowSelectionModelChange: newSelection => {
         if (checkboxSelection && !rowSelectionOnly) {
            const selectedRowsData = newSelection.map(id => rows.find(row => row.id === id));
            setArrayOfSelectedRows(selectedRowsData);
         }
      },
      onRowClick: rowData => {
         enableSingleRowClick && !routeToPass && setSingleSelectedRow(rowData.row);
         if (enableSingleRowClick && routeToPass) {
            // routeToPass may be a string OR (row) => string — function form
            // lets callers stamp row ids into the URL itself.
            const resolvedRoute = typeof routeToPass === 'function' ? routeToPass(rowData.row) : routeToPass;
            navigate(resolvedRoute, { state: { rowData: rowData.row } });
         }
      },
      onCellClick: (cellParams, event) => {
         if (typeof onAnyCellClick === 'function') {
            try {
               onAnyCellClick(cellParams);
            } catch (e) {
               // no-op
            }
         }
         if (!rowSelectionOnly) {
            event.stopPropagation(); // Prevent row selection on cell click
         }
         const { row, field, value } = cellParams;
         // Execute column click logic only if enableColumnsOnClick is set
         if (enableColumnsOnClick.length && matchingField(enableColumnsOnClick, field)) {
            const routeTo = matchingField(enableColumnsOnClick, field).route;
            const columnData = {
               ...row,
               columnName: field,
               columnValue: value
            };
            navigate(routeTo, { state: { rowData: columnData } });
         }
      },
      pageSize,
      getRowId: row => row.id,
      getCellClassName: params => (matchingField(enableColumnsOnClick, params.field) || enableSingleRowClick ? 'clickable-column' : '')
   };

   // Recompute widths only when the data changes (canvas-measures every cell).
   // eslint-disable-next-line react-hooks/exhaustive-deps
   const dynamicColumns = useMemo(() => rows && columns && getDynamicColumnWidths(rows, columns), [rows, columns]);

   // Build initial visibility model where listed columns are hidden
   const columnVisibilityModel = (initiallyHiddenColumns || []).reduce((acc, col) => {
      acc[col] = false;
      return acc;
   }, {});

   return (
      <Box
         sx={{
            height: passedHeight ? passedHeight : 680,
            width: 1,
            '.MuiDataGrid-cell.clickable-column:hover': {
               cursor: 'pointer'
            }
         }}
      >
         <DataGrid rows={rows ? rows : []} columns={columns ? dynamicColumns : []} initialState={{ columns: { columnVisibilityModel } }} {...gridProps} />
      </Box>
   );
};

export default DataGridTable;
