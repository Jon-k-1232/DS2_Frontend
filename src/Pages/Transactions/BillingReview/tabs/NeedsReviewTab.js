import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { context } from '../../../../App';
import { fetchPendingHeldEntries, fetchReprocessCount, triggerReprocess } from '../../../../Services/ApiCalls/BillingReviewCalls';
import HoldReasonBadge from '../components/HoldReasonBadge';
import AiSuggestionChip from '../components/AiSuggestionChip';
import ReviewBillingDialog from '../components/ReviewBillingDialog';

const REPROCESS_MODES = [
   { value: 'unprocessed', label: 'Unprocessed (legacy + never-attempted)' },
   { value: 'errored', label: 'Bedrock errors only' },
   { value: 'all_held', label: 'Every held row (use sparingly)' }
];

const HOLD_REASON_OPTIONS = [
   { value: '', label: '(any)' },
   { value: 'no_matching_customer', label: 'No matching customer' },
   { value: 'low_ai_confidence', label: 'Low AI confidence' },
   { value: 'missing_required_field', label: 'Missing required field' },
   { value: 'ambiguous_category', label: 'Ambiguous category' },
   { value: 'new_customer_needs_addition', label: 'New customer needs addition' },
   { value: 'employee_not_matched', label: 'Employee not matched' },
   { value: 'bedrock_error', label: 'Bedrock error' },
   { value: 'ai_cost_cap_reached', label: 'AI cost cap reached' },
   { value: 'legacy_pre_ai', label: 'Legacy (pre-AI)' }
];

export default function NeedsReviewTab({ customerData, setCustomerData }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [rows, setRows] = useState([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
   const [error, setError] = useState('');
   const [selected, setSelected] = useState(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const [reprocessMode, setReprocessMode] = useState('unprocessed');
   const [reprocessCount, setReprocessCount] = useState(0);
   const [reprocessEligible, setReprocessEligible] = useState(false);
   const [reprocessing, setReprocessing] = useState(false);
   const [reprocessNotice, setReprocessNotice] = useState('');
   const [selectedIds, setSelectedIds] = useState(new Set());
   const reprocessPollRef = useRef(null);
   const [page, setPage] = useState(0);
   const [pageSize, setPageSize] = useState(50);

   // Filter state
   const [filterDateStart, setFilterDateStart] = useState('');
   const [filterDateEnd, setFilterDateEnd] = useState('');
   const [filterHoldReason, setFilterHoldReason] = useState('');
   const [filterEntity, setFilterEntity] = useState('');
   const [filterEmployee, setFilterEmployee] = useState('');
   const [filterTracker, setFilterTracker] = useState('');
   const [filterNotes, setFilterNotes] = useState('');
   const [filterAiMin, setFilterAiMin] = useState('');
   const [debouncedEntity, setDebouncedEntity] = useState('');
   const [debouncedEmployee, setDebouncedEmployee] = useState('');
   const [debouncedTracker, setDebouncedTracker] = useState('');
   const [debouncedNotes, setDebouncedNotes] = useState('');
   useEffect(() => { const t = setTimeout(() => setDebouncedEntity(filterEntity), 300); return () => clearTimeout(t); }, [filterEntity]);
   useEffect(() => { const t = setTimeout(() => setDebouncedEmployee(filterEmployee), 300); return () => clearTimeout(t); }, [filterEmployee]);
   useEffect(() => { const t = setTimeout(() => setDebouncedTracker(filterTracker), 300); return () => clearTimeout(t); }, [filterTracker]);
   useEffect(() => { const t = setTimeout(() => setDebouncedNotes(filterNotes), 300); return () => clearTimeout(t); }, [filterNotes]);

   const activeFilterCount = [
      filterDateStart, filterDateEnd, filterHoldReason,
      debouncedEntity, debouncedEmployee, debouncedTracker, debouncedNotes,
      filterAiMin
   ].filter(v => v !== '' && v != null).length;

   const clearFilters = () => {
      setFilterDateStart(''); setFilterDateEnd(''); setFilterHoldReason('');
      setFilterEntity(''); setFilterEmployee(''); setFilterTracker(''); setFilterNotes('');
      setFilterAiMin('');
      setPage(0);
   };

   const refreshReprocessCount = useCallback(async () => {
      const r = await fetchReprocessCount(accountID, userID, token, { mode: reprocessMode });
      setReprocessCount(Number(r?.count || 0));
      setReprocessEligible(Boolean(r?.eligible));
   }, [accountID, userID, token, reprocessMode]);

   const reload = useCallback(async () => {
      setLoading(true);
      setError('');
      const res = await fetchPendingHeldEntries(accountID, userID, token, {
         page: page + 1,
         limit: pageSize,
         dateStart: filterDateStart || undefined,
         dateEnd: filterDateEnd || undefined,
         holdReason: filterHoldReason || undefined,
         entityContains: debouncedEntity || undefined,
         employeeContains: debouncedEmployee || undefined,
         trackerContains: debouncedTracker || undefined,
         notesContains: debouncedNotes || undefined,
         aiConfMin: filterAiMin || undefined
      });
      if (res?.error) setError(res.error);
      setRows(res?.entries || []);
      setTotal(Number(res?.total || 0));
      setLoading(false);
      setHasLoadedOnce(true);
   }, [
      accountID, userID, token, page, pageSize,
      filterDateStart, filterDateEnd, filterHoldReason,
      debouncedEntity, debouncedEmployee, debouncedTracker, debouncedNotes,
      filterAiMin
   ]);

   useEffect(() => {
      setPage(0);
   }, [filterDateStart, filterDateEnd, filterHoldReason, debouncedEntity, debouncedEmployee, debouncedTracker, debouncedNotes, filterAiMin]);

   useEffect(() => {
      reload();
      refreshReprocessCount();
      return () => {
         if (reprocessPollRef.current) clearInterval(reprocessPollRef.current);
      };
   }, [reload, refreshReprocessCount]);

   const onEdit = entry => {
      setSelected(entry);
      setDialogOpen(true);
   };

   const onApplied = useCallback(async () => {
      await reload();
      await refreshReprocessCount();
   }, [reload, refreshReprocessCount]);

   const toggleRow = id => {
      setSelectedIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   };

   const toggleAll = () => {
      setSelectedIds(prev => {
         if (prev.size === rows.length && rows.length > 0) return new Set();
         return new Set(rows.map(r => r.timesheet_entry_id));
      });
   };

   const onReprocessSelected = async () => {
      if (selectedIds.size === 0) return;
      setReprocessing(true);
      setReprocessNotice('');
      try {
         const result = await triggerReprocess(accountID, userID, token, { ids: Array.from(selectedIds) });
         setReprocessNotice(`Queued ${result.queued} selected entries. Refreshing as the orchestrator works through them…`);
         setSelectedIds(new Set());
         let elapsed = 0;
         if (reprocessPollRef.current) clearInterval(reprocessPollRef.current);
         reprocessPollRef.current = setInterval(async () => {
            elapsed += 4;
            await reload();
            await refreshReprocessCount();
            if (elapsed >= 60) {
               clearInterval(reprocessPollRef.current);
               reprocessPollRef.current = null;
               setReprocessing(false);
               setReprocessNotice(prev => prev + ' (auto-refresh stopped — click again if more remain).');
            }
         }, 4000);
      } catch (err) {
         setReprocessNotice(`Failed: ${err.message}${err.code ? ` (${err.code})` : ''}`);
         setReprocessing(false);
      }
   };

   const onReprocess = async () => {
      setReprocessing(true);
      setReprocessNotice('');
      try {
         const result = await triggerReprocess(accountID, userID, token, { mode: reprocessMode });
         setReprocessNotice(`Queued ${result.queued} entries. Refreshing as the orchestrator works through them…`);
         // Poll the list every 4s for up to 60s; orchestrator runs background.
         let elapsed = 0;
         if (reprocessPollRef.current) clearInterval(reprocessPollRef.current);
         reprocessPollRef.current = setInterval(async () => {
            elapsed += 4;
            await reload();
            await refreshReprocessCount();
            if (elapsed >= 60) {
               clearInterval(reprocessPollRef.current);
               reprocessPollRef.current = null;
               setReprocessing(false);
               setReprocessNotice(prev => prev + ' (auto-refresh stopped — click again if more remain).');
            }
         }, 4000);
      } catch (err) {
         setReprocessNotice(`Failed: ${err.message}${err.code ? ` (${err.code})` : ''}`);
         setReprocessing(false);
      }
   };

   if (loading && !hasLoadedOnce) {
      return <Stack alignItems='center' sx={{ minHeight: 200, justifyContent: 'center' }}><CircularProgress /></Stack>;
   }

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
            <Stack direction='row' alignItems='center' spacing={1}>
               <Typography variant='subtitle2'>
                  {total} held entr{total === 1 ? 'y' : 'ies'} need review
                  {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
               </Typography>
               {loading && hasLoadedOnce && <CircularProgress size={14} thickness={5} />}
            </Stack>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
               <Button
                  variant='contained'
                  color='secondary'
                  size='small'
                  disabled={reprocessing || !reprocessEligible || selectedIds.size === 0}
                  onClick={onReprocessSelected}
                  title={!reprocessEligible ? 'TIME_TRACKER_AI_FEATURE_FLAG must be on for this account' : ''}
               >
                  {reprocessing ? 'Processing…' : `Run AI on ${selectedIds.size} selected`}
               </Button>
               <Select size='small' value={reprocessMode} onChange={e => setReprocessMode(e.target.value)} sx={{ minWidth: 280 }}>
                  {REPROCESS_MODES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
               </Select>
               <Button
                  variant='contained'
                  color='primary'
                  size='small'
                  disabled={reprocessing || !reprocessEligible || reprocessCount === 0}
                  onClick={onReprocess}
                  title={!reprocessEligible ? 'TIME_TRACKER_AI_FEATURE_FLAG must be on for this account' : ''}
               >
                  {reprocessing ? 'Processing…' : `Run AI on ${reprocessCount} pending`}
               </Button>
            </Stack>
         </Stack>
         {!reprocessEligible && (
            <Alert severity='info'>
               The AI pipeline isn't enabled for this account yet. Set <code>TIME_TRACKER_AI_FEATURE_FLAG=test</code> and add this account to <code>TIME_TRACKER_AI_TEST_ACCOUNT_IDS</code> to enable the reprocess button.
            </Alert>
         )}
         {reprocessNotice && <Alert severity='info'>{reprocessNotice}</Alert>}
         {error && <Alert severity='error'>{error}</Alert>}
         <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
               <Typography variant='subtitle2'>Filters</Typography>
               {activeFilterCount > 0 && (
                  <>
                     <Chip size='small' label={`${activeFilterCount} active`} color='primary' />
                     <Button size='small' onClick={clearFilters}>Clear all</Button>
                  </>
               )}
               <Typography variant='caption' color='text.secondary'>
                  All filters combine (AND). Free-text fields debounce by 300ms.
               </Typography>
            </Stack>
            <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
               <TextField
                  size='small'
                  type='date'
                  label='Date from'
                  InputLabelProps={{ shrink: true }}
                  value={filterDateStart}
                  onChange={e => setFilterDateStart(e.target.value)}
                  sx={{ minWidth: 160 }}
               />
               <TextField
                  size='small'
                  type='date'
                  label='Date to'
                  InputLabelProps={{ shrink: true }}
                  value={filterDateEnd}
                  onChange={e => setFilterDateEnd(e.target.value)}
                  sx={{ minWidth: 160 }}
               />
               <TextField
                  select
                  size='small'
                  label='Hold reason'
                  value={filterHoldReason}
                  onChange={e => setFilterHoldReason(e.target.value)}
                  sx={{ minWidth: 220 }}
               >
                  {HOLD_REASON_OPTIONS.map(o => (
                     <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
               </TextField>
               <TextField
                  size='small'
                  label='Entity contains'
                  value={filterEntity}
                  onChange={e => setFilterEntity(e.target.value)}
                  sx={{ minWidth: 180 }}
               />
               <TextField
                  size='small'
                  label='Employee contains'
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  sx={{ minWidth: 180 }}
               />
               <TextField
                  size='small'
                  label='Time tracker contains'
                  value={filterTracker}
                  onChange={e => setFilterTracker(e.target.value)}
                  placeholder='Johnson_Marsha…'
                  sx={{ minWidth: 200 }}
               />
               <TextField
                  size='small'
                  label='Notes contains'
                  value={filterNotes}
                  onChange={e => setFilterNotes(e.target.value)}
                  sx={{ minWidth: 200 }}
               />
               <TextField
                  size='small'
                  type='number'
                  label='AI conf min'
                  value={filterAiMin}
                  onChange={e => setFilterAiMin(e.target.value)}
                  inputProps={{ step: '0.05', min: '0', max: '1' }}
                  placeholder='0.85'
                  sx={{ width: 130 }}
               />
            </Stack>
         </Box>
         {rows.length === 0 ? (
            <Alert severity='success'>0 rows need attention. AI auto-applied everything from this period.</Alert>
         ) : (
            <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
               <Table size='small' stickyHeader>
                  <TableHead>
                     <TableRow>
                        <TableCell padding='checkbox'>
                           <Checkbox
                              size='small'
                              checked={rows.length > 0 && selectedIds.size === rows.length}
                              indeterminate={selectedIds.size > 0 && selectedIds.size < rows.length}
                              onChange={toggleAll}
                           />
                        </TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Entity</TableCell>
                        <TableCell>Employee</TableCell>
                        <TableCell>Hold reason</TableCell>
                        <TableCell>AI suggestion</TableCell>
                        <TableCell>Notes preview</TableCell>
                        <TableCell></TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map(r => (
                        <TableRow key={r.timesheet_entry_id} hover selected={selectedIds.has(r.timesheet_entry_id)}>
                           <TableCell padding='checkbox'>
                              <Checkbox
                                 size='small'
                                 checked={selectedIds.has(r.timesheet_entry_id)}
                                 onChange={() => toggleRow(r.timesheet_entry_id)}
                              />
                           </TableCell>
                           <TableCell>{r.date}</TableCell>
                           <TableCell>{r.entity || r.suggested_customer_display || '—'}</TableCell>
                           <TableCell>{r.employee_name || '—'}</TableCell>
                           <TableCell><HoldReasonBadge reason={r.hold_reason} /></TableCell>
                           <TableCell><AiSuggestionChip entry={r} /></TableCell>
                           <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>{r.notes}</TableCell>
                           <TableCell>
                              <Button size='small' onClick={() => onEdit(r)}>Edit</Button>
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
               <TablePagination
                  component='div'
                  count={total}
                  page={page}
                  onPageChange={(_e, newPage) => setPage(newPage)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  showFirstButton
                  showLastButton
               />
            </Box>
         )}
         <ReviewBillingDialog
            open={dialogOpen}
            entry={selected}
            onClose={() => setDialogOpen(false)}
            onApplied={onApplied}
            customerData={customerData}
            setCustomerData={setCustomerData}
         />
      </Stack>
   );
}
