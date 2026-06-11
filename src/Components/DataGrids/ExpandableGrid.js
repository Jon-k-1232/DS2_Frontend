import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconButton, Box } from '@mui/material';
import CustomToolbar from './CustomToolbar';
import { filterGridByColumnName } from '../../Services/SharedFunctions';
import getDynamicColumnWidths from './DynamicColumnSizing';

const ExpandableGrid = ({
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
   idField,
   parentColumnName,
   displayColumnNames
}) => {
   const navigate = useNavigate();
   const [expandedRows, setExpandedRows] = useState(new Set());

   const { activeInvoices, treeGrid } = tableData || {};

   // Column filtering + date formatting walks every cell of every row (children
   // included — 44k rows on the Jobs grid), so it must only re-run when the data
   // actually changes, never on expand/selection re-renders.
   const { rows, columns } = useMemo(() => {
      if (displayColumnNames && displayColumnNames.length) {
         return filterGridByColumnName(treeGrid, displayColumnNames);
      }
      // rather than write over the json object, create a new one with the filtered data
      return { rows: treeGrid.rows, columns: treeGrid.columns };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [treeGrid, displayColumnNames && displayColumnNames.join(',')]);

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
            const selectedRowsData = newSelection.map(id => activeInvoices.find(row => row[idField] === id));
            setArrayOfSelectedRows(selectedRowsData);
         }
      },
      // Stops checkbox from selecting when clicking on the row, checkbox must be specifically selected
      onCellClick: (z, e) => {
         if (!rowSelectionOnly) e.stopPropagation();
      },
      onRowClick: rowData => {
         enableSingleRowClick && !routeToPass && setSingleSelectedRow(rowData.row);
         enableSingleRowClick && routeToPass && navigate(routeToPass, { state: { rowData: rowData.row } });
      },
      pageSize: 25,
      getRowId: row => row[idField]
   };

   const handleExpandClick = (e, rowId) => {
      e.stopPropagation();
      const newExpandedRows = new Set(expandedRows);
      if (expandedRows.has(rowId)) {
         newExpandedRows.delete(rowId);
      } else {
         newExpandedRows.add(rowId);
      }
      setExpandedRows(newExpandedRows);
   };

   // Modify the columns to include the expandable icon
   const modifiedColumns = useMemo(() => columns.map(column => {
      if (column.field === idField) {
         return {
            ...column,
            renderCell: params => {
               const isParent = params.row.children && params.row.children.length > 0;
               const isChild = params.row[parentColumnName] !== null && params.row[parentColumnName] !== params.row[idField];
               const rowId = params.row[idField];

               return (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     {isParent && (
                        <IconButton size='small' onClick={e => handleExpandClick(e, rowId)}>
                           {expandedRows.has(rowId) ? <ExpandMoreIcon style={{ color: '#00AB55' }} /> : <ExpandLessIcon style={{ color: '#00AB55' }} />}
                        </IconButton>
                     )}
                     <div style={{ paddingLeft: isChild ? '35px' : '0px' }}>{params.value}</div>
                  </div>
               );
            }
         };
      }
      return column;
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }), [columns, expandedRows, idField, parentColumnName]);

   // Flatten the tree for DataGrid.  For expanded parents, sort children descending
   // by ID (most recent first) and insert them immediately below the parent.
   // Use a copy for sorting so we never mutate the shared children array on the row.
   const flattenedData = useMemo(() => {
      const flattened = [];
      rows.forEach(row => {
         flattened.push(row);
         if (expandedRows.has(row[idField]) && row.children && row.children.length > 0) {
            const sortedChildren = [...row.children].sort((a, b) => b[idField] - a[idField]);
            sortedChildren.forEach(childRow => {
               flattened.push({ ...childRow });
            });
         }
      });
      return flattened;
   }, [rows, expandedRows, idField]);

   const dynamicColumns = useMemo(
      () => getDynamicColumnWidths(flattenedData, modifiedColumns),
      [flattenedData, modifiedColumns]
   );

   return (
      <Box sx={{ height: passedHeight ? passedHeight : 680, width: 1 }}>
         <DataGrid rows={flattenedData ? flattenedData : []} columns={columns ? dynamicColumns : []} {...gridProps} />
      </Box>
   );
};

export default ExpandableGrid;
