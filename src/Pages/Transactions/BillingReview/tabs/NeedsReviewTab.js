import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { context } from '../../../../App';
import { fetchPendingHeldEntries, applyHeldEntry, fetchReprocessCount, triggerReprocess } from '../../../../Services/ApiCalls/BillingReviewCalls';
import HoldReasonBadge from '../components/HoldReasonBadge';
import AiSuggestionChip from '../components/AiSuggestionChip';
import ReviewBillingDialog from '../components/ReviewBillingDialog';

const REPROCESS_MODES = [
   { value: 'unprocessed', label: 'Unprocessed (legacy + never-attempted)' },
   { value: 'errored', label: 'Bedrock errors only' },
   { value: 'all_held', label: 'Every held row (use sparingly)' }
];

export default function NeedsReviewTab() {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [rows, setRows] = useState([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [selected, setSelected] = useState(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const [reprocessMode, setReprocessMode] = useState('unprocessed');
   const [reprocessCount, setReprocessCount] = useState(0);
   const [reprocessEligible, setReprocessEligible] = useState(false);
   const [reprocessing, setReprocessing] = useState(false);
   const [reprocessNotice, setReprocessNotice] = useState('');
   const reprocessPollRef = useRef(null);

   const refreshReprocessCount = useCallback(async () => {
      const r = await fetchReprocessCount(accountID, userID, token, { mode: reprocessMode });
      setReprocessCount(Number(r?.count || 0));
      setReprocessEligible(Boolean(r?.eligible));
   }, [accountID, userID, token, reprocessMode]);

   const reload = useCallback(async () => {
      setLoading(true);
      setError('');
      const res = await fetchPendingHeldEntries(accountID, userID, token);
      if (res?.error) setError(res.error);
      setRows(res?.entries || []);
      setTotal(Number(res?.total || 0));
      setLoading(false);
   }, [accountID, userID, token]);

   useEffect(() => {
      reload();
      refreshReprocessCount();
      return () => {
         if (reprocessPollRef.current) clearInterval(reprocessPollRef.current);
      };
   }, [reload, refreshReprocessCount]);

   const onEdit = entry => {
      setSelected(entry);
      setDialogOpen(true);
   };

   const onApply = async (entryID, edits) => {
      await applyHeldEntry(accountID, userID, entryID, edits, token);
      await reload();
      await refreshReprocessCount();
   };

   const onReprocess = async () => {
      setReprocessing(true);
      setReprocessNotice('');
      try {
         const result = await triggerReprocess(accountID, userID, token, { mode: reprocessMode });
         setReprocessNotice(`Queued ${result.queued} entries. Refreshing as the orchestrator works through them…`);
         // Poll the list every 4s for up to 60s; orchestrator runs background.
         let elapsed = 0;
         if (reprocessPollRef.current) clearInterval(reprocessPollRef.current);
         reprocessPollRef.current = setInterval(async () => {
            elapsed += 4;
            await reload();
            await refreshReprocessCount();
            if (elapsed >= 60) {
               clearInterval(reprocessPollRef.current);
               reprocessPollRef.current = null;
               setReprocessing(false);
               setReprocessNotice(prev => prev + ' (auto-refresh stopped — click again if more remain).');
            }
         }, 4000);
      } catch (err) {
         setReprocessNotice(`Failed: ${err.message}${err.code ? ` (${err.code})` : ''}`);
         setReprocessing(false);
      }
   };

   if (loading) {
      return <Stack alignItems='center' sx={{ minHeight: 200, justifyContent: 'center' }}><CircularProgress /></Stack>;
   }

   return (
      <Stack spacing={2}>
         <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
            <Typography variant='subtitle2'>{total} held entr{total === 1 ? 'y' : 'ies'} need review</Typography>
            <Stack direction='row' spacing={1} alignItems='center'>
               <Select size='small' value={reprocessMode} onChange={e => setReprocessMode(e.target.value)} sx={{ minWidth: 280 }}>
                  {REPROCESS_MODES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
               </Select>
               <Button
                  variant='contained'
                  color='primary'
                  size='small'
                  disabled={reprocessing || !reprocessEligible || reprocessCount === 0}
                  onClick={onReprocess}
                  title={!reprocessEligible ? 'TIME_TRACKER_AI_FEATURE_FLAG must be on for this account' : ''}
               >
                  {reprocessing ? 'Processing…' : `Run AI on ${reprocessCount} pending`}
               </Button>
            </Stack>
         </Stack>
         {!reprocessEligible && (
            <Alert severity='info'>
               The AI pipeline isn't enabled for this account yet. Set <code>TIME_TRACKER_AI_FEATURE_FLAG=test</code> and add this account to <code>TIME_TRACKER_AI_TEST_ACCOUNT_IDS</code> to enable the reprocess button.
            </Alert>
         )}
         {reprocessNotice && <Alert severity='info'>{reprocessNotice}</Alert>}
         {error && <Alert severity='error'>{error}</Alert>}
         {rows.length === 0 ? (
            <Alert severity='success'>0 rows need attention. AI auto-applied everything from this period.</Alert>
         ) : (
            <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
               <Table size='small' stickyHeader>
                  <TableHead>
                     <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Entity</TableCell>
                        <TableCell>Employee</TableCell>
                        <TableCell>Hold reason</TableCell>
                        <TableCell>AI suggestion</TableCell>
                        <TableCell>Notes preview</TableCell>
                        <TableCell></TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map(r => (
                        <TableRow key={r.timesheet_entry_id} hover>
                           <TableCell>{r.date}</TableCell>
                           <TableCell>{r.entity || r.suggested_customer_display || '—'}</TableCell>
                           <TableCell>{r.employee_name || '—'}</TableCell>
                           <TableCell><HoldReasonBadge reason={r.hold_reason} /></TableCell>
                           <TableCell><AiSuggestionChip entry={r} /></TableCell>
                           <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>{r.notes}</TableCell>
                           <TableCell>
                              <Button size='small' onClick={() => onEdit(r)}>Edit</Button>
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </Box>
         )}
         <ReviewBillingDialog open={dialogOpen} entry={selected} onClose={() => setDialogOpen(false)} onApply={onApply} />
      </Stack>
   );
}
