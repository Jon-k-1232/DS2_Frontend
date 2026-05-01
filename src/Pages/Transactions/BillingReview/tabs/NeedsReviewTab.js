import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { context } from '../../../../App';
import { fetchPendingHeldEntries, applyHeldEntry } from '../../../../Services/ApiCalls/BillingReviewCalls';
import HoldReasonBadge from '../components/HoldReasonBadge';
import AiSuggestionChip from '../components/AiSuggestionChip';
import ReviewBillingDialog from '../components/ReviewBillingDialog';

export default function NeedsReviewTab() {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [rows, setRows] = useState([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [selected, setSelected] = useState(null);
   const [dialogOpen, setDialogOpen] = useState(false);

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
   }, [reload]);

   const onEdit = entry => {
      setSelected(entry);
      setDialogOpen(true);
   };

   const onApply = async (entryID, edits) => {
      await applyHeldEntry(accountID, userID, entryID, edits, token);
      await reload();
   };

   if (loading) {
      return <Stack alignItems='center' sx={{ minHeight: 200, justifyContent: 'center' }}><CircularProgress /></Stack>;
   }

   return (
      <Stack spacing={2}>
         <Typography variant='subtitle2'>{total} held entr{total === 1 ? 'y' : 'ies'} need review</Typography>
         {error && <Alert severity='error'>{error}</Alert>}
         {rows.length === 0 ? (
            <Alert severity='success'>0 rows need attention. AI auto-applied everything from this period.</Alert>
         ) : (
            <Table size='small'>
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
         )}
         <ReviewBillingDialog open={dialogOpen} entry={selected} onClose={() => setDialogOpen(false)} onApply={onApply} />
      </Stack>
   );
}
