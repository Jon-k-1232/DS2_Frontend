import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
   Alert,
   Box,
   Button,
   Checkbox,
   Chip,
   CircularProgress,
   FormControlLabel,
   MenuItem,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TablePagination,
   TableRow,
   TableSortLabel,
   TextField,
   Tooltip,
   Typography
} from '@mui/material';
import { context } from '../../../../App';
import { fetchConsolidatedTransactions, fetchDistinctEntities, updateFinalizedTransaction } from '../../../../Services/ApiCalls/BillingReviewCalls';
import CascadeImpactPanel from '../components/CascadeImpactPanel';
import AutoCompleteWithDialog from '../../../../Components/Dialogs/AutoCompleteWithDialog';
import NewJob from '../../../Jobs/JobForms/AddJob/NewJob';

const _todayISO = (offsetDays = 0) => {
   const d = new Date();
   d.setUTCDate(d.getUTCDate() + offsetDays);
   return d.toISOString().slice(0, 10);
};

const _startOfWeek = () => {
   const d = new Date();
   const day = d.getUTCDay() || 7;
   d.setUTCDate(d.getUTCDate() - (day - 1));
   return d.toISOString().slice(0, 10);
};

const _startOfMonth = () => {
   const d = new Date();
   d.setUTCDate(1);
   return d.toISOString().slice(0, 10);
};

const _fortyFiveDaysAgo = () => {
   const d = new Date();
   d.setUTCDate(d.getUTCDate() - 45);
   return d.toISOString().slice(0, 10);
};

const _isValidISODate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s).getTime());

const _confidenceColor = c => {
   if (c == null) return 'default';
   const n = Number(c);
   if (n < 0.85) return 'error';
   if (n < 0.92) return 'warning';
   return 'success';
};

const NA = 'Not Available';

const _formatDateMDY = d => {
   if (!d) return NA;
   const iso = typeof d === 'string' ? d.slice(0, 10) : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
   const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
   return m ? `${m[2]}-${m[3]}-${m[1]}` : NA;
};

const _trim = (s, max = 90) => {
   if (!s) return '';
   return s.length > max ? `${s.slice(0, max)}…` : s;
};

export default function ConsolidatedTab({ period, customerData, setCustomerData }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const initialStart = period === 'unbilled' ? _fortyFiveDaysAgo() : period === 'month' ? _startOfMonth() : _startOfWeek();
   const [start, setStart] = useState(initialStart);
   const [end, setEnd] = useState(_todayISO());
   const [rows, setRows] = useState([]);
   const [totalSum, setTotalSum] = useState(0);
   const [totalCount, setTotalCount] = useState(0);
   const [loading, setLoading] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [edits, setEdits] = useState({});
   const [error, setError] = useState('');
   const [sideEffects, setSideEffects] = useState([]);
   // Default to AI-only — most reviewers care about what the AI just auto-applied,
   // not the long tail of manually-added rows.
   const [aiOnly, setAiOnly] = useState(true);
   const [page, setPage] = useState(0);
   const [pageSize, setPageSize] = useState(50);
   // Inline-edit Job dropdown's "Add New Job" dialog state. Only one row edits
   // at a time so a single piece of state covers all rows.
   const [jobDialogOpen, setJobDialogOpen] = useState(false);

   // Filter state — controls combine on the backend with AND.
   const [filterCustomerId, setFilterCustomerId] = useState('');
   const [filterEmployeeUserId, setFilterEmployeeUserId] = useState('');
   const [filterWorkDescId, setFilterWorkDescId] = useState('');
   const [filterJob, setFilterJob] = useState('');
   const [filterNote, setFilterNote] = useState('');
   const [filterEntity, setFilterEntity] = useState('');
   const [filterAiMin, setFilterAiMin] = useState('');
   const [filterBillable, setFilterBillable] = useState(''); // '' | 'true' | 'false'
   const [debouncedJob, setDebouncedJob] = useState('');
   const [debouncedNote, setDebouncedNote] = useState('');
   useEffect(() => { const t = setTimeout(() => setDebouncedJob(filterJob), 300); return () => clearTimeout(t); }, [filterJob]);
   useEffect(() => { const t = setTimeout(() => setDebouncedNote(filterNote), 300); return () => clearTimeout(t); }, [filterNote]);

   // Distinct entities for the Entity dropdown — fetched once on mount
   const [entityOptions, setEntityOptions] = useState([]);
   useEffect(() => {
      fetchDistinctEntities(accountID, userID, token).then(setEntityOptions);
   }, [accountID, userID, token]);

   // Sort state
   const [sortField, setSortField] = useState('transaction_date');
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
      debouncedJob, debouncedNote, filterEntity, filterAiMin, filterBillable, aiOnly
   ].filter(v => v !== '' && v !== false && v != null).length;

   const clearFilters = () => {
      setFilterCustomerId(''); setFilterEmployeeUserId(''); setFilterWorkDescId('');
      setFilterJob(''); setFilterNote(''); setFilterEntity('');
      setFilterAiMin(''); setFilterBillable('');
      setAiOnly(false);
      setPage(0);
   };

   const reload = useCallback(async () => {
      if (!_isValidISODate(start) || !_isValidISODate(end)) {
         setError('');
         return;
      }
      setLoading(true);
      setError('');
      const res = await fetchConsolidatedTransactions(accountID, userID, token, {
         start,
         end,
         customerId: filterCustomerId || undefined,
         employeeUserId: filterEmployeeUserId || undefined,
         workDescId: filterWorkDescId || undefined,
         jobContains: debouncedJob || undefined,
         noteContains: debouncedNote || undefined,
         entityEquals: filterEntity || undefined,
         aiConfMin: filterAiMin || undefined,
         billableOnly: filterBillable || undefined,
         sortField,
         sortDirection,
         unbilledOnly: true,
         aiOnly,
         page: page + 1,
         limit: pageSize
      });
      if (res?.error) setError(res.error);
      setRows(res?.transactions || []);
      setTotalSum(Number(res?.totalSum || 0));
      setTotalCount(Number(res?.totalCount || 0));
      setLoading(false);
   }, [
      accountID, userID, token, start, end, aiOnly, page, pageSize,
      filterCustomerId, filterEmployeeUserId, filterWorkDescId,
      debouncedJob, debouncedNote, filterEntity, filterAiMin, filterBillable,
      sortField, sortDirection
   ]);

   useEffect(() => {
      setPage(0);
   }, [filterCustomerId, filterEmployeeUserId, filterWorkDescId, debouncedJob, debouncedNote, filterEntity, filterAiMin, filterBillable, aiOnly]);

   useEffect(() => {
      reload();
   }, [reload]);

   // Server-side filters now do unbilled + aiOnly. The page only renders what came back.
   const filteredRows = rows;

   const editingOriginal = useMemo(
      () => (editingId ? rows.find(x => x.transaction_id === editingId) : null),
      [editingId, rows]
   );

   const startEdit = txn => {
      setEditingId(txn.transaction_id);
      setEdits({
         customer_id: txn.customer_id,
         customer_job_id: txn.customer_job_id,
         general_work_description_id: txn.general_work_description_id,
         transaction_date: String(txn.transaction_date).slice(0, 10),
         quantity: txn.quantity,
         unit_cost: txn.unit_cost,
         total_transaction: txn.total_transaction,
         is_transaction_billable: txn.is_transaction_billable !== false,
         note: txn.note || ''
      });
      setSideEffects([]);
      setError('');
   };

   const saveEdit = async transactionId => {
      try {
         const customerChanged = editingOriginal && Number(edits.customer_id) !== Number(editingOriginal.customer_id);
         const res = await updateFinalizedTransaction(
            accountID,
            userID,
            transactionId,
            { updates: edits, confirmCustomerChange: customerChanged },
            token
         );
         setSideEffects(res.sideEffects || []);
         setEditingId(null);
         await reload();
      } catch (err) {
         setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
      }
   };

   const customers = customerData?.customersList?.activeCustomerData?.activeCustomers || [];
   const workDescriptions = customerData?.workDescriptionsList?.activeWorkDescriptionsData?.workDescriptions || [];
   const jobsForSelectedCustomer = useMemo(() => {
      const activeJobs = customerData?.accountJobsList?.activeJobData?.activeJobs || [];
      const customerJobs = activeJobs.filter(j => Number(j.customer_id) === Number(edits.customer_id));
      // Each "job" in DS2 has a parent (the user-facing top-level job) plus child rows used internally
      // for tracking. Show only the parent jobs so each unique job appears once in the dropdown.
      const parents = customerJobs.filter(j => !j.parent_job_id);
      const list = parents.length > 0 ? parents : (() => {
         const seen = new Set();
         return customerJobs.filter(j => (seen.has(j.job_type_id) ? false : (seen.add(j.job_type_id), true)));
      })();
      // If the currently-edited transaction points at a child job, include it explicitly so the Select
      // still shows the truth instead of looking empty. The label will note it's a child.
      if (edits.customer_job_id && !list.some(j => j.customer_job_id === edits.customer_job_id)) {
         const current = customerJobs.find(j => j.customer_job_id === edits.customer_job_id);
         if (current) list.unshift({ ...current, _isOrphanedChild: true });
      }
      return list;
   }, [customerData, edits.customer_id, edits.customer_job_id]);

   const employeeOptions = customerData?.teamMembersList?.activeUserData?.activeUsers || [];

   return (
      <Stack spacing={2}>
         <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
            <TextField label='Start' size='small' value={start} onChange={e => { setStart(e.target.value); setError(''); setPage(0); }} />
            <TextField label='End' size='small' value={end} onChange={e => { setEnd(e.target.value); setError(''); setPage(0); }} />
            <Button variant='outlined' onClick={reload}>Refresh</Button>
            <FormControlLabel
               control={<Checkbox size='small' checked={aiOnly} onChange={e => setAiOnly(e.target.checked)} />}
               label='AI auto-inserted only (hide everything else)'
            />
            <Typography variant='caption' color='text.secondary'>
               Showing only transactions not yet on an invoice.
            </Typography>
         </Stack>
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
            {/* Filter order follows column order: Entity, Customer, Job, Work Description, Notes, AI score, Billable, Employee. */}
            <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
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
                  size='small'
                  label='Job contains'
                  value={filterJob}
                  onChange={e => setFilterJob(e.target.value)}
                  placeholder='Conference, Tax…'
                  sx={{ minWidth: 180 }}
               />
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
                  label='Note contains'
                  value={filterNote}
                  onChange={e => setFilterNote(e.target.value)}
                  placeholder='Conference with Jim…'
                  sx={{ minWidth: 200 }}
               />
               <TextField
                  size='small'
                  type='number'
                  label='AI score min'
                  value={filterAiMin}
                  onChange={e => setFilterAiMin(e.target.value)}
                  inputProps={{ step: '0.05', min: '0', max: '1' }}
                  placeholder='0.85'
                  sx={{ width: 130 }}
               />
               <TextField
                  select
                  size='small'
                  label='Billable'
                  value={filterBillable}
                  onChange={e => setFilterBillable(e.target.value)}
                  sx={{ minWidth: 140 }}
               >
                  <MenuItem value=''>(any)</MenuItem>
                  <MenuItem value='true'>Billable only</MenuItem>
                  <MenuItem value='false'>Non-billable only</MenuItem>
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
                  {employeeOptions.map(u => (
                     <MenuItem key={u.user_id} value={u.user_id}>{u.display_name}</MenuItem>
                  ))}
               </TextField>
            </Stack>
         </Box>
         <Typography variant='subtitle2'>
            {totalCount} matching transaction{totalCount === 1 ? '' : 's'} · ${totalSum.toFixed(2)} total
            <Typography variant='caption' component='span' color='text.secondary' sx={{ ml: 1 }}>
               (showing {filteredRows.length} on this page)
            </Typography>
         </Typography>
         {loading && <CircularProgress size={20} />}
         {error && <Alert severity='error'>{error}</Alert>}
         <CascadeImpactPanel sideEffects={sideEffects} />
         <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
            <Table size='small' stickyHeader sx={{ minWidth: 1600, '& th, & td': { px: 1.25, py: 0.75 } }}>
               <TableHead>
                  <TableRow>
                     <TableCell sx={{ minWidth: 100, width: 100 }}>Source</TableCell>
                     <TableCell sx={{ minWidth: 110, width: 110 }}>
                        <TableSortLabel {...sortHeaderProps('transaction_date')}>Date</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 180 }}>
                        <TableSortLabel {...sortHeaderProps('entity')}>Entity</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 200 }}>
                        <TableSortLabel {...sortHeaderProps('customer')}>Customer</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 180 }}>
                        <TableSortLabel {...sortHeaderProps('job')}>Job</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 180 }}>
                        <TableSortLabel {...sortHeaderProps('work_description')}>Work Description</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 300 }}>Notes</TableCell>
                     <TableCell sx={{ minWidth: 110, width: 110 }}>
                        <TableSortLabel {...sortHeaderProps('ai_confidence')}>AI score</TableSortLabel>
                     </TableCell>
                     <TableCell align='right' sx={{ minWidth: 80, width: 80 }}>
                        <TableSortLabel {...sortHeaderProps('hours')}>Hours</TableSortLabel>
                     </TableCell>
                     <TableCell align='right' sx={{ minWidth: 100, width: 100 }}>
                        <TableSortLabel {...sortHeaderProps('total')}>Total</TableSortLabel>
                     </TableCell>
                     <TableCell sx={{ minWidth: 110, width: 110 }}>
                        <TableSortLabel {...sortHeaderProps('billable')}>Billable</TableSortLabel>
                     </TableCell>
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
                  {filteredRows.map(r => {
                     const isEditing = editingId === r.transaction_id;
                     const hasTrackerOrigin = r.tracker_id != null;
                     const txnDate = _formatDateMDY(r.transaction_date);
                     const trackerDate = _formatDateMDY(r.tracker_date);
                     const trackerHours = r.tracker_duration_minutes != null ? (Number(r.tracker_duration_minutes) / 60).toFixed(2) : null;
                     const dateMismatch = trackerDate !== NA && trackerDate !== txnDate;
                     const hoursMismatch = trackerHours && Number(trackerHours).toFixed(2) !== Number(r.quantity).toFixed(2);

                     return (
                        <Fragment key={r.transaction_id}>
                           <TableRow hover sx={{ '& td': { borderBottom: hasTrackerOrigin ? 'none' : undefined }, backgroundColor: 'rgba(46, 125, 50, 0.04)' }}>
                              <TableCell>
                                 <Tooltip title='This is the line being saved to customer_transactions in the DB'>
                                    <Chip
                                       size='small'
                                       label='● APPLIED'
                                       color='success'
                                       sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
                                    />
                                 </Tooltip>
                              </TableCell>
                              <TableCell>
                                 {isEditing ? (
                                    <TextField
                                       size='small'
                                       type='date'
                                       value={String(edits.transaction_date || '').slice(0, 10)}
                                       onChange={e => setEdits(p => ({ ...p, transaction_date: e.target.value }))}
                                       sx={{ minWidth: 140 }}
                                    />
                                 ) : (
                                    txnDate
                                 )}
                              </TableCell>
                              {/* Entity (employer the work was logged under — read-only; comes from tracker) */}
                              <TableCell>{r.tracker_entity || NA}</TableCell>
                              {/* Customer */}
                              <TableCell>
                                 {isEditing ? (
                                    <TextField
                                       select
                                       size='small'
                                       value={edits.customer_id || ''}
                                       onChange={e => setEdits(p => ({ ...p, customer_id: Number(e.target.value), customer_job_id: null }))}
                                       sx={{ minWidth: 200 }}
                                    >
                                       {customers.map(c => (
                                          <MenuItem key={c.customer_id} value={c.customer_id}>{c.display_name}</MenuItem>
                                       ))}
                                    </TextField>
                                 ) : (
                                    r.customer_display_name || NA
                                 )}
                                 {isEditing && Number(edits.customer_id) !== Number(r.customer_id) && (
                                    <Typography variant='caption' component='div' color='warning.dark'>
                                       Changing customer clears the invoice + job link.
                                    </Typography>
                                 )}
                              </TableCell>
                              {/* Job — uses AutoCompleteWithDialog so "Add New Job" is inline */}
                              <TableCell>
                                 {isEditing ? (
                                    <AutoCompleteWithDialog
                                       dialogTitle='New Job'
                                       dialogOpen={jobDialogOpen}
                                       setDialogOpen={setJobDialogOpen}
                                       autoCompleteProps={{
                                          autoCompleteLabel: 'Select Job',
                                          autoCompleteOptionsList: jobsForSelectedCustomer,
                                          onChangeKey: 'selectedJob',
                                          optionLabelProperty: 'job_description',
                                          valueTestProperty: 'customer_job_id',
                                          addedOptionLabel: 'Add New Job',
                                          selectedOption: jobsForSelectedCustomer.find(j => j.customer_job_id === edits.customer_job_id) || null,
                                          handleAutocompleteChange: (_key, value) => setEdits(p => ({ ...p, customer_job_id: value?.customer_job_id || null }))
                                       }}
                                       onAdded={newJob => {
                                          if (newJob) setEdits(p => ({ ...p, customer_job_id: newJob.customer_job_id }));
                                       }}
                                    >
                                       <NewJob
                                          customerData={customerData}
                                          setCustomerData={data => setCustomerData && setCustomerData(data)}
                                          defaultCustomer={customers.find(c => c.customer_id === edits.customer_id) || null}
                                       />
                                    </AutoCompleteWithDialog>
                                 ) : (
                                    r.customer_job_description || NA
                                 )}
                              </TableCell>
                              {/* Work Description */}
                              <TableCell>
                                 {isEditing ? (
                                    <TextField
                                       select
                                       size='small'
                                       label='Work description'
                                       value={edits.general_work_description_id || ''}
                                       onChange={e => setEdits(p => ({ ...p, general_work_description_id: Number(e.target.value) }))}
                                       sx={{ minWidth: 180 }}
                                    >
                                       {workDescriptions.map(w => (
                                          <MenuItem key={w.general_work_description_id} value={w.general_work_description_id}>
                                             {w.general_work_description}
                                          </MenuItem>
                                       ))}
                                    </TextField>
                                 ) : (
                                    r.general_work_description || NA
                                 )}
                              </TableCell>
                              {/* Notes */}
                              <TableCell sx={{ maxWidth: 300 }}>
                                 {r.detailed_work_description || r.note ? (
                                    <Tooltip title={r.detailed_work_description || r.note}>
                                       <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {_trim(r.detailed_work_description || r.note, 80)}
                                       </span>
                                    </Tooltip>
                                 ) : (
                                    <em style={{ color: '#888' }}>(empty)</em>
                                 )}
                              </TableCell>
                              {/* AI score */}
                              <TableCell>
                                 {hasTrackerOrigin && r.ai_confidence != null && (
                                    <Tooltip title={r.ai_reason || 'AI confidence — higher = more sure'}>
                                       <Chip
                                          size='small'
                                          label={`AI ${Number(r.ai_confidence).toFixed(2)}`}
                                          color={_confidenceColor(r.ai_confidence)}
                                          variant='outlined'
                                       />
                                    </Tooltip>
                                 )}
                                 {hasTrackerOrigin && r.ai_confidence == null && (
                                    <Tooltip title='Applied via held-entry dialog (not auto-inserted by AI)'>
                                       <Chip size='small' label='from tracker' variant='outlined' />
                                    </Tooltip>
                                 )}
                                 {!hasTrackerOrigin && NA}
                              </TableCell>
                              {/* Hours */}
                              <TableCell align='right'>
                                 {isEditing ? (
                                    <TextField
                                       size='small'
                                       type='number'
                                       inputProps={{ step: '0.01', min: '0' }}
                                       value={edits.quantity != null ? edits.quantity : ''}
                                       onChange={e => setEdits(p => ({ ...p, quantity: e.target.value === '' ? null : Number(e.target.value) }))}
                                       sx={{ width: 90 }}
                                    />
                                 ) : r.quantity != null ? (
                                    Number(r.quantity).toFixed(2)
                                 ) : (
                                    NA
                                 )}
                              </TableCell>
                              {/* Total */}
                              <TableCell align='right'>
                                 {isEditing ? (
                                    <TextField
                                       size='small'
                                       type='number'
                                       inputProps={{ step: '0.01', min: '0' }}
                                       value={edits.total_transaction != null ? edits.total_transaction : ''}
                                       onChange={e => setEdits(p => ({ ...p, total_transaction: e.target.value === '' ? null : Number(e.target.value) }))}
                                       sx={{ width: 110 }}
                                    />
                                 ) : r.total_transaction != null ? (
                                    `$${Number(r.total_transaction).toFixed(2)}`
                                 ) : (
                                    NA
                                 )}
                              </TableCell>
                              {/* Billable */}
                              <TableCell>
                                 {isEditing ? (
                                    <FormControlLabel
                                       sx={{ m: 0 }}
                                       control={
                                          <Checkbox
                                             size='small'
                                             checked={edits.is_transaction_billable !== false}
                                             onChange={e => setEdits(p => ({ ...p, is_transaction_billable: e.target.checked }))}
                                          />
                                       }
                                       label={<Typography variant='caption'>Billable</Typography>}
                                    />
                                 ) : (
                                    <Tooltip title={r.is_transaction_billable === false ? 'Not billed to client' : 'Billable to client'}>
                                       <Chip
                                          size='small'
                                          label={r.is_transaction_billable === false ? 'No' : 'Yes'}
                                          color={r.is_transaction_billable === false ? 'default' : 'success'}
                                          variant={r.is_transaction_billable === false ? 'outlined' : 'filled'}
                                          sx={{ height: 20, fontSize: '0.72rem' }}
                                       />
                                    </Tooltip>
                                 )}
                              </TableCell>
                              {/* Employee */}
                              <TableCell>
                                 {isEditing ? (
                                    <Tooltip title='Employee is not editable here. Re-create the transaction if you need to change who logged it.'>
                                       <span>{r.logged_for_user_display_name || NA}</span>
                                    </Tooltip>
                                 ) : (
                                    r.logged_for_user_display_name || NA
                                 )}
                              </TableCell>
                              {/* Time tracker filename */}
                              <TableCell>
                                 {r.tracker_filename ? (
                                    <Tooltip title={r.tracker_filename}>
                                       <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                          {_trim(r.tracker_filename, 32)}
                                       </span>
                                    </Tooltip>
                                 ) : (
                                    NA
                                 )}
                              </TableCell>
                              {/* Edit */}
                              <TableCell>
                                 {isEditing ? (
                                    <Stack direction='row' spacing={1}>
                                       <Button size='small' variant='contained' onClick={() => saveEdit(r.transaction_id)}>Save</Button>
                                       <Button size='small' onClick={() => setEditingId(null)}>Cancel</Button>
                                    </Stack>
                                 ) : (
                                    <Button size='small' onClick={() => startEdit(r)} disabled={r.is_invoice_paid_in_full}>Edit</Button>
                                 )}
                              </TableCell>
                           </TableRow>
                           {hasTrackerOrigin && (
                              <TableRow
                                 sx={{
                                    backgroundColor: 'action.hover',
                                    '& td': { color: 'text.secondary', fontSize: '0.78rem', fontStyle: 'italic', borderBottomStyle: 'dashed', py: 0.5 }
                                 }}
                              >
                                 <TableCell>
                                    <Tooltip title='Original line from the uploaded tracker XLSX (read-only)'>
                                       <Chip
                                          size='small'
                                          label='tracker'
                                          variant='outlined'
                                          sx={{ height: 20, fontSize: '0.7rem', fontStyle: 'normal' }}
                                       />
                                    </Tooltip>
                                 </TableCell>
                                 <TableCell sx={{ color: dateMismatch ? 'warning.main' : 'text.secondary', fontWeight: dateMismatch ? 600 : undefined }}>
                                    {trackerDate}
                                 </TableCell>
                                 {/* Entity (from tracker — employer the work was logged under) */}
                                 <TableCell>{r.tracker_entity || NA}</TableCell>
                                 {/* Customer (from tracker) */}
                                 <TableCell>
                                    {(() => {
                                       const trackerCustomer =
                                          r.tracker_company_name ||
                                          (r.tracker_first_name && r.tracker_last_name
                                             ? `${r.tracker_first_name} ${r.tracker_last_name}`
                                             : null) ||
                                          r.tracker_first_name ||
                                          r.tracker_last_name;
                                       return trackerCustomer || NA;
                                    })()}
                                 </TableCell>
                                 {/* Job — tracker doesn't have one */}
                                 <TableCell>{NA}</TableCell>
                                 {/* Work Description (tracker category) */}
                                 <TableCell>{r.tracker_category || NA}</TableCell>
                                 {/* Notes */}
                                 <TableCell sx={{ maxWidth: 300 }}>
                                    {r.tracker_notes ? (
                                       <Tooltip title={r.tracker_notes}>
                                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                             {_trim(r.tracker_notes, 80)}
                                          </span>
                                       </Tooltip>
                                    ) : (
                                       NA
                                    )}
                                 </TableCell>
                                 {/* AI score */}
                                 <TableCell>{NA}</TableCell>
                                 {/* Hours */}
                                 <TableCell align='right' sx={{ color: hoursMismatch ? 'warning.main' : 'text.secondary', fontWeight: hoursMismatch ? 600 : undefined }}>
                                    {trackerHours != null ? `${trackerHours} h` : NA}
                                 </TableCell>
                                 {/* Total */}
                                 <TableCell align='right'>{NA}</TableCell>
                                 {/* Billable */}
                                 <TableCell>{NA}</TableCell>
                                 {/* Employee */}
                                 <TableCell>{r.tracker_employee_name || NA}</TableCell>
                                 {/* Time tracker filename */}
                                 <TableCell>
                                    {r.tracker_filename ? (
                                       <Tooltip title={r.tracker_filename}>
                                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                             {_trim(r.tracker_filename, 32)}
                                          </span>
                                       </Tooltip>
                                    ) : (
                                       NA
                                    )}
                                 </TableCell>
                                 {/* Edit (no action on tracker offset row) */}
                                 <TableCell />
                              </TableRow>
                           )}
                        </Fragment>
                     );
                  })}
               </TableBody>
            </Table>
         </Box>
         <TablePagination
            component='div'
            count={totalCount}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            showFirstButton
            showLastButton
         />
      </Stack>
   );
}
