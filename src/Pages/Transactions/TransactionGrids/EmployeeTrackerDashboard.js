import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
   Stack,
   TextField,
   Accordion,
   AccordionSummary,
   AccordionDetails,
   Typography,
   Chip,
   Box,
   CircularProgress,
   IconButton,
   Tooltip,
   Snackbar,
   Alert,
   InputAdornment,
   Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { context } from '../../../App';
import { fetchOutstandingTimesheetCounts, fetchAllEmployeeTimesheetsByID } from '../../../Services/ApiCalls/FetchCalls';
import { downloadTimeTrackerByName } from '../../../Services/ApiCalls/TimeTrackingCalls';

// Postgres returns full ISO timestamps for date columns; plain YYYY-MM-DD strings
// need a local-time suffix so they don't shift by timezone offset.
const parseDate = dateStr => {
   if (!dateStr) return null;
   const s = String(dateStr);
   const d = s.includes('T') || s.includes('Z') ? new Date(s) : new Date(s + 'T00:00:00');
   return isNaN(d.getTime()) ? null : d;
};

const formatDate = dateStr => {
   const d = parseDate(dateStr);
   if (!d) return '—';
   return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatUploadedAt = dateStr => {
   const d = parseDate(dateStr);
   if (!d) return '—';
   return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getMonthLabel = dateStr => {
   const d = parseDate(dateStr);
   if (!d) return 'Unknown';
   return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const isCurrentMonth = dateStr => {
   const d = parseDate(dateStr);
   if (!d) return false;
   const now = new Date();
   return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const getCurrentMonthLabel = () => {
   const now = new Date();
   return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const groupTimesheetsByMonth = timesheets => {
   const currentLabel = getCurrentMonthLabel();
   const currentMonth = [];
   const byMonth = {};

   timesheets.forEach(ts => {
      const startDate = ts.time_tracker_start_date;
      if (isCurrentMonth(startDate)) {
         currentMonth.push(ts);
      } else {
         const label = getMonthLabel(startDate);
         if (!byMonth[label]) {
            byMonth[label] = { trackers: [], sortMs: (parseDate(startDate) || new Date(0)).getTime() };
         }
         byMonth[label].trackers.push(ts);
      }
   });

   const sortedPastMonths = Object.entries(byMonth).sort(([, a], [, b]) => b.sortMs - a.sortMs);

   return { currentLabel, currentMonth, sortedPastMonths };
};

export default function EmployeeTrackerDashboard({ refreshKey }) {
   const [employees, setEmployees] = useState([]);
   const [loadingEmployees, setLoadingEmployees] = useState(true);
   const [search, setSearch] = useState('');
   const [filterFrom, setFilterFrom] = useState('');
   const [filterTo, setFilterTo] = useState('');
   const [expandedEmployee, setExpandedEmployee] = useState(null);
   const [expandedMonths, setExpandedMonths] = useState({});
   const [timesheetsByEmployee, setTimesheetsByEmployee] = useState({});
   const [loadingTimesheets, setLoadingTimesheets] = useState({});
   const [downloadingKey, setDownloadingKey] = useState({});
   const [downloadError, setDownloadError] = useState('');

   const { accountID, userID, token } = useContext(context).loggedInUser;

   useEffect(() => {
      const load = async () => {
         setLoadingEmployees(true);
         try {
            const data = await fetchOutstandingTimesheetCounts(accountID, userID, token);
            setEmployees(data?.timesheetsByEmployees || []);
         } finally {
            setLoadingEmployees(false);
         }
      };
      load();
      // eslint-disable-next-line
   }, [refreshKey, accountID, userID]);

   const handleAccordionChange = useCallback(
      async employeeUserId => {
         if (expandedEmployee === employeeUserId) {
            setExpandedEmployee(null);
            return;
         }
         setExpandedEmployee(employeeUserId);

         if (timesheetsByEmployee[employeeUserId] !== undefined) return;

         setLoadingTimesheets(prev => ({ ...prev, [employeeUserId]: true }));
         try {
            const response = await fetchAllEmployeeTimesheetsByID(accountID, userID, employeeUserId, token, 1, 200);
            setTimesheetsByEmployee(prev => ({
               ...prev,
               [employeeUserId]: response?.allEmployeeTimesheets || []
            }));
         } catch {
            setTimesheetsByEmployee(prev => ({ ...prev, [employeeUserId]: [] }));
         } finally {
            setLoadingTimesheets(prev => ({ ...prev, [employeeUserId]: false }));
         }
      },
      [expandedEmployee, timesheetsByEmployee, accountID, userID, token]
   );

   const triggerDownload = (blob, fileName) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
   };

   const handleDownload = useCallback(
      async (employeeUserId, timesheetName) => {
         const key = `${employeeUserId}:${timesheetName}`;
         setDownloadingKey(prev => ({ ...prev, [key]: true }));
         try {
            const { blob, fileName } = await downloadTimeTrackerByName(accountID, userID, employeeUserId, timesheetName, token);
            triggerDownload(blob, fileName);
         } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Could not download the tracker. Please try again.';
            setDownloadError(message);
         } finally {
            setDownloadingKey(prev => ({ ...prev, [key]: false }));
         }
      },
      [accountID, userID, token]
   );

   const applyDateFilter = useCallback(
      timesheets => {
         if (!filterFrom && !filterTo) return timesheets;
         return timesheets.filter(ts => {
            const startD = parseDate(ts.time_tracker_start_date);
            const endD = parseDate(ts.time_tracker_end_date);
            // Compare as YYYY-MM-DD strings for simplicity
            const toYMD = d => (d ? d.toISOString().slice(0, 10) : '');
            const start = toYMD(startD);
            const end = toYMD(endD);
            if (filterFrom && end && end < filterFrom) return false;
            if (filterTo && start && start > filterTo) return false;
            return true;
         });
      },
      [filterFrom, filterTo]
   );

   const hasActiveFilters = !!filterFrom || !!filterTo;

   const isMonthExpanded = (userId, label, isCurrent) => {
      const key = `${userId}_${label}`;
      return expandedMonths.hasOwnProperty(key) ? expandedMonths[key] : isCurrent;
   };

   const toggleMonth = (userId, label, isCurrent) => {
      const key = `${userId}_${label}`;
      setExpandedMonths(prev => ({ ...prev, [key]: !isMonthExpanded(userId, label, isCurrent) }));
   };

   const clearFilters = () => {
      setFilterFrom('');
      setFilterTo('');
   };

   const filteredEmployees = useMemo(() => {
      if (!search.trim()) return employees;
      const term = search.toLowerCase();
      return employees.filter(e => (e.display_name || '').toLowerCase().includes(term));
   }, [employees, search]);

   const renderTrackerRow = (ts, employeeUserId) => {
      const dlKey = `${employeeUserId}:${ts.timesheet_name}`;
      const isDownloading = !!downloadingKey[dlKey];
      return (
         <Box
            key={ts.timesheet_name}
            sx={{
               display: 'flex',
               alignItems: 'center',
               gap: 1.5,
               py: 1,
               px: 2.5,
               borderBottom: '1px solid',
               borderColor: 'divider',
               '&:last-child': { borderBottom: 'none' },
               '&:hover': { bgcolor: 'action.hover' }
            }}
         >
            <Tooltip title={ts.timesheet_name} placement='top-start'>
               <Typography
                  variant='body2'
                  noWrap
                  sx={{ flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.primary' }}
               >
                  {ts.timesheet_name}
               </Typography>
            </Tooltip>
            <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
               {formatDate(ts.time_tracker_start_date)} – {formatDate(ts.time_tracker_end_date)}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: 180, textAlign: 'right' }}>
               Uploaded {formatUploadedAt(ts.created_at)}
            </Typography>
            <Tooltip title={isDownloading ? 'Downloading…' : 'Download original tracker file'}>
               <span>
                  <IconButton size='small' color='primary' disabled={isDownloading} onClick={() => handleDownload(employeeUserId, ts.timesheet_name)}>
                     {isDownloading ? <CircularProgress size={16} /> : <DownloadIcon fontSize='small' />}
                  </IconButton>
               </span>
            </Tooltip>
         </Box>
      );
   };

   const renderMonthSection = (label, trackers, employeeUserId, isCurrent) => {
      if (!trackers || !trackers.length) return null;
      const open = isMonthExpanded(employeeUserId, label, isCurrent);
      return (
         <Box key={label}>
            <Box
               onClick={() => toggleMonth(employeeUserId, label, isCurrent)}
               sx={{
                  px: 2.5,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isCurrent ? 'rgba(25, 118, 210, 0.06)' : 'grey.50',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { filter: 'brightness(0.97)' }
               }}
            >
               <ExpandMoreIcon
                  sx={{
                     fontSize: 18,
                     color: isCurrent ? 'primary.main' : 'text.secondary',
                     transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                     transition: 'transform 0.2s'
                  }}
               />
               <Typography variant='subtitle2' color={isCurrent ? 'primary.main' : 'text.secondary'} fontWeight={isCurrent ? 600 : 500}>
                  {label}
               </Typography>
               {isCurrent && <Chip label='Current Month' size='small' color='primary' variant='outlined' sx={{ height: 20, fontSize: '0.7rem' }} />}
               <Chip
                  label={`${trackers.length} tracker${trackers.length !== 1 ? 's' : ''}`}
                  size='small'
                  variant='outlined'
                  sx={{ height: 20, fontSize: '0.7rem' }}
               />
            </Box>
            {open && trackers.map(ts => renderTrackerRow(ts, employeeUserId))}
         </Box>
      );
   };

   return (
      <Stack spacing={2}>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='h6' fontWeight={600}>
               Employee Time Trackers
            </Typography>
            {loadingEmployees && <CircularProgress size={20} />}
            {!loadingEmployees && (
               <Typography variant='body2' color='text.secondary'>
                  {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
               </Typography>
            )}
         </Box>

         <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <TextField
               size='small'
               placeholder='Search employees…'
               value={search}
               onChange={e => setSearch(e.target.value)}
               sx={{ width: 240 }}
               InputProps={{
                  startAdornment: (
                     <InputAdornment position='start'>
                        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                     </InputAdornment>
                  )
               }}
            />
            <TextField
               size='small'
               label='From'
               type='date'
               value={filterFrom}
               onChange={e => setFilterFrom(e.target.value)}
               InputLabelProps={{ shrink: true }}
               sx={{ width: 160 }}
            />
            <TextField
               size='small'
               label='To'
               type='date'
               value={filterTo}
               onChange={e => setFilterTo(e.target.value)}
               InputLabelProps={{ shrink: true }}
               sx={{ width: 160 }}
            />
            {hasActiveFilters && (
               <Button
                  size='small'
                  variant='outlined'
                  color='inherit'
                  startIcon={<FilterAltOffIcon fontSize='small' />}
                  onClick={clearFilters}
                  sx={{ textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
               >
                  Clear filters
               </Button>
            )}
         </Box>

         {!loadingEmployees && filteredEmployees.length === 0 && (
            <Typography color='text.secondary' sx={{ py: 2 }}>
               No employees found.
            </Typography>
         )}

         {filteredEmployees.map(employee => {
            const timesheets = timesheetsByEmployee[employee.user_id];
            const isLoadingTs = !!loadingTimesheets[employee.user_id];
            const isExpanded = expandedEmployee === employee.user_id;
            const filteredTimesheets = timesheets ? applyDateFilter(timesheets) : null;
            const grouped = filteredTimesheets ? groupTimesheetsByMonth(filteredTimesheets) : null;

            return (
               <Accordion
                  key={employee.user_id}
                  expanded={isExpanded}
                  onChange={() => handleAccordionChange(employee.user_id)}
                  disableGutters
                  elevation={0}
                  sx={{
                     border: '1px solid',
                     borderColor: 'divider',
                     borderRadius: '8px !important',
                     '&:before': { display: 'none' },
                     '&.Mui-expanded': { borderColor: 'primary.light' }
                  }}
               >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 56 }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                        <PersonOutlineIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography variant='subtitle1' fontWeight={600} noWrap>
                           {employee.display_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
                           <Chip
                              label={`${employee.trackers_by_month} this month`}
                              size='small'
                              color={employee.trackers_by_month > 0 ? 'primary' : 'default'}
                              variant={employee.trackers_by_month > 0 ? 'outlined' : 'outlined'}
                              sx={{ height: 22, fontSize: '0.72rem' }}
                           />
                           <Chip
                              label={`${employee.trackers_to_date} total`}
                              size='small'
                              variant='outlined'
                              sx={{ height: 22, fontSize: '0.72rem' }}
                           />
                        </Box>
                     </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                     {isLoadingTs && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 1.5 }}>
                           <CircularProgress size={22} />
                           <Typography variant='body2' color='text.secondary'>
                              Loading trackers…
                           </Typography>
                        </Box>
                     )}

                     {!isLoadingTs && filteredTimesheets && filteredTimesheets.length === 0 && (
                        <Box sx={{ px: 2.5, py: 3 }}>
                           <Typography variant='body2' color='text.secondary'>
                              {hasActiveFilters ? 'No trackers match the selected date range.' : 'No time trackers submitted yet.'}
                           </Typography>
                        </Box>
                     )}

                     {!isLoadingTs && grouped && (
                        <Box>
                           {renderMonthSection(grouped.currentLabel, grouped.currentMonth, employee.user_id, true)}
                           {grouped.sortedPastMonths.map(([label, { trackers }]) =>
                              renderMonthSection(label, trackers, employee.user_id, false)
                           )}
                        </Box>
                     )}
                  </AccordionDetails>
               </Accordion>
            );
         })}

         <Snackbar open={!!downloadError} autoHideDuration={6000} onClose={() => setDownloadError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Alert onClose={() => setDownloadError('')} severity='error' sx={{ width: '100%' }}>
               {downloadError}
            </Alert>
         </Snackbar>
      </Stack>
   );
}
