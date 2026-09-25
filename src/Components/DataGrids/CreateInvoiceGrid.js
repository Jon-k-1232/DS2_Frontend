import React, { useState, useEffect, useMemo } from 'react';
import { Checkbox, Chip, Box, TextField, FormControlLabel, Stack, Typography } from '@mui/material';
import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF } from '@mui/x-data-grid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import getDynamicColumnWidths from './DynamicColumnSizing';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const fmtCurrency = v => (v == null ? '' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// Fields present in row data for logic purposes but not rendered as visible columns
const HIDDEN_FIELDS = new Set(['customer_id', 'write_off_count', 'customer_name', 'last_audit_at', 'billed_today', 'is_credit_statement']);

const CURRENCY_FIELDS = {
   outstanding_invoice_total: 'Outstanding Balance',
   billable_transactions_total: 'New Work Total',
   invoice_total: 'Invoice Total'
};

export default function CreateInvoiceGridTable({ gridData, passedHeight, selectedRowsToInvoice, setSelectedRowsToInvoice, batchRevision = 0, completedCustomerIds = [] }) {
   const [checkboxes, setCheckboxes] = useState({});
   const [textValues, setTextValues] = useState({});
   const [selectedRowIds, setSelectedRowIds] = useState([]);
   const [selectedCreditIds, setSelectedCreditIds] = useState([]);

   // A committed batch (the parent bumps batchRevision) clears the selection so
   // checked rows always equal the submitted batch — but only the drafts (per-row
   // invoice note, show-write-offs) of customers whose statement was actually
   // created are discarded. A customer the backend SKIPPED (already billed today,
   // credit balance) keeps the note and flag the accountant typed, so the retry
   // does not silently lose unsaved billing instructions. Remounting the whole
   // grid used to wipe every draft, search text and filter choice.
   useEffect(() => {
      if (!batchRevision) return;
      const completed = new Set((completedCustomerIds || []).map(String));
      const keepSkippedDrafts = values => Object.fromEntries(Object.entries(values).filter(([id]) => !completed.has(String(id))));
      setSelectedRowIds([]);
      setSelectedCreditIds([]);
      setCheckboxes(keepSkippedDrafts);
      setTextValues(keepSkippedDrafts);
      // completedCustomerIds always arrives together with a new batchRevision.
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [batchRevision]);

   useEffect(() => {
      setSelectedCreditIds(prev => prev.filter(id => selectedRowIds.includes(id)));
   }, [selectedRowIds]);

   // Filter controls — hide-zero ON by default
   const [searchText, setSearchText] = useState('');
   const [hideZero, setHideZero] = useState(true);

   const gridProps = {
      // Row identity is customer_id, not the grid's positional row index —
      // checkboxes/notes/write-off toggles below are keyed off whatever id
      // DataGrid resolves here, so this makes that key stable across filter
      // changes and re-fetches instead of a position that can shift under it.
      getRowId: row => row.customer_id,
      // Controlled selection: selectedRowIds is the single source of truth, so
      // the DataGrid's own visible checked state can never drift from what
      // actually gets submitted (it used to be uncontrolled — DataGrid tracked
      // its own internal selection and this only ever RECEIVED changes via
      // onRowSelectionModelChange, so a header "select all" click could leave
      // a billed-today row visibly checked while the row-count-based guard
      // below silently dropped it from state, or vice versa). Row-vs-header
      // provenance no longer needs to be inferred from how many ids changed at
      // once — the header checkbox is a separate, eligible-only control below.
      rowSelectionModel: selectedRowIds,
      onRowSelectionModelChange: selection => {
         const next = selection || [];
         const addedCredits = next.filter(id => !selectedRowIds.includes(id) && gridData.rows.some(row => row.customer_id === id && Number(row.invoice_total) < 0));
         setSelectedCreditIds(prev => [...new Set([...prev.filter(id => next.includes(id)), ...addedCredits])]);
         setSelectedRowIds(next);
      },
      checkboxSelection: true,
      pageSize: 25
   };

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
   // only sends last_audit_at when the most recent audit passed. A row already
   // billed today takes priority over all of that — it's a same-day-rebill
   // hazard, not an audit result, so it gets its own warning chip instead.
   const AuditRenderer = ({ row }) => {
      if (row.billed_today) {
         return (
            <Chip
               size='small'
               color='warning'
               icon={<WarningAmberIcon fontSize='small' />}
               label='Billed today'
            />
         );
      }

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
         // Hide-zero uses the real invoice_total from the backend calculation
         // engine. Must compare the MAGNITUDE — a credit balance (negative
         // invoice_total) is not "zero" and shouldn't be swept away with it.
         if (hideZero && !Number(row.retainer_event_count) && Math.abs(Number(row.invoice_total) || 0) < 0.005) return false;

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

   // Re-derive selection when the filter changes: drop any selected customer_id
   // that the current filter no longer shows, but leave everything still
   // visible selected. This used to unconditionally clear ALL selections on
   // every filter keystroke/toggle, which — combined with the old positional
   // (not customer_id) row key — could also silently reselect the wrong row.
   useEffect(() => {
      setSelectedRowIds(prevSelected => prevSelected.filter(id => filteredRows.some(row => row.customer_id === id)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filteredRows]);

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
   const creditColumn = { field: 'statement_type', headerName: 'Statement', width: 190, renderCell: ({ row }) => Number(row.invoice_total) < 0 ? <Chip size='small' color='info' label='Credit — no payment due' /> : null };
   const allColumns = [...visibleAutoColumns];
   // Override just the header of the checkbox-selection column DataGrid injects
   // for checkboxSelection: true (GRID_CHECKBOX_SELECTION_COL_DEF's field,
   // '__check__' — merged with, not replacing, DataGrid's own column, so the
   // per-row cell checkbox rendering is untouched and every row — including a
   // billed-today one — stays individually selectable by clicking its own
   // checkbox). The header checkbox becomes "select all ELIGIBLE (not
   // billed-today) visible rows" instead of "select every visible row": a row
   // already billed today is a same-day-rebill hazard (see AuditRenderer) and
   // must never be swept in by a bulk select-all, only picked individually.
   allColumns.unshift({
      ...GRID_CHECKBOX_SELECTION_COL_DEF,
      renderHeader: () => {
         const eligibleIds = filteredRows.filter(row => !row.billed_today && Number(row.invoice_total) >= 0).map(row => row.customer_id);
         const selectedEligibleCount = eligibleIds.filter(id => selectedRowIds.includes(id)).length;
         return (
            <Checkbox
               inputProps={{
                  'aria-label': 'Select all visible debit or zero customers not billed today',
                  // Explicit tri-state ARIA value — DataGrid's own header
                  // checkbox derives this automatically, but this replacement
                  // Checkbox does not, so screen readers previously heard only
                  // "checked"/"not checked", never "mixed", for a partial
                  // selection (see indeterminate note below re: native state).
                  'aria-checked': selectedEligibleCount > 0 && selectedEligibleCount < eligibleIds.length
                     ? 'mixed' : eligibleIds.length > 0 && selectedEligibleCount === eligibleIds.length
               }}
               // MUI's DataGrid header cancels a bubbled Space (it means "page
               // down" to the grid), so this custom header checkbox must own
               // Space itself or it's mouse-only. event.repeat guards against
               // OS key-repeat re-toggling on every repeat tick while held.
               onKeyDown={event => {
                  if (event.key !== ' ') return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!eligibleIds.length || event.repeat) return;
                  setSelectedRowIds(prev => selectedEligibleCount === eligibleIds.length
                     ? prev.filter(id => !eligibleIds.includes(id))
                     : [...new Set([...prev, ...eligibleIds])]);
               }}
               disabled={!eligibleIds.length}
               checked={eligibleIds.length > 0 && selectedEligibleCount === eligibleIds.length}
               // MUI's indeterminate prop only swaps the visual icon — it does
               // not set the native input.indeterminate DOM property. The
               // aria-checked="mixed" above is what assistive tech actually
               // reads, so that's the accessible source of truth here.
               indeterminate={selectedEligibleCount > 0 && selectedEligibleCount < eligibleIds.length}
               onChange={event => {
                  const checked = event.target.checked;
                  setSelectedRowIds(prev => (checked ? [...new Set([...prev, ...eligibleIds])] : prev.filter(id => !eligibleIds.includes(id))));
               }}
            />
         );
      }
   });
   const displayNameIndex = allColumns.findIndex(col => col.field === 'display_name');
   const insertAt = displayNameIndex >= 0 ? displayNameIndex + 1 : allColumns.length;
   allColumns.splice(insertAt, 0, creditColumn, showWriteOffsColumn, writeOffsPresentColumn, auditColumn, invoiceNoteColumn);

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
            if (!selectedRowIds.includes(row.customer_id)) return false;
            // Double-guard: strip zero-balance rows from submission when filter is
            // active — by magnitude, so a credit balance is never swept out.
            if (hideZero && !Number(row.retainer_event_count) && Math.abs(Number(row.invoice_total) || 0) < 0.005) return false;
            return true;
         })
         .map(row => ({
            ...row,
            includeCreditStatement: selectedCreditIds.includes(row.customer_id),
            issueReason: Number(row.invoice_total) < 0 ? 'Finalize explicitly selected credit statement (sent and locked).' : 'Finalize selected statement (sent and locked).',
            showWriteOffs: checkboxes[row.customer_id]?.showWriteOffs || false,
            invoiceNote: textValues[row.customer_id]?.invoiceNote || ''
         }));

      setSelectedRowsToInvoice(selectedData);
      // eslint-disable-next-line
   }, [selectedRowIds, selectedCreditIds, checkboxes, textValues, filteredRows, hideZero]);

   const hiddenCount = rows.length - filteredRows.length;

   return (
      <Box>
         <Typography variant='body2' sx={{ mb: 1 }}>Credit balances are not selected by Select all. Select each credit customer to issue a credit statement; skipped activity stays pending. Drafts stay editable. Finalize means sent and locks the statement and its items.</Typography>
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
