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
   hideGridTools
}) => {
   const navigate = useNavigate();
   const { rows, columns } = tableData;

   const gridProps = {
      density: 'compact',
      components: {
         Toolbar: props => <CustomToolbar {...props} hideGridTools={!hideGridTools} arrayOfButtons={arrayOfButtons} title={title} dialogSize={dialogSize} />
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
      // Stops checkbox from selecting when clicking on the row, checkbox must be specifically selected
      onCellClick: (z, e) => {
         if (!rowSelectionOnly) e.stopPropagation();
      },
      pageSize: 25,
      getRowId: row => row.id
   };

   const dynamicColumns = rows && columns && getDynamicColumnWidths(rows, columns);

   return (
      <Box sx={{ height: passedHeight ? passedHeight : 680, width: 1 }}>
         <DataGrid rows={rows ? rows : []} columns={columns ? dynamicColumns : []} {...gridProps} />
      </Box>
   );
};

export default DataGridTable;
