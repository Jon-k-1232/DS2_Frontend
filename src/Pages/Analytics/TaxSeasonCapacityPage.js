import React, { useState, useEffect, useContext } from 'react';
import {
   Box,
   Stack,
   Typography,
   TextField,
   MenuItem,
   Paper,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   LinearProgress,
   CircularProgress
} from '@mui/material';
import { Alert } from '@mui/material';
import { context } from '../../App';
import { fetchTaxSeasonCapacity } from '../../Services/ApiCalls/AnalyticsCalls';

const fmtHours = v => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 }));

const sumByWeek = rows => {
   const map = {};
   (rows || []).forEach(r => {
      map[r.week] = (map[r.week] || 0) + Number(r.hours);
   });
   return map;
};

const groupByEmployee = rows => {
   const map = {};
   (rows || []).forEach(r => {
      if (!map[r.employee]) map[r.employee] = {};
      map[r.employee][r.week] = (map[r.employee][r.week] || 0) + Number(r.hours);
   });
   return map;
};

const totalOf = byWeek => Object.values(byWeek).reduce((s, v) => s + v, 0);

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

const WeekTable = ({ year, currentByWeek, priorByWeek }) => {
   const weeks = [...new Set([...Object.keys(currentByWeek), ...Object.keys(priorByWeek)].map(Number))].sort((a, b) => a - b);
   const max = Math.max(1, ...Object.values(currentByWeek), ...Object.values(priorByWeek));
   return (
      <Table size='small'>
         <TableHead>
            <TableRow>
               <TableCell>Week</TableCell>
               <TableCell align='right'>{year} hrs</TableCell>
               <TableCell sx={{ width: 120 }} />
               <TableCell align='right'>{year - 1} hrs</TableCell>
               <TableCell sx={{ width: 120 }} />
            </TableRow>
         </TableHead>
         <TableBody>
            {weeks.map(w => (
               <TableRow key={w}>
                  <TableCell>{w}</TableCell>
                  <TableCell align='right'>{fmtHours(currentByWeek[w] || 0)}</TableCell>
                  <TableCell>
                     <HoursBar value={currentByWeek[w] || 0} max={max} />
                  </TableCell>
                  <TableCell align='right'>{fmtHours(priorByWeek[w] || 0)}</TableCell>
                  <TableCell>
                     <HoursBar value={priorByWeek[w] || 0} max={max} />
                  </TableCell>
               </TableRow>
            ))}
         </TableBody>
      </Table>
   );
};

/**
 * Tax Season Capacity — hours per employee per ISO week across the tax season
 * window (Jan 1 – Apr 15), comparing the selected year against the prior year.
 */
export default function TaxSeasonCapacityPage() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [year, setYear] = useState(new Date().getFullYear());
   const [data, setData] = useState(null);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetchTaxSeasonCapacity(accountID, userID, { year });
            if (cancelled) return;
            if (res?.taxSeasonCapacity) setData(res.taxSeasonCapacity);
            else setError(res?.message || 'Unable to load tax season capacity.');
         } catch (err) {
            console.error('Error fetching tax season capacity:', err);
            if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load tax season capacity.');
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
   const nowYear = new Date().getFullYear();
   const yearOptions = [...new Set([nowYear, nowYear - 1, nowYear - 2, year])].sort((a, b) => b - a);

   const current = data?.current || [];
   const prior = data?.prior || [];
   const firmCurrentByWeek = sumByWeek(current);
   const firmPriorByWeek = sumByWeek(prior);
   const totalCurrent = totalOf(firmCurrentByWeek);
   const totalPrior = totalOf(firmPriorByWeek);
   const changePct = totalPrior === 0 ? null : ((totalCurrent - totalPrior) / totalPrior) * 100;
   const peakWeek = Object.keys(firmCurrentByWeek).length
      ? Number(Object.keys(firmCurrentByWeek).reduce((a, b) => (firmCurrentByWeek[a] >= firmCurrentByWeek[b] ? a : b)))
      : null;

   const currentByEmployee = groupByEmployee(current);
   const priorByEmployee = groupByEmployee(prior);
   const employees = [...new Set([...Object.keys(currentByEmployee), ...Object.keys(priorByEmployee)])].sort(
      (a, b) => totalOf(currentByEmployee[b] || {}) - totalOf(currentByEmployee[a] || {})
   );

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent='space-between'>
            <Box>
               <Typography variant='h5'>Tax Season Capacity</Typography>
               <Typography variant='body2' color='text.secondary'>
                  Hours per employee per week, January 1 – April 15 — {year} vs {year - 1}.
               </Typography>
            </Box>
            <TextField select size='small' label='Year' value={year} onChange={e => setYear(Number(e.target.value))} sx={{ width: 110 }}>
               {yearOptions.map(y => (
                  <MenuItem key={y} value={y}>
                     {y}
                  </MenuItem>
               ))}
            </TextField>
         </Stack>

         {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

         {loading || !data ? (
            <Stack alignItems='center' justifyContent='center' sx={{ height: 300 }}>
               <CircularProgress />
            </Stack>
         ) : (
            <>
               <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <SummaryCard label={`Total Hours ${year}`} value={fmtHours(totalCurrent)} />
                  <SummaryCard label={`Total Hours ${year - 1}`} value={fmtHours(totalPrior)} />
                  <SummaryCard
                     label='Change %'
                     value={changePct == null ? '—' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`}
                     hint={`vs ${year - 1}`}
                  />
                  <SummaryCard label='Peak Week' value={peakWeek == null ? '—' : `Week ${peakWeek}`} hint={`highest total hours in ${year}`} />
               </Stack>

               <Paper variant='outlined' sx={{ p: 2 }}>
                  <Typography variant='subtitle1' sx={{ mb: 1 }}>
                     All staff by week
                  </Typography>
                  <WeekTable year={year} currentByWeek={firmCurrentByWeek} priorByWeek={firmPriorByWeek} />
               </Paper>

               {employees.map(employee => {
                  const curByWeek = currentByEmployee[employee] || {};
                  const priByWeek = priorByEmployee[employee] || {};
                  return (
                     <Paper key={employee} variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='subtitle1'>{employee}</Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                           {fmtHours(totalOf(curByWeek))} hrs vs {fmtHours(totalOf(priByWeek))} last year
                        </Typography>
                        <WeekTable year={year} currentByWeek={curByWeek} priorByWeek={priByWeek} />
                     </Paper>
                  );
               })}
            </>
         )}
      </Stack>
   );
}
