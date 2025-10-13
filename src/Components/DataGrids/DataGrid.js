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
   pageSize = 5
}) => {
   const navigate = useNavigate();
   const { rows, columns } = tableData;

   const matchingField = (array, field) => array.find(column => column.field === field);

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
            />
         )
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
         enableSingleRowClick && routeToPass && navigate(routeToPass, { state: { rowData: rowData.row } });
      },
      onCellClick: (cellParams, event) => {
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

   const dynamicColumns = rows && columns && getDynamicColumnWidths(rows, columns);

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
         <DataGrid rows={rows ? rows : []} columns={columns ? dynamicColumns : []} {...gridProps} />
      </Box>
   );
};

export default DataGridTable;
