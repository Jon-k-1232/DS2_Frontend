import { useEffect, useState, useContext, useCallback } from 'react';
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
   Paper,
   Checkbox,
   Pagination,
   Chip,
   CircularProgress,
   Alert,
   Snackbar
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { context } from '../../App';
import { fetchAuditableCustomers, runAccountAudits } from '../../Services/ApiCalls/AccountAuditCalls';
import AuditDetailDialog from './AuditDetailDialog';
import { fmtDateTime, formatCurrency } from './auditFormatters';

export default function AccountAuditPage({ setPageTitle }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token, displayName } = loggedInUser;

   const [search, setSearch] = useState('');
   const [searchInput, setSearchInput] = useState('');
   const [page, setPage] = useState(1);
   const [limit] = useState(25);
   const [rows, setRows] = useState([]);
   const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [selected, setSelected] = useState(new Set());
   const [running, setRunning] = useState(false);
   const [runResults, setRunResults] = useState(null);
   const [openAuditId, setOpenAuditId] = useState(null);

   useEffect(() => {
      if (typeof setPageTitle === 'function') setPageTitle('Account Audit');
   }, [setPageTitle]);

   const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await fetchAuditableCustomers(accountID, userID, { page, limit, search }, token);
         setRows(data.customers || []);
         setPagination(data.pagination || { totalPages: 1, totalCount: 0 });
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to load customers.');
      } finally {
         setLoading(false);
      }
   }, [accountID, userID, token, page, limit, search]);

   useEffect(() => {
      load();
   }, [load]);

   const handleSearchSubmit = e => {
      e.preventDefault();
      setPage(1);
      setSearch(searchInput.trim());
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

   const runSelected = async (ids = null) => {
      const customerIds = ids || Array.from(selected);
      if (customerIds.length === 0) return;
      setRunning(true);
      setError(null);
      try {
         const data = await runAccountAudits(accountID, userID, customerIds, null, token);
         setRunResults(data.results || []);
         setSelected(new Set());
         await load();
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to run audit.');
      } finally {
         setRunning(false);
      }
   };

   const allOnPageSelected = rows.length > 0 && rows.every(r => selected.has(r.customer_id));
   const someOnPageSelected = rows.some(r => selected.has(r.customer_id));

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
               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Box component='form' onSubmit={handleSearchSubmit} sx={{ flex: 1, display: 'flex', gap: 1 }}>
                     <TextField
                        size='small'
                        placeholder='Search by name or customer ID'
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        fullWidth
                     />
                     <Button type='submit' variant='outlined' size='small'>Search</Button>
                     {search && (
                        <Button
                           variant='text'
                           size='small'
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
                     <Button size='small' startIcon={<RefreshIcon />} onClick={() => load()} disabled={loading}>
                        Refresh
                     </Button>
                  </Stack>
               </Stack>
            </Paper>

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
                        <TableCell>ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Last audit</TableCell>
                        <TableCell align='right'>Audit balance</TableCell>
                        <TableCell align='right'>App balance</TableCell>
                        <TableCell align='right'>Difference</TableCell>
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
                                       sx={{
                                          color: 'error.main',
                                          fontWeight: 600,
                                          fontVariantNumeric: 'tabular-nums'
                                       }}
                                    >
                                       {formatCurrency(r.last_balance_difference)}
                                    </Typography>
                                 )}
                              </TableCell>
                              <TableCell align='right'>
                                 <Button size='small' variant='outlined' onClick={() => runSelected([r.customer_id])} disabled={running}>
                                    Audit
                                 </Button>
                              </TableCell>
                           </TableRow>
                        ))}
                  </TableBody>
               </Table>
            </Paper>

            <Stack direction='row' justifyContent='space-between' alignItems='center'>
               <Typography variant='caption' color='text.secondary'>
                  {pagination.totalCount} customer{pagination.totalCount === 1 ? '' : 's'}
                  {search ? ` matching "${search}"` : ''}
               </Typography>
               <Pagination
                  count={pagination.totalPages || 1}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  size='small'
               />
            </Stack>
         </Stack>

         <Snackbar
            open={!!runResults}
            autoHideDuration={6000}
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
