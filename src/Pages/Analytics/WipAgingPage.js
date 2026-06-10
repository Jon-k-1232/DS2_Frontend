import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Box, Stack, Typography, TextField, Paper, Chip, CircularProgress } from '@mui/material';
import { Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { context } from '../../App';
import { fetchWipAging } from '../../Services/ApiCalls/AnalyticsCalls';
import useExcludedCustomers from './useExcludedCustomers';

const fmtMoney = v => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmtHours = v => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 }));
const fmtDate = v => (v == null ? '—' : dayjs(v).format('MM/DD/YYYY'));

const SummaryCard = ({ label, value, hint }) => (
   <Paper variant='outlined' sx={{ p: 2, flex: 1, minWidth: 150 }}>
      <Typography variant='body2' color='text.secondary'>
         {label}
      </Typography>
      <Typography variant='h5'>{value}</Typography>
      {hint && (
         <Typography variant='caption' color='text.secondary'>
            {hint}
         </Typography>
      )}
   </Paper>
);

/**
 * WIP / Unbilled Aging — billable work that was performed but never made it
 * onto an invoice, aged from the transaction date into 0-30 / 31-60 / 61-90 /
 * >90 day buckets.
 */
export default function WipAgingPage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [data, setData] = useState(null);
   const [search, setSearch] = useState('');
   const [activeOnly, setActiveOnly] = useState(true);
   const { ready, excludedIds, filter } = useExcludedCustomers();

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetchWipAging(accountID, userID, { exclude: excludedIds });
            if (cancelled) return;
            if (res?.wipAging) setData(res.wipAging);
            else setError(res?.message || 'Unable to load WIP aging.');
         } catch (err) {
            console.error('Error fetching WIP aging:', err);
            if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load WIP aging.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };
      if (accountID && userID && ready) load();
      return () => {
         cancelled = true;
      };
   }, [accountID, userID, ready, excludedIds]);

   const rows = useMemo(() => {
      if (!data) return [];
      const term = search.trim().toLowerCase();
      return data
         .filter(r => (!activeOnly || r.is_active) && (!term || r.display_name.toLowerCase().includes(term)))
         .map(r => ({ id: r.customer_id, ...r }));
   }, [data, search, activeOnly]);

   const summary = useMemo(
      () =>
         rows.reduce(
            (acc, r) => ({
               unbilled: acc.unbilled + (r.unbilled_amount || 0),
               hours: acc.hours + (r.unbilled_hours || 0),
               over90: acc.over90 + (r.bucket_over_90 || 0)
            }),
            { unbilled: 0, hours: 0, over90: 0 }
         ),
      [rows]
   );

   const columns = useMemo(() => {
      const moneyCol = (field, headerName, width = 110) => ({
         field,
         headerName,
         width,
         type: 'number',
         valueFormatter: params => fmtMoney(params.value)
      });
      return [
         { field: 'display_name', headerName: 'Customer', flex: 1, minWidth: 220 },
         moneyCol('unbilled_amount', 'Unbilled $', 130),
         {
            field: 'unbilled_hours',
            headerName: 'Hours',
            width: 90,
            type: 'number',
            valueFormatter: params => fmtHours(params.value)
         },
         { field: 'entries', headerName: 'Entries', width: 90, type: 'number' },
         {
            field: 'oldest_date',
            headerName: 'Oldest',
            width: 110,
            valueFormatter: params => fmtDate(params.value)
         },
         {
            field: 'days_old',
            headerName: 'Days Old',
            width: 100,
            type: 'number',
            valueFormatter: params => (params.value == null ? '—' : params.value)
         },
         moneyCol('bucket_0_30', '0-30'),
         moneyCol('bucket_31_60', '31-60'),
         moneyCol('bucket_61_90', '61-90'),
         moneyCol('bucket_over_90', '>90')
      ];
   }, []);

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent='space-between'>
            <Box>
               <Typography variant='h5'>WIP / Unbilled Aging</Typography>
               <Typography variant='body2' color='text.secondary'>
                  Billable work performed but not yet invoiced, aged from the transaction date.
               </Typography>
            </Box>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
               {filter}
               <TextField size='small' label='Search client' value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 200 }} />
               <Chip
                  label={activeOnly ? 'Active clients' : 'All clients'}
                  color={activeOnly ? 'primary' : 'default'}
                  onClick={() => setActiveOnly(v => !v)}
                  variant={activeOnly ? 'filled' : 'outlined'}
               />
            </Stack>
         </Stack>

         {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

         <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <SummaryCard label='Total Unbilled' value={fmtMoney(summary.unbilled)} />
            <SummaryCard label='Total Hours' value={fmtHours(summary.hours)} />
            <SummaryCard label='Customers' value={rows.length.toLocaleString('en-US')} />
            <SummaryCard label='Over 90 Days' value={fmtMoney(summary.over90)} hint='Oldest unbilled work' />
         </Stack>

         <Box sx={{ height: 640, width: '100%' }}>
            {loading ? (
               <Stack alignItems='center' justifyContent='center' sx={{ height: '100%' }}>
                  <CircularProgress />
               </Stack>
            ) : (
               <DataGrid
                  rows={rows}
                  columns={columns}
                  density='compact'
                  disableRowSelectionOnClick
                  initialState={{ sorting: { sortModel: [{ field: 'days_old', sort: 'desc' }] } }}
                  pageSizeOptions={[25, 50, 100]}
               />
            )}
         </Box>
      </Stack>
   );
}
