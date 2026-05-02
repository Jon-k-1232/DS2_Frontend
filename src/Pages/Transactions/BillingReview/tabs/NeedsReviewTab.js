import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography } from '@mui/material';
import { context } from '../../../../App';
import { fetchPendingHeldEntries, fetchReprocessCount, fetchDistinctEntities, triggerReprocess } from '../../../../Services/ApiCalls/BillingReviewCalls';
import HoldReasonBadge from '../components/HoldReasonBadge';
import ReviewBillingDialog from '../components/ReviewBillingDialog';

const NA = 'Not Available';

const _formatDateMDY = d => {
   if (!d) return NA;
   const iso = typeof d === 'string' ? d.slice(0, 10) : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
   const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
   return m ? `${m[2]}-${m[3]}-${m[1]}` : NA;
};

const _trim = (s, max = 80) => {
   if (!s) return '';
   return s.length > max ? `${s.slice(0, max)}…` : s;
};

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

   const [reprocessCount, setReprocessCount] = useState(0);
   const [reprocessEligible, setReprocessEligible] = useState(false);
   const [reprocessing, setReprocessing] = useState(false);
   const [reprocessNotice, setReprocessNotice] = useState('');
   const [selectedIds, setSelectedIds] = useState(new Set());
   const reprocessPollRef = useRef(null);
   const [page, setPage] = useState(0);
   const [pageSize, setPageSize] = useState(50);

   // Filter state — mirrors ConsolidatedTab where the field exists in this dataset.
   const [filterCustomerId, setFilterCustomerId] = useState('');
   const [filterEmployeeUserId, setFilterEmployeeUserId] = useState('');
   const [filterWorkDescId, setFilterWorkDescId] = useState('');
   const [filterDateStart, setFilterDateStart] = useState('');
   const [filterDateEnd, setFilterDateEnd] = useState('');
   const [filterHoldReason, setFilterHoldReason] = useState('');
   const [filterEntity, setFilterEntity] = useState('');
   const [filterEmployee, setFilterEmployee] = useState('');
   const [filterTracker, setFilterTracker] = useState('');
   const [filterNotes, setFilterNotes] = useState('');
   const [debouncedEmployee, setDebouncedEmployee] = useState('');
   const [debouncedTracker, setDebouncedTracker] = useState('');
   const [debouncedNotes, setDebouncedNotes] = useState('');
   useEffect(() => { const t = setTimeout(() => setDebouncedEmployee(filterEmployee), 300); return () => clearTimeout(t); }, [filterEmployee]);
   useEffect(() => { const t = setTimeout(() => setDebouncedTracker(filterTracker), 300); return () => clearTimeout(t); }, [filterTracker]);
   useEffect(() => { const t = setTimeout(() => setDebouncedNotes(filterNotes), 300); return () => clearTimeout(t); }, [filterNotes]);

   const customers = customerData?.customersList?.activeCustomerData?.activeCustomers || [];
   const employees = customerData?.teamMembersList?.activeUserData?.activeUsers || [];
   const workDescriptions = customerData?.workDescriptionsList?.activeWorkDescriptionsData?.workDescriptions || [];

   // Distinct entities for the dropdown
   const [entityOptions, setEntityOptions] = useState([]);
   useEffect(() => {
      fetchDistinctEntities(accountID, userID, token).then(setEntityOptions);
   }, [accountID, userID, token]);

   // Sort state
   const [sortField, setSortField] = useState('created_at');
   const [sortDirection, setSortDirection] = useState('desc');
   const handleSort = field => {
      if (sortField === field) {
         setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
         setSortField(field);
         setSortDirection('asc');
      }
   };
   const sortHeaderProps = field => ({
      active: sortField === field,
      direction: sortField === field ? sortDirection : 'asc',
      onClick: () => handleSort(field)
   });

   const activeFilterCount = [
      filterCustomerId, filterEmployeeUserId, filterWorkDescId,
      filterDateStart, filterDateEnd, filterHoldReason,
      filterEntity, debouncedEmployee, debouncedTracker, debouncedNotes
   ].filter(v => v !== '' && v != null).length;

   const clearFilters = () => {
      setFilterCustomerId(''); setFilterEmployeeUserId(''); setFilterWorkDescId('');
      setFilterDateStart(''); setFilterDateEnd(''); setFilterHoldReason('');
      setFilterEntity(''); setFilterEmployee(''); setFilterTracker(''); setFilterNotes('');
      setPage(0);
   };

   const refreshReprocessCount = useCallback(async () => {
      // No mode dropdown anymore — always count "all held". Filters narrow what's
      // visible in the table; multi-select still scopes the per-selection button.
      const r = await fetchReprocessCount(accountID, userID, token, { mode: 'all_held' });
      setReprocessCount(Number(r?.count || 0));
      setReprocessEligible(Boolean(r?.eligible));
   }, [accountID, userID, token]);

   const reload = useCallback(async () => {
      setLoading(true);
      setError('');
      const res = await fetchPendingHeldEntries(accountID, userID, token, {
         page: page + 1,
         limit: pageSize,
         dateStart: filterDateStart || undefined,
         dateEnd: filterDateEnd || undefined,
         holdReason: filterHoldReason || undefined,
         entityEquals: filterEntity || undefined,
         employeeContains: debouncedEmployee || undefined,
         trackerContains: debouncedTracker || undefined,
         notesContains: debouncedNotes || undefined,
         customerId: filterCustomerId || undefined,
         employeeUserId: filterEmployeeUserId || undefined,
         workDescId: filterWorkDescId || undefined,
         sortField,
         sortDirection
      });
      if (res?.error) setError(res.error);
      setRows(res?.entries || []);
      setTotal(Number(res?.total || 0));
      setLoading(false);
      setHasLoadedOnce(true);
   }, [
      accountID, userID, token, page, pageSize,
      filterCustomerId, filterEmployeeUserId, filterWorkDescId,
      filterDateStart, filterDateEnd, filterHoldReason,
      filterEntity, debouncedEmployee, debouncedTracker, debouncedNotes,
      sortField, sortDirection
   ]);

   useEffect(() => {
      setPage(0);
   }, [
      filterCustomerId, filterEmployeeUserId, filterWorkDescId,
      filterDateStart, filterDateEnd, filterHoldReason,
      filterEntity, debouncedEmployee, debouncedTracker, debouncedNotes
   ]);

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

   const startReprocessPolling = () => {
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
   };

   const onReprocessSelected = async () => {
      if (selectedIds.size === 0) return;
      setReprocessing(true);
      setReprocessNotice('');
      try {
         const result = await triggerReprocess(accountID, userID, token, { ids: Array.from(selectedIds) });
         setReprocessNotice(`Queued ${result.queued} selected entries. Refreshing as the orchestrator works through them…`);
         setSelectedIds(new Set());
         startReprocessPolling();
      } catch (err) {
         setReprocessNotice(`Failed: ${err.message}${err.code ? ` (${err.code})` : ''}`);
         setReprocessing(false);
      }
   };

   const onReprocess = async () => {
      setReprocessing(true);
      setReprocessNotice('');
      try {
         const result = await triggerReprocess(accountID, userID, token, { mode: 'all_held' });
         setReprocessNotice(`Queued ${result.queued} entries. Refreshing as the orchestrator works through them…`);
         startReprocessPolling();
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
            {/* Filter order matches column order: Date · Entity · Customer · Work Desc · Notes · Hold reason · Employee · Time tracker */}
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
                  label='Entity'
                  value={filterEntity}
                  onChange={e => setFilterEntity(e.target.value)}
                  sx={{ minWidth: 200 }}
               >
                  <MenuItem value=''>(any)</MenuItem>
                  {entityOptions.map(e => (
                     <MenuItem key={e} value={e}>{e}</MenuItem>
                  ))}
               </TextField>
               <TextField
                  select
                  size='small'
                  label='Customer'
                  value={filterCustomerId}
                  onChange={e => setFilterCustomerId(e.target.value)}
                  sx={{ minWidth: 220 }}
               >
                  <MenuItem value=''>(any)</MenuItem>
                  {customers.map(c => (
                     <MenuItem key={c.customer_id} value={c.customer_id}>{c.display_name}</MenuItem>
                  ))}
               </TextField>
               <TextField
                  select
                  size='small'
                  label='Work description'
                  value={filterWorkDescId}
                  onChange={e => setFilterWorkDescId(e.target.value)}
                  sx={{ minWidth: 200 }}
               >
                  <MenuItem value=''>(any)</MenuItem>
                  {workDescriptions.map(w => (
                     <MenuItem key={w.general_work_description_id} value={w.general_work_description_id}>
                        {w.general_work_description}
                     </MenuItem>
                  ))}
               </TextField>
               <TextField
                  size='small'
                  label='Notes contains'
                  value={filterNotes}
                  onChange={e => setFilterNotes(e.target.value)}
                  sx={{ minWidth: 200 }}
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
                  select
                  size='small'
                  label='Employee'
                  value={filterEmployeeUserId}
                  onChange={e => setFilterEmployeeUserId(e.target.value)}
                  sx={{ minWidth: 180 }}
               >
                  <MenuItem value=''>(any)</MenuItem>
                  {employees.map(u => (
                     <MenuItem key={u.user_id} value={u.user_id}>{u.display_name}</MenuItem>
                  ))}
               </TextField>
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
            </Stack>
         </Box>
         {rows.length === 0 ? (
            <Alert severity='success'>0 rows match the current filters. Either everything's been applied or the filters are too narrow.</Alert>
         ) : (
            <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
               <Table size='small' stickyHeader sx={{ minWidth: 1700, '& th, & td': { px: 1.25, py: 0.75 } }}>
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
                        <TableCell sx={{ minWidth: 110 }}>
                           <TableSortLabel {...sortHeaderProps('date')}>Date</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                           <TableSortLabel {...sortHeaderProps('entity')}>Entity</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                           <TableSortLabel {...sortHeaderProps('customer')}>Customer</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Job</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                           <TableSortLabel {...sortHeaderProps('work_description')}>Work Description</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 280 }}>Notes</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                           <TableSortLabel {...sortHeaderProps('hold_reason')}>Hold reason</TableSortLabel>
                        </TableCell>
                        <TableCell align='right' sx={{ minWidth: 80 }}>
                           <TableSortLabel {...sortHeaderProps('hours')}>Hours</TableSortLabel>
                        </TableCell>
                        <TableCell align='right' sx={{ minWidth: 100 }}>Total</TableCell>
                        <TableCell sx={{ minWidth: 110 }}>Billable</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                           <TableSortLabel {...sortHeaderProps('employee')}>Employee</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                           <TableSortLabel {...sortHeaderProps('timesheet_name')}>Time tracker</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 80, width: 80 }}></TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map(r => {
                        const hours = r.duration != null ? (Number(r.duration) / 60).toFixed(2) : null;
                        const customerLabel =
                           r.suggested_customer_display ||
                           r.suggested_customer_display_name ||
                           r.company_name ||
                           [r.first_name, r.last_name].filter(Boolean).join(' ') ||
                           NA;
                        return (
                           <TableRow key={r.timesheet_entry_id} hover selected={selectedIds.has(r.timesheet_entry_id)}>
                              <TableCell padding='checkbox'>
                                 <Checkbox
                                    size='small'
                                    checked={selectedIds.has(r.timesheet_entry_id)}
                                    onChange={() => toggleRow(r.timesheet_entry_id)}
                                 />
                              </TableCell>
                              <TableCell>{_formatDateMDY(r.date)}</TableCell>
                              <TableCell>{r.entity || NA}</TableCell>
                              <TableCell>{customerLabel}</TableCell>
                              {/* Job — held entries don't have a job until applied */}
                              <TableCell>{NA}</TableCell>
                              <TableCell>{r.suggested_work_description || r.category || NA}</TableCell>
                              <TableCell sx={{ maxWidth: 280 }}>
                                 {r.notes ? (
                                    <Tooltip title={r.notes}>
                                       <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {_trim(r.notes, 60)}
                                       </span>
                                    </Tooltip>
                                 ) : (
                                    <em style={{ color: '#888' }}>(empty)</em>
                                 )}
                              </TableCell>
                              <TableCell><HoldReasonBadge reason={r.hold_reason} /></TableCell>
                              <TableCell align='right'>{hours != null ? hours : NA}</TableCell>
                              {/* Total — no billing rate locked in until apply */}
                              <TableCell align='right'>{NA}</TableCell>
                              {/* Billable — decided at apply time */}
                              <TableCell>{NA}</TableCell>
                              <TableCell>{r.employee_name || NA}</TableCell>
                              <TableCell>
                                 {r.timesheet_name ? (
                                    <Tooltip title={r.timesheet_name}>
                                       <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                          {_trim(r.timesheet_name, 32)}
                                       </span>
                                    </Tooltip>
                                 ) : (
                                    NA
                                 )}
                              </TableCell>
                              <TableCell>
                                 <Button size='small' onClick={() => onEdit(r)}>Edit</Button>
                              </TableCell>
                           </TableRow>
                        );
                     })}
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
