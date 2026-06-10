import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
   Box,
   Stack,
   Typography,
   TextField,
   Paper,
   Chip,
   LinearProgress,
   CircularProgress
} from '@mui/material';
import { Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { context } from '../../App';
import { fetchJobBudgets } from '../../Services/ApiCalls/AnalyticsCalls';

const fmtMoney = v => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmtPct = v => (v == null ? '—' : `${Number(v).toFixed(0)}%`);

const consumedColor = pct => {
   if (pct == null) return 'primary';
   if (pct > 100) return 'error';
   if (pct > 80) return 'warning';
   return 'primary';
};

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
 * Job Budgets — budget vs actual for jobs with an agreed amount. Budget is
 * the job's agreed_job_amount; actual is what's been billed/logged against
 * the job, so consumed % shows how much of the agreed fee has been used up.
 */
export default function JobBudgetsPage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [data, setData] = useState([]);
   const [search, setSearch] = useState('');
   const [openOnly, setOpenOnly] = useState(true);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetchJobBudgets(accountID, userID);
            if (cancelled) return;
            if (res?.jobBudgets) setData(res.jobBudgets);
            else setError(res?.message || 'Unable to load job budgets.');
         } catch (err) {
            console.error('Error fetching job budgets:', err);
            if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load job budgets.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };
      if (accountID && userID) load();
      return () => {
         cancelled = true;
      };
   }, [accountID, userID]);

   const rows = useMemo(() => {
      const term = search.trim().toLowerCase();
      return data
         .filter(
            j =>
               (!openOnly || !j.is_complete) &&
               (!term || j.customer_name.toLowerCase().includes(term) || j.job_description.toLowerCase().includes(term))
         )
         .map(j => ({ id: j.customer_job_id, ...j }));
   }, [data, search, openOnly]);

   const totals = useMemo(
      () => ({
         budget: rows.reduce((sum, r) => sum + Number(r.budget || 0), 0),
         actual: rows.reduce((sum, r) => sum + Number(r.actual || 0), 0),
         overBudget: rows.filter(r => r.consumed_pct != null && r.consumed_pct > 100).length
      }),
      [rows]
   );

   const columns = useMemo(
      () => [
         { field: 'customer_name', headerName: 'Customer', flex: 1, minWidth: 180 },
         { field: 'job_description', headerName: 'Job', flex: 1, minWidth: 180 },
         {
            field: 'budget',
            headerName: 'Budget',
            width: 120,
            type: 'number',
            valueFormatter: params => fmtMoney(params.value)
         },
         {
            field: 'actual',
            headerName: 'Actual',
            width: 120,
            type: 'number',
            valueFormatter: params => fmtMoney(params.value)
         },
         {
            field: 'remaining',
            headerName: 'Remaining',
            width: 130,
            type: 'number',
            renderCell: params => (
               <Box component='span' sx={{ color: params.value < 0 ? 'error.main' : 'inherit' }}>
                  {fmtMoney(params.value)}
               </Box>
            )
         },
         {
            field: 'consumed_pct',
            headerName: 'Consumed',
            width: 170,
            type: 'number',
            renderCell: params => (
               <Stack direction='row' spacing={1} alignItems='center' sx={{ width: '100%' }}>
                  <LinearProgress
                     variant='determinate'
                     value={Math.min(100, params.value || 0)}
                     color={consumedColor(params.value)}
                     sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant='caption' sx={{ minWidth: 36, textAlign: 'right' }}>
                     {fmtPct(params.value)}
                  </Typography>
               </Stack>
            )
         },
         {
            field: 'is_complete',
            headerName: 'Status',
            width: 100,
            valueFormatter: params => (params.value ? 'Complete' : 'Open')
         }
      ],
      []
   );

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent='space-between'>
            <Box>
               <Typography variant='h5'>Job Budgets</Typography>
               <Typography variant='body2' color='text.secondary'>
                  Budget vs actual for jobs with an agreed amount. Jobs without an agreed amount don't appear — set agreed_job_amount on the job to track it here.
               </Typography>
            </Box>
            <Stack direction='row' spacing={1} alignItems='center'>
               <TextField size='small' label='Search customer or job' value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 220 }} />
               <Chip
                  label={openOnly ? 'Open jobs' : 'All jobs'}
                  color={openOnly ? 'primary' : 'default'}
                  onClick={() => setOpenOnly(v => !v)}
                  variant={openOnly ? 'filled' : 'outlined'}
               />
            </Stack>
         </Stack>

         {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

         {loading ? (
            <Stack alignItems='center' justifyContent='center' sx={{ height: 300 }}>
               <CircularProgress />
            </Stack>
         ) : !error && data.length === 0 ? (
            <Paper variant='outlined' sx={{ p: 3 }}>
               <Typography variant='body2' color='text.secondary'>
                  No jobs have an agreed amount yet. Add an agreed job amount on a customer job to start tracking budget vs actual.
               </Typography>
            </Paper>
         ) : (
            <>
               <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <SummaryCard label='Jobs Tracked' value={rows.length.toLocaleString()} />
                  <SummaryCard label='Total Budget' value={fmtMoney(totals.budget)} />
                  <SummaryCard label='Total Actual' value={fmtMoney(totals.actual)} />
                  <SummaryCard label='Over Budget' value={totals.overBudget.toLocaleString()} hint='Jobs past 100% consumed' />
               </Stack>

               <Box sx={{ height: 640, width: '100%' }}>
                  <DataGrid
                     rows={rows}
                     columns={columns}
                     density='compact'
                     disableRowSelectionOnClick
                     initialState={{ sorting: { sortModel: [{ field: 'consumed_pct', sort: 'desc' }] } }}
                     pageSizeOptions={[25, 50, 100]}
                  />
               </Box>
            </>
         )}
      </Stack>
   );
}
