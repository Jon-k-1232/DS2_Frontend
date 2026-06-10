import React, { useState, useEffect, useContext } from 'react';
import {
   Box,
   Stack,
   Typography,
   TextField,
   MenuItem,
   Button,
   Paper,
   Grid,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   LinearProgress,
   CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Alert } from '@mui/material';
import { context } from '../../App';
import { fetchTimeAllocation, downloadTimeAllocationCsv } from '../../Services/ApiCalls/AnalyticsCalls';

const fmtMoney = v => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
const fmtHours = v => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 }));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const HoursBar = ({ value, max }) => (
   <LinearProgress variant='determinate' value={max > 0 ? Math.min(100, (value / max) * 100) : 0} sx={{ height: 8, borderRadius: 4, minWidth: 80 }} />
);

/**
 * Time Allocation — where the year's hours actually went: client work vs
 * administrative and everything else. Two lenses: finalized transactions
 * (what reached the ledger) and the raw tracker (everything logged, including
 * held/unprocessed rows).
 */
export default function TimeAllocationPage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [year, setYear] = useState(new Date().getFullYear() - 1);
   const [data, setData] = useState(null);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetchTimeAllocation(accountID, userID, { year });
            if (cancelled) return;
            if (res?.timeAllocation) setData(res.timeAllocation);
            else setError(res?.message || 'Unable to load time allocation.');
         } catch (err) {
            console.error('Error fetching time allocation:', err);
            if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load time allocation.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };
      if (accountID && userID) load();
      return () => {
         cancelled = true;
      };
   }, [accountID, userID, year]);

   // Always include the selected year so the controlled Select never holds a
   // value missing from its options.
   const yearOptions = data?.availableYears?.length
      ? data.availableYears.includes(year)
         ? data.availableYears
         : [...data.availableYears, year].sort((a, b) => b - a)
      : [year];
   const maxDescHours = Math.max(1, ...(data?.byWorkDescription || []).map(r => r.hours));
   const maxMonthHours = Math.max(1, ...(data?.monthly || []).map(r => r.billable_hours + r.nonbillable_hours));
   const maxTrackerHours = Math.max(1, ...(data?.trackerByCategory || []).map(r => r.hours));

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent='space-between'>
            <Box>
               <Typography variant='h5'>Time Allocation</Typography>
               <Typography variant='body2' color='text.secondary'>
                  Where {year}'s hours went — client work vs administrative and everything else.
               </Typography>
            </Box>
            <Stack direction='row' spacing={1} alignItems='center'>
               <TextField select size='small' label='Year' value={year} onChange={e => setYear(Number(e.target.value))} sx={{ width: 110 }}>
                  {yearOptions.map(y => (
                     <MenuItem key={y} value={y}>
                        {y}
                     </MenuItem>
                  ))}
               </TextField>
               <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadTimeAllocationCsv(accountID, userID, { year }).catch(err => setError(err.message || 'CSV export failed.'))}
               >
                  CSV
               </Button>
            </Stack>
         </Stack>

         {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

         {loading || !data ? (
            <Stack alignItems='center' justifyContent='center' sx={{ height: 300 }}>
               <CircularProgress />
            </Stack>
         ) : (
            <>
               <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <SummaryCard label='Total Hours' value={fmtHours(data.summary.total_hours)} hint={`${data.summary.entries.toLocaleString()} entries`} />
                  <SummaryCard label='Billable Hours' value={fmtHours(data.summary.billable_hours)} hint={data.summary.billable_pct == null ? '' : `${data.summary.billable_pct}% of total`} />
                  <SummaryCard label='Non-Billable Hours' value={fmtHours(data.summary.nonbillable_hours)} />
                  <SummaryCard label='Billed' value={fmtMoney(data.summary.billed_amount)} />
               </Stack>

               <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                     <Paper variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='subtitle1' sx={{ mb: 1 }}>
                           By Work Description
                        </Typography>
                        <Table size='small'>
                           <TableHead>
                              <TableRow>
                                 <TableCell>Work</TableCell>
                                 <TableCell align='right'>Hours</TableCell>
                                 <TableCell sx={{ width: 120 }} />
                                 <TableCell align='right'>Billed</TableCell>
                              </TableRow>
                           </TableHead>
                           <TableBody>
                              {data.byWorkDescription.map(r => (
                                 <TableRow key={r.work_description}>
                                    <TableCell>{r.work_description}</TableCell>
                                    <TableCell align='right'>{fmtHours(r.hours)}</TableCell>
                                    <TableCell>
                                       <HoursBar value={r.hours} max={maxDescHours} />
                                    </TableCell>
                                    <TableCell align='right'>{fmtMoney(r.billed_amount)}</TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </Paper>
                  </Grid>

                  <Grid item xs={12} md={5}>
                     <Stack spacing={2}>
                        <Paper variant='outlined' sx={{ p: 2 }}>
                           <Typography variant='subtitle1' sx={{ mb: 1 }}>
                              By Employee
                           </Typography>
                           <Table size='small'>
                              <TableHead>
                                 <TableRow>
                                    <TableCell>Employee</TableCell>
                                    <TableCell align='right'>Hours</TableCell>
                                    <TableCell align='right'>Billable %</TableCell>
                                    <TableCell align='right'>Billed</TableCell>
                                 </TableRow>
                              </TableHead>
                              <TableBody>
                                 {data.byEmployee.map(r => (
                                    <TableRow key={r.employee}>
                                       <TableCell>{r.employee}</TableCell>
                                       <TableCell align='right'>{fmtHours(r.hours)}</TableCell>
                                       <TableCell align='right'>{r.utilization_pct == null ? '—' : `${r.utilization_pct}%`}</TableCell>
                                       <TableCell align='right'>{fmtMoney(r.billed_amount)}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </Paper>

                        <Paper variant='outlined' sx={{ p: 2 }}>
                           <Typography variant='subtitle1' sx={{ mb: 1 }}>
                              By Month
                           </Typography>
                           <Table size='small'>
                              <TableBody>
                                 {data.monthly.map(r => (
                                    <TableRow key={r.month}>
                                       <TableCell sx={{ width: 48 }}>{MONTHS[r.month - 1]}</TableCell>
                                       <TableCell>
                                          <HoursBar value={r.billable_hours + r.nonbillable_hours} max={maxMonthHours} />
                                       </TableCell>
                                       <TableCell align='right'>{fmtHours(r.billable_hours + r.nonbillable_hours)}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </Paper>
                     </Stack>
                  </Grid>

                  <Grid item xs={12} md={7}>
                     <Paper variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='subtitle1'>Raw Tracker by Category</Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                           Everything logged in the time tracker for {year}, including held/unprocessed rows — may differ from finalized transactions above.
                        </Typography>
                        <Table size='small'>
                           <TableBody>
                              {data.trackerByCategory.map(r => (
                                 <TableRow key={r.category}>
                                    <TableCell>{r.category}</TableCell>
                                    <TableCell align='right'>{fmtHours(r.hours)}</TableCell>
                                    <TableCell sx={{ width: 140 }}>
                                       <HoursBar value={r.hours} max={maxTrackerHours} />
                                    </TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </Paper>
                  </Grid>

                  <Grid item xs={12} md={5}>
                     <Paper variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='subtitle1' sx={{ mb: 1 }}>
                           Top Customers by Hours
                        </Typography>
                        <Table size='small'>
                           <TableBody>
                              {data.byCustomer.map(r => (
                                 <TableRow key={r.customer}>
                                    <TableCell>{r.customer}</TableCell>
                                    <TableCell align='right'>{fmtHours(r.hours)}</TableCell>
                                    <TableCell align='right'>{fmtMoney(r.billed_amount)}</TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </Paper>
                  </Grid>
               </Grid>
            </>
         )}
      </Stack>
   );
}
