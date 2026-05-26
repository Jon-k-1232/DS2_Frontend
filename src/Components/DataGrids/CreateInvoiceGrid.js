import React, { useState, useEffect, useMemo } from 'react';
import { Checkbox, Box, TextField, FormControlLabel, Stack, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import getDynamicColumnWidths from './DynamicColumnSizing';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const fmtCurrency = v => (v == null ? '' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// Fields present in row data for logic purposes but not rendered as visible columns
const HIDDEN_FIELDS = new Set(['customer_id', 'write_off_count', 'customer_name', 'last_audit_at']);

const CURRENCY_FIELDS = {
   outstanding_invoice_total: 'Outstanding Balance',
   billable_transactions_total: 'New Work Total',
   invoice_total: 'Invoice Total'
};

export default function CreateInvoiceGridTable({ gridData, passedHeight, selectedRowsToInvoice, setSelectedRowsToInvoice }) {
   const [checkboxes, setCheckboxes] = useState({});
   const [textValues, setTextValues] = useState({});
   const [selectedRowIds, setSelectedRowIds] = useState([]);

   // Filter controls — hide-zero ON by default
   const [searchText, setSearchText] = useState('');
   const [hideZero, setHideZero] = useState(true);

   const gridProps = {
      onRowSelectionModelChange: newSelection => {
         setSelectedRowIds(newSelection || []);
      },
      checkboxSelection: true,
      pageSize: 25
   };

   // Clear selection when the filter changes so hidden rows don't stay selected
   useEffect(() => {
      setSelectedRowIds([]);
   }, [hideZero, searchText]);

   const CheckboxRenderer = props => {
      const rowId = props.id;
      const field = props.field;
      const isRowSelected = selectedRowIds.includes(rowId);
      const isChecked = checkboxes[rowId] && checkboxes[rowId][field];

      return (
         <Checkbox
            disabled={!isRowSelected}
            checked={isChecked || false}
            color='primary'
            onChange={e => {
               e.stopPropagation();
               setCheckboxes(prev => ({
                  ...prev,
                  [rowId]: { ...prev[rowId], [field]: e.target.checked }
               }));
            }}
            onClick={e => e.stopPropagation()}
         />
      );
   };

   const TextRenderer = props => {
      const rowId = props.id;
      const field = props.field;
      const value = textValues[rowId] && textValues[rowId][field];
      const isRowSelected = selectedRowIds.includes(rowId);

      return (
         <TextField
            disabled={!isRowSelected}
            variant='standard'
            size='small'
            sx={{ width: '300px' }}
            value={value || ''}
            onChange={e => {
               e.stopPropagation();
               setTextValues(prev => ({
                  ...prev,
                  [rowId]: { ...prev[rowId], [field]: e.target.value }
               }));
            }}
            label='(Optional) Note To Appear On Invoice'
            onKeyDown={e => {
               if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
                  e.stopPropagation();
               }
            }}
            onClick={e => e.stopPropagation()}
         />
      );
   };

   // Audit column — "Passed Audit Today" (green ✅) if the most recent audit
   // was today AND it passed, "Passed Audit [date]" muted if passed on a prior
   // day, blank if the most recent audit failed or none has ever run.  Backend
   // only sends last_audit_at when the most recent audit passed.
   const AuditRenderer = ({ row }) => {
      const val = row.last_audit_at;
      if (!val) return null;

      const auditDate = new Date(val);
      const now = new Date();
      const isToday =
         auditDate.getFullYear() === now.getFullYear() &&
         auditDate.getMonth() === now.getMonth() &&
         auditDate.getDate() === now.getDate();

      if (isToday) {
         return (
            <Stack direction='row' spacing={0.5} alignItems='center'>
               <CheckCircleIcon sx={{ color: '#02ab55', fontSize: 18 }} />
               <Typography variant='caption' sx={{ color: '#02ab55', fontWeight: 600 }}>
                  Passed Audit Today
               </Typography>
            </Stack>
         );
      }

      return (
         <Typography variant='caption' color='text.secondary'>
            {'Passed Audit '}
            {auditDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
         </Typography>
      );
   };

   // Base rows — stable so useMemo deps don't flap
   const rows = useMemo(
      () => gridData.rows.map(row => ({ ...row, invoiceNote: row.invoiceNote || '' })),
      [gridData]
   );

   // Client-side filtered rows
   const filteredRows = useMemo(() => {
      return rows.filter(row => {
         // Hide-zero uses the real invoice_total from the backend calculation engine
         if (hideZero && (Number(row.invoice_total) || 0) <= 0.005) return false;

         // Name search
         const term = searchText.trim().toLowerCase();
         if (term) {
            return (
               (row.display_name || '').toLowerCase().includes(term) ||
               (row.business_name || '').toLowerCase().includes(term) ||
               (row.customer_name || '').toLowerCase().includes(term)
            );
         }

         return true;
      });
   }, [rows, hideZero, searchText]);

   // Build visible columns:
   //   1. Auto-generated columns from backend, minus hidden fields
   //   2. Custom columns spliced in after display_name
   //   3. Currency formatting applied
   //   4. Audit column appended at the end
   const visibleAutoColumns = gridData.columns.filter(col => !HIDDEN_FIELDS.has(col.field));

   const showWriteOffsColumn = {
      field: 'showWriteOffs',
      headerName: 'Show Write Offs',
      width: 130,
      renderCell: CheckboxRenderer,
      disableClickEventBubbling: true,
      sortable: false
   };

   const writeOffsPresentColumn = {
      field: 'writeOffs',
      headerName: 'Write Offs',
      width: 90,
      renderCell: params =>
         params.row.write_off_count > 0 ? (
            <Box display='flex' justifyContent='center' width='100%'>
               <CheckIcon style={{ color: '#02ab55' }} />
            </Box>
         ) : null,
      disableClickEventBubbling: true,
      sortable: false
   };

   const invoiceNoteColumn = {
      field: 'invoiceNote',
      headerName: 'Invoice Note',
      width: 350,
      renderCell: TextRenderer,
      disableClickEventBubbling: true,
      sortable: false
   };

   const auditColumn = {
      field: 'last_audit_at',
      headerName: 'Audit Status',
      width: 160,
      renderCell: params => <AuditRenderer row={params.row} />,
      sortable: true
   };

   // Splice custom columns in after display_name:
   //   display_name → Show Write Offs → Write Offs → Audit Status → Invoice Note → …
   const allColumns = [...visibleAutoColumns];
   const displayNameIndex = allColumns.findIndex(col => col.field === 'display_name');
   const insertAt = displayNameIndex >= 0 ? displayNameIndex + 1 : allColumns.length;
   allColumns.splice(insertAt, 0, showWriteOffsColumn, writeOffsPresentColumn, auditColumn, invoiceNoteColumn);

   // Apply currency formatters and friendly header names
   const formattedColumns = allColumns.map(col => {
      if (CURRENCY_FIELDS[col.field]) {
         return {
            ...col,
            headerName: CURRENCY_FIELDS[col.field],
            width: 150,
            align: 'right',
            headerAlign: 'right',
            valueFormatter: params => fmtCurrency(params.value)
         };
      }
      return col;
   });

   const columns = getDynamicColumnWidths(filteredRows, formattedColumns);

   useEffect(() => {
      const selectedData = filteredRows
         .filter(row => {
            if (!selectedRowIds.includes(row.id)) return false;
            // Double-guard: strip zero-balance rows from submission when filter is active
            if (hideZero && (Number(row.invoice_total) || 0) <= 0.005) return false;
            return true;
         })
         .map(row => ({
            ...row,
            showWriteOffs: checkboxes[row.id]?.showWriteOffs || false,
            invoiceNote: textValues[row.id]?.invoiceNote || ''
         }));

      setSelectedRowsToInvoice(selectedData);
      // eslint-disable-next-line
   }, [selectedRowIds, checkboxes, textValues, filteredRows, hideZero]);

   const hiddenCount = rows.length - filteredRows.length;

   return (
      <Box>
         {/* Filter toolbar */}
         <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
            <TextField
               size='small'
               placeholder='Search by name or business'
               value={searchText}
               onChange={e => setSearchText(e.target.value)}
               sx={{ width: 280 }}
            />
            <FormControlLabel
               control={
                  <Checkbox
                     checked={hideZero}
                     onChange={e => setHideZero(e.target.checked)}
                     size='small'
                  />
               }
               label='Hide zero balance'
            />
            {hiddenCount > 0 && (
               <Typography variant='caption' color='text.secondary'>
                  {hiddenCount} row{hiddenCount === 1 ? '' : 's'} hidden
               </Typography>
            )}
         </Stack>

         <Box sx={{ height: passedHeight ? passedHeight : 680, width: 1 }}>
            <DataGrid rows={filteredRows} columns={columns} {...gridProps} />
         </Box>
      </Box>
   );
}
