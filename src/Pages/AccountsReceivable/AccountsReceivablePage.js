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
   TableSortLabel,
   Paper,
   Pagination,
   Chip,
   CircularProgress,
   Alert,
   Select,
   MenuItem,
   Tooltip
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { context } from '../../App';
import { fetchARAging, downloadARAgingCsv } from '../../Services/ApiCalls/AccountsReceivableCalls';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// Age bucket quick filters — one per column header so the chips and the
// table columns align 1:1.
const AGE_FILTERS = [
   { value: null, label: 'All ages' },
   { value: '30', label: '0–30 days' },
   { value: '60', label: '31–60 days' },
   { value: '90', label: '61–90 days' },
   { value: 'over_90', label: '> 90 days' }
];

// (field key on the server, header label, alignment).  Every column except
// the Total-Owed/Last-Payment composite is sortable on the server.
const COLUMNS = [
   { field: 'business_name', label: 'Business', align: 'left' },
   { field: 'customer_name', label: 'Customer', align: 'left' },
   { field: 'display_name', label: 'Display', align: 'left' },
   { field: 'bucket_0_30', label: '0–30 days', align: 'right' },
   { field: 'bucket_31_60', label: '31–60 days', align: 'right' },
   { field: 'bucket_61_90', label: '61–90 days', align: 'right' },
   { field: 'bucket_over_90', label: '> 90 days', align: 'right' },
   { field: 'oldest_days', label: 'Days old', align: 'right' },
   { field: 'total_outstanding', label: 'Total owed', align: 'right' },
   { field: 'last_payment_date', label: 'Last payment', align: 'left' },
   { field: 'has_work_since_last_payment', label: 'Work since pmt', align: 'center' }
];

const fmtCurrency = v =>
   v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = v => {
   if (!v) return '—';
   const d = new Date(v);
   if (isNaN(d.getTime())) return '—';
   return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const bucketCell = amount => {
   if (!amount || Number(amount) <= 0.005) {
      return (
         <Typography variant='body2' color='text.disabled' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            —
         </Typography>
      );
   }
   return (
      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
         {fmtCurrency(amount)}
      </Typography>
   );
};

export default function AccountsReceivablePage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [search, setSearch] = useState('');
   const [searchInput, setSearchInput] = useState('');
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(50);
   const [filter, setFilter] = useState(null);
   const [sort, setSort] = useState(null);
   const [direction, setDirection] = useState('desc');
   const [rows, setRows] = useState([]);
   const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [exporting, setExporting] = useState(false);

   const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await fetchARAging(
            accountID,
            userID,
            { page, limit, search, filter, sort, direction },
            token
         );
         setRows(data.arAging?.customers || []);
         setPagination(data.arAging?.pagination || { totalPages: 1, totalItems: 0 });
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to load accounts receivable.');
      } finally {
         setLoading(false);
      }
   }, [accountID, userID, token, page, limit, search, filter, sort, direction]);

   useEffect(() => {
      load();
   }, [load]);

   const handleSearchSubmit = e => {
      e.preventDefault();
      setPage(1);
      setSearch(searchInput.trim());
   };

   const handleClearSearch = () => {
      setSearch('');
      setSearchInput('');
      setPage(1);
   };

   const handleLimitChange = e => {
      setLimit(Number(e.target.value));
      setPage(1);
   };

   const handleFilterChange = next => {
      // Toggle: clicking an active chip clears it.
      setFilter(prev => (prev === next ? null : next));
      setPage(1);
   };

   // Sort cycle on header click: not-sorted → desc → asc → not-sorted (default).
   // Numbers default to descending because that's the more useful "biggest first".
   const handleSort = field => {
      setPage(1);
      if (sort !== field) {
         setSort(field);
         setDirection('desc');
      } else if (direction === 'desc') {
         setDirection('asc');
      } else {
         setSort(null);
         setDirection('desc');
      }
   };

   const handleExport = async () => {
      setExporting(true);
      setError(null);
      try {
         await downloadARAgingCsv(accountID, userID, { search, filter, sort, direction }, token);
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to export AR aging.');
      } finally {
         setExporting(false);
      }
   };

   // Totals row across the currently loaded page
   const pageTotals = rows.reduce(
      (acc, r) => ({
         bucket_0_30: acc.bucket_0_30 + Number(r.bucket_0_30 || 0),
         bucket_31_60: acc.bucket_31_60 + Number(r.bucket_31_60 || 0),
         bucket_61_90: acc.bucket_61_90 + Number(r.bucket_61_90 || 0),
         bucket_over_90: acc.bucket_over_90 + Number(r.bucket_over_90 || 0),
         total: acc.total + Number(r.total_outstanding || 0)
      }),
      { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_over_90: 0, total: 0 }
   );

   return (
      <Box>
         <Stack spacing={2}>
            <Box>
               <Typography variant='h5'>Accounts Receivable</Typography>
               <Typography variant='caption' color='text.secondary'>
                  Read-only aging of issued, unpaid invoices only. Customers with new unbilled work but no
                  outstanding invoice are excluded here — use <strong>Create Invoice</strong> for that view.
               </Typography>
            </Box>

            <Paper variant='outlined' sx={{ p: 2 }}>
               <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                     <Box component='form' onSubmit={handleSearchSubmit} sx={{ flex: 1, display: 'flex', gap: 1 }}>
                        <TextField
                           size='small'
                           placeholder='Search by business name, customer name, display name, or ID'
                           value={searchInput}
                           onChange={e => setSearchInput(e.target.value)}
                           fullWidth
                        />
                        <Button type='submit' variant='outlined' size='small'>
                           Search
                        </Button>
                        {search && (
                           <Button variant='text' size='small' onClick={handleClearSearch}>
                              Clear
                           </Button>
                        )}
                     </Box>
                     <Button
                        variant='contained'
                        size='small'
                        startIcon={exporting ? <CircularProgress size={16} color='inherit' /> : <FileDownloadIcon />}
                        disabled={exporting || loading || rows.length === 0}
                        onClick={handleExport}
                     >
                        Export CSV
                     </Button>
                  </Stack>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                     {AGE_FILTERS.map(opt => (
                        <Chip
                           key={String(opt.value)}
                           label={opt.label}
                           size='small'
                           clickable
                           color={filter === opt.value ? 'primary' : 'default'}
                           variant={filter === opt.value ? 'filled' : 'outlined'}
                           onClick={() => handleFilterChange(opt.value)}
                        />
                     ))}
                  </Stack>
               </Stack>
            </Paper>

            {error && (
               <Alert severity='error' onClose={() => setError(null)}>
                  {error}
               </Alert>
            )}

            <Paper variant='outlined' sx={{ overflowX: 'auto' }}>
               <Table size='small'>
                  <TableHead>
                     <TableRow>
                        {COLUMNS.map(col => {
                           const isActive = sort === col.field;
                           return (
                              <TableCell
                                 key={col.field}
                                 align={col.align}
                                 sortDirection={isActive ? direction : false}
                              >
                                 <TableSortLabel
                                    active={isActive}
                                    direction={isActive ? direction : 'desc'}
                                    onClick={() => handleSort(col.field)}
                                 >
                                    {col.label}
                                 </TableSortLabel>
                              </TableCell>
                           );
                        })}
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {loading && (
                        <TableRow>
                           <TableCell colSpan={11} align='center' sx={{ py: 4 }}>
                              <CircularProgress size={24} />
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading && rows.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={11} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                              No customers with outstanding balances.
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading &&
                        rows.map(r => (
                           <TableRow key={r.customer_id} hover>
                              <TableCell>{r.business_name || '—'}</TableCell>
                              <TableCell>{r.customer_name || '—'}</TableCell>
                              <TableCell>{r.display_name || '—'}</TableCell>
                              <TableCell align='right'>{bucketCell(r.bucket_0_30)}</TableCell>
                              <TableCell align='right'>{bucketCell(r.bucket_31_60)}</TableCell>
                              <TableCell align='right'>{bucketCell(r.bucket_61_90)}</TableCell>
                              <TableCell align='right'>
                                 {r.bucket_over_90 > 0.005 ? (
                                    <Typography
                                       variant='body2'
                                       sx={{
                                          fontVariantNumeric: 'tabular-nums',
                                          fontWeight: 600,
                                          color: 'error.main'
                                       }}
                                    >
                                       {fmtCurrency(r.bucket_over_90)}
                                    </Typography>
                                 ) : (
                                    <Typography variant='body2' color='text.disabled'>
                                       —
                                    </Typography>
                                 )}
                              </TableCell>
                              <TableCell align='right'>
                                 <Typography
                                    variant='body2'
                                    sx={{
                                       fontVariantNumeric: 'tabular-nums',
                                       color: r.oldest_days > 90 ? 'error.main' : r.oldest_days > 60 ? 'warning.main' : 'text.primary'
                                    }}
                                 >
                                    {r.oldest_days ?? '—'}
                                 </Typography>
                              </TableCell>
                              <TableCell
                                 align='right'
                                 sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                              >
                                 {fmtCurrency(r.total_outstanding)}
                              </TableCell>
                              <TableCell>
                                 <Stack spacing={0}>
                                    <Typography variant='body2'>{fmtDate(r.last_payment_date)}</Typography>
                                    {r.last_payment_amount != null && (
                                       <Typography variant='caption' color='text.secondary'>
                                          {fmtCurrency(r.last_payment_amount)}
                                       </Typography>
                                    )}
                                 </Stack>
                              </TableCell>
                              <TableCell align='center'>
                                 {r.has_work_since_last_payment ? (
                                    <Tooltip title='Billable work has been recorded since the last payment'>
                                       <CheckIcon sx={{ color: '#02ab55' }} fontSize='small' />
                                    </Tooltip>
                                 ) : (
                                    <Typography variant='body2' color='text.disabled'>
                                       —
                                    </Typography>
                                 )}
                              </TableCell>
                           </TableRow>
                        ))}
                     {!loading && rows.length > 0 && (
                        <TableRow sx={{ '& td': { borderTop: '2px solid', borderTopColor: 'divider', fontWeight: 700 } }}>
                           <TableCell colSpan={3}>Page totals</TableCell>
                           <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {fmtCurrency(pageTotals.bucket_0_30)}
                           </TableCell>
                           <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {fmtCurrency(pageTotals.bucket_31_60)}
                           </TableCell>
                           <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {fmtCurrency(pageTotals.bucket_61_90)}
                           </TableCell>
                           <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                              {fmtCurrency(pageTotals.bucket_over_90)}
                           </TableCell>
                           <TableCell />
                           <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {fmtCurrency(pageTotals.total)}
                           </TableCell>
                           <TableCell colSpan={2} />
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
            </Paper>

            <Stack direction='row' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={1}>
               <Typography variant='caption' color='text.secondary'>
                  {pagination.totalItems} customer{pagination.totalItems === 1 ? '' : 's'} with outstanding balance
                  {search ? ` matching "${search}"` : ''}
                  {filter ? ` · ${AGE_FILTERS.find(f => f.value === filter)?.label}` : ''}
               </Typography>
               <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                  <Pagination
                     count={pagination.totalPages || 1}
                     page={page}
                     onChange={(_e, v) => setPage(v)}
                     size='small'
                  />
                  <Stack direction='row' alignItems='center' spacing={0.5}>
                     <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
                        Per page
                     </Typography>
                     <Select
                        value={limit}
                        onChange={handleLimitChange}
                        size='small'
                        sx={{ fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.5, pr: 3 } }}
                     >
                        {PAGE_SIZE_OPTIONS.map(n => (
                           <MenuItem key={n} value={n}>
                              {n}
                           </MenuItem>
                        ))}
                     </Select>
                  </Stack>
               </Stack>
            </Stack>
         </Stack>
      </Box>
   );
}
