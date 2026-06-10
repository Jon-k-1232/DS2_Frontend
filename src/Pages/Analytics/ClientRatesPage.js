import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
   Box,
   Stack,
   Typography,
   TextField,
   MenuItem,
   Button,
   Paper,
   Chip,
   Dialog,
   DialogTitle,
   DialogContent,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   CircularProgress,
   Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { context } from '../../App';
import { fetchClientRates, downloadClientRatesCsv, saveRateAgreement } from '../../Services/ApiCalls/AnalyticsCalls';
import useExcludedCustomers from './useExcludedCustomers';

const fmtMoney = v => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmtRate = v => (v == null ? '—' : `$${Number(v).toFixed(2)}`);
const fmtPct = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`);

/**
 * Client Rates — what each client was actually charged per hour, per year,
 * side by side with every other client. Effective rate = time billings ÷ time
 * hours, so it reflects realized pricing rather than book rates.
 */
export default function ClientRatesPage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [yearsBack, setYearsBack] = useState(6);
   const [data, setData] = useState(null);
   const [search, setSearch] = useState('');
   const [activeOnly, setActiveOnly] = useState(true);
   const [detailClient, setDetailClient] = useState(null);
   const [agreementYear, setAgreementYear] = useState(new Date().getFullYear());
   const [agreementRate, setAgreementRate] = useState('');
   const [savingAgreement, setSavingAgreement] = useState(false);

   const [reloadTick, setReloadTick] = useState(0);
   const { ready, excludedIds, filter } = useExcludedCustomers();

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetchClientRates(accountID, userID, { yearsBack, exclude: excludedIds });
            if (cancelled) return;
            if (res?.clientRates) setData(res.clientRates);
            else setError(res?.message || 'Unable to load client rates.');
         } catch (err) {
            console.error('Error fetching client rates:', err);
            if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load client rates.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };
      if (accountID && userID && ready) load();
      return () => {
         cancelled = true;
      };
   }, [accountID, userID, yearsBack, reloadTick, ready, excludedIds]);

   const years = useMemo(() => data?.years || [], [data]);
   const firm = data?.firm;

   const rows = useMemo(() => {
      if (!data) return [];
      const term = search.trim().toLowerCase();
      return data.clients
         .filter(c => (!activeOnly || c.is_active) && (!term || c.display_name.toLowerCase().includes(term)))
         .map(c => {
            const row = { id: c.customer_id, ...c };
            years.forEach(y => {
               row[`rate_${y}`] = c.years[y]?.effective_rate ?? null;
               row[`billed_${y}`] = c.years[y]?.total_billed ?? null;
            });
            const lastFullYear = data.firm?.last_full_year;
            row.agreed_rate_last = c.years[lastFullYear]?.agreed_rate ?? null;
            row.rate_variance_last = c.years[lastFullYear]?.rate_variance ?? null;
            row.margin_last = c.years[lastFullYear]?.margin ?? null;
            return row;
         });
   }, [data, search, activeOnly, years]);

   const columns = useMemo(() => {
      const yearCols = years.map(y => ({
         field: `rate_${y}`,
         headerName: `${y} Rate`,
         width: 110,
         type: 'number',
         valueFormatter: params => fmtRate(params.value),
         renderCell: params => (
            <Tooltip title={`Billed ${fmtMoney(params.row[`billed_${y}`])} · ${params.row.years[y]?.hours ?? 0} hrs`}>
               <span>{fmtRate(params.value)}</span>
            </Tooltip>
         )
      }));
      return [
         { field: 'display_name', headerName: 'Client', flex: 1, minWidth: 220 },
         ...yearCols,
         {
            field: 'yoy_pct',
            headerName: 'YoY',
            width: 90,
            type: 'number',
            valueFormatter: params => fmtPct(params.value)
         },
         {
            field: 'agreed_rate_last',
            headerName: 'Agreed',
            width: 95,
            type: 'number',
            valueFormatter: params => fmtRate(params.value)
         },
         {
            field: 'rate_variance_last',
            headerName: 'Var',
            width: 85,
            type: 'number',
            renderCell: params =>
               params.value == null ? (
                  '—'
               ) : (
                  <Box component='span' sx={{ color: params.value < 0 ? 'error.main' : 'success.main' }}>{fmtRate(params.value)}</Box>
               )
         },
         {
            field: 'margin_last',
            headerName: 'Margin',
            width: 110,
            type: 'number',
            renderCell: params =>
               params.value == null ? (
                  '—'
               ) : (
                  <Box component='span' sx={{ color: params.value < 0 ? 'error.main' : 'inherit' }}>{fmtMoney(params.value)}</Box>
               )
         },
         {
            field: 'suggested_rate',
            headerName: `Suggested ${new Date().getFullYear()}`,
            width: 140,
            type: 'number',
            valueFormatter: params => fmtRate(params.value)
         }
      ];
   }, [years]);

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent='space-between'>
            <Box>
               <Typography variant='h5'>Client Rates</Typography>
               <Typography variant='body2' color='text.secondary'>
                  Realized hourly rate per client per year (time billings ÷ hours). Hover a rate for billed totals.
               </Typography>
            </Box>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
               {filter}
               <TextField select size='small' label='Years' value={yearsBack} onChange={e => setYearsBack(Number(e.target.value))} sx={{ width: 110 }}>
                  {[3, 4, 5, 6, 8, 10].map(n => (
                     <MenuItem key={n} value={n}>
                        Last {n}
                     </MenuItem>
                  ))}
               </TextField>
               <TextField size='small' label='Search client' value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 200 }} />
               <Chip
                  label={activeOnly ? 'Active clients' : 'All clients'}
                  color={activeOnly ? 'primary' : 'default'}
                  onClick={() => setActiveOnly(v => !v)}
                  variant={activeOnly ? 'filled' : 'outlined'}
               />
               <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadClientRatesCsv(accountID, userID, { yearsBack, exclude: excludedIds }).catch(err => setError(err.message || 'CSV export failed.'))}
               >
                  CSV
               </Button>
            </Stack>
         </Stack>

         {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

         {firm && (
            <Paper variant='outlined' sx={{ p: 1.5 }}>
               <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
                  <Typography variant='body2'>
                     Firm median rate {firm.last_full_year}: <b>{fmtRate(firm.years?.[firm.last_full_year]?.median_rate)}</b>
                  </Typography>
                  <Typography variant='body2'>
                     Median YoY rate growth: <b>{fmtPct(firm.median_yoy_pct)}</b>
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                     Suggested rate = {firm.suggestion_formula}
                  </Typography>
               </Stack>
            </Paper>
         )}

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
                  onRowClick={params => setDetailClient(params.row)}
                  initialState={{ sorting: { sortModel: [{ field: `rate_${years[years.length - 2] ?? years[years.length - 1]}`, sort: 'desc' }] } }}
                  pageSizeOptions={[25, 50, 100]}
               />
            )}
         </Box>

         <Dialog open={Boolean(detailClient)} onClose={() => setDetailClient(null)} maxWidth='md' fullWidth>
            <DialogTitle>{detailClient?.display_name} — billing history</DialogTitle>
            <DialogContent>
               <Table size='small'>
                  <TableHead>
                     <TableRow>
                        <TableCell>Year</TableCell>
                        <TableCell align='right'>Hours</TableCell>
                        <TableCell align='right'>Time Billed</TableCell>
                        <TableCell align='right'>Fixed Charges</TableCell>
                        <TableCell align='right'>Total Billed</TableCell>
                        <TableCell align='right'>Write-offs</TableCell>
                        <TableCell align='right'>Realization</TableCell>
                        <TableCell align='right'>Rate</TableCell>
                        <TableCell align='right'>Agreed</TableCell>
                        <TableCell align='right'>Var</TableCell>
                        <TableCell align='right'>Margin</TableCell>
                        <TableCell align='right'>Firm %ile</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {detailClient &&
                        years
                           .filter(y => detailClient.years[y])
                           .map(y => {
                              const r = detailClient.years[y];
                              return (
                                 <TableRow key={y}>
                                    <TableCell>{y}</TableCell>
                                    <TableCell align='right'>{r.hours}</TableCell>
                                    <TableCell align='right'>{fmtMoney(r.time_billed)}</TableCell>
                                    <TableCell align='right'>{fmtMoney(r.charges_billed)}</TableCell>
                                    <TableCell align='right'>{fmtMoney(r.total_billed)}</TableCell>
                                    <TableCell align='right'>{fmtMoney(r.writeoffs)}</TableCell>
                                    <TableCell align='right'>{r.realization_pct == null ? '—' : `${r.realization_pct}%`}</TableCell>
                                    <TableCell align='right'>{fmtRate(r.effective_rate)}</TableCell>
                                    <TableCell align='right'>{fmtRate(r.agreed_rate)}</TableCell>
                                    <TableCell align='right' sx={{ color: r.rate_variance == null ? 'inherit' : r.rate_variance < 0 ? 'error.main' : 'success.main' }}>
                                       {fmtRate(r.rate_variance)}
                                    </TableCell>
                                    <TableCell align='right' sx={{ color: r.margin != null && r.margin < 0 ? 'error.main' : 'inherit' }}>{fmtMoney(r.margin)}</TableCell>
                                    <TableCell align='right'>{r.firm_percentile == null ? '—' : `${r.firm_percentile}`}</TableCell>
                                 </TableRow>
                              );
                           })}
                  </TableBody>
               </Table>
               <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                  Realization = (billed − write-offs) ÷ billed. Margin = billed − write-offs − (hours × employee cost rate). Firm %ile compares this client's realized rate against all
                  clients with ≥1 hour that year.
               </Typography>

               <Paper variant='outlined' sx={{ p: 1.5, mt: 2 }}>
                  <Typography variant='subtitle2' sx={{ mb: 1 }}>
                     Set agreed rate (engagement letter)
                  </Typography>
                  <Stack direction='row' spacing={1} alignItems='center'>
                     <TextField select size='small' label='Year' value={agreementYear} onChange={e => setAgreementYear(Number(e.target.value))} sx={{ width: 100 }}>
                        {[...years].reverse().map(y => (
                           <MenuItem key={y} value={y}>
                              {y}
                           </MenuItem>
                        ))}
                     </TextField>
                     <TextField
                        size='small'
                        label='Agreed $/hr'
                        type='number'
                        value={agreementRate}
                        onChange={e => setAgreementRate(e.target.value)}
                        sx={{ width: 130 }}
                     />
                     <Button
                        size='small'
                        variant='contained'
                        disabled={savingAgreement || !(Number(agreementRate) > 0)}
                        onClick={async () => {
                           setSavingAgreement(true);
                           try {
                              const res = await saveRateAgreement(accountID, userID, {
                                 customerId: detailClient.customer_id,
                                 year: agreementYear,
                                 agreedRate: Number(agreementRate)
                              });
                              if (res?.status !== 200) setError(res?.message || 'Unable to save the agreed rate.');
                              else {
                                 setDetailClient(null);
                                 setReloadTick(t => t + 1);
                              }
                           } catch (err) {
                              setError(err.response?.data?.message || err.message || 'Unable to save the agreed rate.');
                           } finally {
                              setSavingAgreement(false);
                           }
                        }}
                     >
                        {savingAgreement ? 'Saving…' : 'Save'}
                     </Button>
                     <Typography variant='caption' color='text.secondary'>
                        Variance against this shows in the Agreed/Var columns.
                     </Typography>
                  </Stack>
               </Paper>
            </DialogContent>
         </Dialog>
      </Stack>
   );
}
