import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
   Box,
   Stack,
   Typography,
   TextField,
   Button,
   Table,
   TableHead,
   TableBody,
   TableRow,
   TableCell,
   TableSortLabel,
   Paper,
   Checkbox,
   Pagination,
   Chip,
   CircularProgress,
   Alert,
   Snackbar,
   Select,
   MenuItem,
   LinearProgress,
   FormControlLabel,
   Switch,
   Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { context } from '../../App';
import { fetchAuditableCustomers, runAccountAudits, pollAuditJob } from '../../Services/ApiCalls/AccountAuditCalls';
import AuditDetailDialog from './AuditDetailDialog';
import { fmtDateTime, formatCurrency } from './auditFormatters';

const FILTER_OPTIONS = [
   { value: null, label: 'All' },
   { value: 'billing_ready', label: 'Billing Ready' },
   { value: 'needs_audit', label: 'Needs Audit' },
   { value: 'matched', label: 'Matched' },
   { value: 'mismatched', label: 'Mismatched' }
];

// Columns that support server-side sort. The 'field' is the backend sort key.
const SORTABLE_COLUMNS = {
   customer_id: 'ID',
   display_name: 'Customer',
   last_audit_at: 'Last audit',
   last_audit_balance: 'Audit balance',
   last_app_invoice_total: 'App balance',
   last_balance_difference: 'Difference'
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function AccountAuditPage({ setPageTitle }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token, displayName } = loggedInUser;

   const [search, setSearch] = useState('');
   const [searchInput, setSearchInput] = useState('');
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(25);
   const [filter, setFilter] = useState(null);
   const [sort, setSort] = useState(null);
   const [direction, setDirection] = useState('asc');
   const [hideZeroAppBalance, setHideZeroAppBalance] = useState(true);
   const [pageJumpInput, setPageJumpInput] = useState('');
   const [rows, setRows] = useState([]);
   const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [selected, setSelected] = useState(new Set());
   const [running, setRunning] = useState(false);
   const [jobProgress, setJobProgress] = useState(null); // { jobId, total, done }
   const [runResults, setRunResults] = useState(null);
   const [openAuditId, setOpenAuditId] = useState(null);

   const pollRef = useRef(null);
   // loadRef always points to the latest load fn so the poll callback never goes stale
   const loadRef = useRef(null);

   // Intentionally do NOT override the top-of-screen page title here — the
   // Invoices parent route sets it to 'Invoices' and we want it to stay that
   // way.  The h5 below is the local section header.

   // Clean up poll interval on unmount
   useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

   const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await fetchAuditableCustomers(
            accountID,
            userID,
            { page, limit, search, filter, sort, direction, hideZeroAppBalance },
            token
         );
         setRows(data.customers || []);
         setPagination(data.pagination || { totalPages: 1, totalCount: 0 });
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to load customers.');
      } finally {
         setLoading(false);
      }
   }, [
      accountID,
      userID,
      token,
      page,
      limit,
      search,
      filter,
      sort,
      direction,
      hideZeroAppBalance
   ]);

   // Reset to page 1 when toggle state changes so we don't sit on an empty page
   // after a filter narrows the result set.
   const toggleHideZero = () => { setHideZeroAppBalance(v => !v); setPage(1); };

   // Keep loadRef current
   useEffect(() => { loadRef.current = load; }, [load]);

   useEffect(() => {
      load();
   }, [load]);

   const handleSearchSubmit = e => {
      e.preventDefault();
      setPage(1);
      setSearch(searchInput.trim());
   };

   const handleFilterChange = newFilter => {
      // Toggle: clicking an already-active filter deselects it (→ All)
      setFilter(prev => (prev === newFilter ? null : newFilter));
      setPage(1);
   };

   const handleLimitChange = e => {
      setLimit(Number(e.target.value));
      setPage(1);
   };

   // Click cycles: not-sorted → asc → desc → not-sorted (back to default sort).
   const handleSort = field => {
      setPage(1);
      if (sort !== field) {
         setSort(field);
         setDirection('asc');
      } else if (direction === 'asc') {
         setDirection('desc');
      } else {
         setSort(null);
         setDirection('asc');
      }
   };

   const handlePageJump = e => {
      e.preventDefault();
      const target = parseInt(pageJumpInput, 10);
      if (!isNaN(target) && target >= 1 && target <= (pagination.totalPages || 1)) {
         setPage(target);
         setPageJumpInput('');
      }
   };

   const toggleRow = customerId => {
      setSelected(prev => {
         const next = new Set(prev);
         if (next.has(customerId)) next.delete(customerId);
         else next.add(customerId);
         return next;
      });
   };

   const togglePage = () => {
      const allOnPage = rows.map(r => r.customer_id);
      const allSelected = allOnPage.every(id => selected.has(id));
      setSelected(prev => {
         const next = new Set(prev);
         allOnPage.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
         return next;
      });
   };

   const stopPolling = () => {
      if (pollRef.current) {
         clearInterval(pollRef.current);
         pollRef.current = null;
      }
   };

   const startPolling = useCallback((jobId, total) => {
      stopPolling();
      setJobProgress({ jobId, total, done: 0 });

      pollRef.current = setInterval(async () => {
         try {
            const data = await pollAuditJob(jobId, accountID, userID, token);
            setJobProgress({ jobId, total: data.total, done: data.done });

            if (data.processing_status === 'complete' || data.processing_status === 'failed') {
               stopPolling();
               setRunning(false);
               setJobProgress(null);
               setSelected(new Set());
               setRunResults(data.results || []);
               // Use ref so we always call the current load (correct page/filter)
               if (loadRef.current) loadRef.current();
            }
         } catch (e) {
            if (e.response?.status === 404) {
               stopPolling();
               setRunning(false);
               setJobProgress(null);
               setError('Audit job not found — it may have expired. Please try again.');
            }
         }
      }, 2000);
   }, [accountID, userID, token]);

   const runSelected = async (ids = null) => {
      const customerIds = ids || Array.from(selected);
      if (customerIds.length === 0) return;
      setRunning(true);
      setError(null);
      try {
         const data = await runAccountAudits(accountID, userID, customerIds, null, token);
         if (data.job_id) {
            // Async job — poll for results
            startPolling(data.job_id, data.total);
         } else {
            // Synchronous fallback (shouldn't happen with current backend)
            setRunResults(data.results || []);
            setSelected(new Set());
            setRunning(false);
            load();
         }
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to run audit.');
         setRunning(false);
      }
   };

   const allOnPageSelected = rows.length > 0 && rows.every(r => selected.has(r.customer_id));
   const someOnPageSelected = rows.some(r => selected.has(r.customer_id));
   const activeFilterLabel = FILTER_OPTIONS.find(f => f.value === filter)?.label;

   return (
      <Box>
         <Stack spacing={2}>
            <Box>
               <Typography variant='h5'>Account Audit</Typography>
               <Typography variant='caption' color='text.secondary'>
                  Independent recomputation of each customer's ledger. Auditor: <strong>{displayName}</strong>. Results are stored
                  and reviewable from the customer profile.
               </Typography>
            </Box>

            <Paper variant='outlined' sx={{ p: 2 }}>
               <Stack spacing={1.5}>
                  {/* Row 1 — Search + action buttons */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                     <Box component='form' onSubmit={handleSearchSubmit} sx={{ flex: 1, display: 'flex', gap: 1 }}>
                        <TextField
                           size='small'
                           placeholder='Search by name or customer ID'
                           value={searchInput}
                           onChange={e => setSearchInput(e.target.value)}
                           fullWidth
                           disabled={running}
                        />
                        <Button type='submit' variant='outlined' size='small' disabled={running}>
                           Search
                        </Button>
                        {search && (
                           <Button
                              variant='text'
                              size='small'
                              disabled={running}
                              onClick={() => {
                                 setSearch('');
                                 setSearchInput('');
                                 setPage(1);
                              }}
                           >
                              Clear
                           </Button>
                        )}
                     </Box>
                     <Stack direction='row' spacing={1}>
                        <Button
                           variant='contained'
                           size='small'
                           startIcon={running ? <CircularProgress size={16} color='inherit' /> : <PlayArrowIcon />}
                           disabled={running || selected.size === 0}
                           onClick={() => runSelected()}
                        >
                           Audit selected ({selected.size})
                        </Button>
                        <Button
                           size='small'
                           startIcon={<RefreshIcon />}
                           disabled={loading || running}
                           onClick={() => {
                              setSelected(new Set());
                              load();
                           }}
                        >
                           Refresh
                        </Button>
                     </Stack>
                  </Stack>

                  {/* Row 2 — Quick filter chips (single-select, click to toggle off) */}
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                     {FILTER_OPTIONS.map(opt => (
                        <Chip
                           key={String(opt.value)}
                           label={opt.label}
                           size='small'
                           clickable
                           disabled={running}
                           color={filter === opt.value ? 'primary' : 'default'}
                           variant={filter === opt.value ? 'filled' : 'outlined'}
                           onClick={() => handleFilterChange(opt.value)}
                        />
                     ))}
                  </Stack>

                  <Divider />

                  {/* Row 3 — Additional toggle filter */}
                  <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                     <FormControlLabel
                        control={
                           <Switch
                              size='small'
                              checked={hideZeroAppBalance}
                              onChange={toggleHideZero}
                              disabled={running}
                           />
                        }
                        label={<Typography variant='body2'>Hide $0 app balance</Typography>}
                     />
                  </Stack>
               </Stack>
            </Paper>

            {/* Progress indicator while audit job runs */}
            {running && jobProgress && (
               <Alert severity='info' icon={<CircularProgress size={20} />}>
                  <Stack spacing={0.5}>
                     <Typography variant='body2'>
                        Running audits — {jobProgress.done} of {jobProgress.total} complete…
                     </Typography>
                     <LinearProgress
                        variant='determinate'
                        value={jobProgress.total > 0 ? (jobProgress.done / jobProgress.total) * 100 : 0}
                        sx={{ borderRadius: 1 }}
                     />
                  </Stack>
               </Alert>
            )}

            {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant='outlined'>
               <Table size='small'>
                  <TableHead>
                     <TableRow>
                        <TableCell padding='checkbox'>
                           <Checkbox
                              indeterminate={someOnPageSelected && !allOnPageSelected}
                              checked={allOnPageSelected}
                              onChange={togglePage}
                              disabled={rows.length === 0}
                           />
                        </TableCell>
                        {['customer_id', 'display_name', 'last_audit_at', 'last_audit_balance', 'last_app_invoice_total', 'last_balance_difference'].map(field => {
                           const isRight = field === 'last_audit_balance' || field === 'last_app_invoice_total' || field === 'last_balance_difference';
                           const isActive = sort === field;
                           return (
                              <TableCell key={field} align={isRight ? 'right' : 'left'} sortDirection={isActive ? direction : false}>
                                 <TableSortLabel
                                    active={isActive}
                                    direction={isActive ? direction : 'asc'}
                                    onClick={() => handleSort(field)}
                                 >
                                    {SORTABLE_COLUMNS[field]}
                                 </TableSortLabel>
                              </TableCell>
                           );
                        })}
                        <TableCell align='right'>Actions</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {loading && (
                        <TableRow>
                           <TableCell colSpan={8} align='center' sx={{ py: 4 }}>
                              <CircularProgress size={24} />
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading && rows.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={8} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                              No customers match.
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading &&
                        rows.map(r => (
                           <TableRow key={r.customer_id} hover>
                              <TableCell padding='checkbox'>
                                 <Checkbox checked={selected.has(r.customer_id)} onChange={() => toggleRow(r.customer_id)} />
                              </TableCell>
                              <TableCell>{r.customer_id}</TableCell>
                              <TableCell>
                                 <Typography variant='body2'>{r.display_name}</Typography>
                                 {r.business_name && r.business_name !== r.display_name && (
                                    <Typography variant='caption' color='text.secondary'>{r.business_name}</Typography>
                                 )}
                              </TableCell>
                              <TableCell>
                                 {r.last_audit_at ? (
                                    <Stack direction='row' spacing={1} alignItems='center'>
                                       <Typography variant='body2'>{fmtDateTime(r.last_audit_at)}</Typography>
                                       <Button size='small' variant='text' onClick={() => setOpenAuditId(r.last_audit_id)}>
                                          View
                                       </Button>
                                    </Stack>
                                 ) : (
                                    <Chip size='small' label='Never audited' variant='outlined' />
                                 )}
                              </TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {r.last_audit_balance == null ? '—' : formatCurrency(r.last_audit_balance)}
                              </TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {r.last_app_invoice_total == null ? '—' : formatCurrency(r.last_app_invoice_total)}
                              </TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {r.last_balance_difference == null ? (
                                    '—'
                                 ) : Math.abs(r.last_balance_difference) < 0.01 ? (
                                    <Chip size='small' label='Match' color='success' variant='outlined' />
                                 ) : (
                                    <Typography
                                       variant='body2'
                                       sx={{ color: 'error.main', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                                    >
                                       {formatCurrency(r.last_balance_difference)}
                                    </Typography>
                                 )}
                              </TableCell>
                              <TableCell align='right'>
                                 <Button
                                    size='small'
                                    variant='outlined'
                                    disabled={running}
                                    onClick={() => runSelected([r.customer_id])}
                                 >
                                    Audit
                                 </Button>
                              </TableCell>
                           </TableRow>
                        ))}
                  </TableBody>
               </Table>
            </Paper>

            {/* Bottom bar — count · page jump · pagination · per-page selector */}
            <Stack direction='row' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={1}>
               <Typography variant='caption' color='text.secondary'>
                  {pagination.totalCount} customer{pagination.totalCount === 1 ? '' : 's'}
                  {search ? ` matching "${search}"` : ''}
                  {filter ? ` · ${activeFilterLabel}` : ''}
               </Typography>

               <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                  {/* Page jump */}
                  <Box
                     component='form'
                     onSubmit={handlePageJump}
                     sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                     <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
                        Go to
                     </Typography>
                     <TextField
                        size='small'
                        type='number'
                        value={pageJumpInput}
                        onChange={e => setPageJumpInput(e.target.value)}
                        disabled={running}
                        inputProps={{
                           min: 1,
                           max: pagination.totalPages || 1,
                           style: { width: 44, textAlign: 'center', padding: '3px 6px' }
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { height: 28 } }}
                     />
                     <Button
                        type='submit'
                        size='small'
                        variant='outlined'
                        disabled={running}
                        sx={{ minWidth: 'auto', px: 1, height: 28 }}
                     >
                        Go
                     </Button>
                  </Box>

                  <Pagination
                     count={pagination.totalPages || 1}
                     page={page}
                     onChange={(_e, v) => setPage(v)}
                     size='small'
                     disabled={running}
                  />

                  {/* Rows per page */}
                  <Stack direction='row' alignItems='center' spacing={0.5}>
                     <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
                        Per page
                     </Typography>
                     <Select
                        value={limit}
                        onChange={handleLimitChange}
                        size='small'
                        disabled={running}
                        sx={{ fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.5, pr: 3 } }}
                     >
                        {PAGE_SIZE_OPTIONS.map(n => (
                           <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                     </Select>
                  </Stack>
               </Stack>
            </Stack>
         </Stack>

         <Snackbar
            open={!!runResults}
            autoHideDuration={8000}
            onClose={() => setRunResults(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
         >
            <Alert
               severity={runResults?.some(r => r.status !== 'completed') ? 'warning' : 'success'}
               onClose={() => setRunResults(null)}
               sx={{ minWidth: 280 }}
            >
               {runResults && (
                  <>
                     {runResults.filter(r => r.status === 'completed').length} of {runResults.length} audit(s) completed.
                     {runResults.length === 1 && runResults[0].audit_id && (
                        <Button
                           size='small'
                           onClick={() => setOpenAuditId(runResults[0].audit_id)}
                           sx={{ ml: 1 }}
                        >
                           View
                        </Button>
                     )}
                  </>
               )}
            </Alert>
         </Snackbar>

         <AuditDetailDialog
            auditId={openAuditId}
            open={!!openAuditId}
            onClose={() => setOpenAuditId(null)}
         />
      </Box>
   );
}
