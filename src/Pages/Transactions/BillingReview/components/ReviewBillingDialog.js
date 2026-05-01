import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import HoldReasonBadge from './HoldReasonBadge';
import AiSuggestionChip from './AiSuggestionChip';

export default function ReviewBillingDialog({ open, entry, onClose, onApply }) {
   const [edits, setEdits] = useState({});
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState('');

   useEffect(() => {
      if (!entry) {
         setEdits({});
         return;
      }
      setEdits({
         customer_id: entry.suggested_customer_id || '',
         customer_job_id: '',
         general_work_description_id: entry.suggested_general_work_description_id || '',
         transaction_date: entry.date || '',
         logged_for_user_id: entry.matched_user_id || '',
         duration_minutes: entry.duration || 0,
         note: ''
      });
      setError('');
   }, [entry]);

   const handleField = field => e => setEdits(prev => ({ ...prev, [field]: e.target.value }));

   const handleSave = async () => {
      setSubmitting(true);
      setError('');
      try {
         await onApply(entry.timesheet_entry_id, edits);
         onClose();
      } catch (err) {
         setError(err?.message || 'Failed to apply.');
      } finally {
         setSubmitting(false);
      }
   };

   const summary = useMemo(() => {
      if (!entry) return '';
      return `${entry.timesheet_name || ''} · ${entry.date || ''} · ${entry.duration || 0} min`;
   }, [entry]);

   if (!entry) return null;

   return (
      <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
         <DialogTitle>Review held entry</DialogTitle>
         <DialogContent>
            <Stack spacing={2}>
               <Stack direction='row' spacing={1} alignItems='center'>
                  <HoldReasonBadge reason={entry.hold_reason} />
                  <AiSuggestionChip entry={entry} />
               </Stack>
               <Typography variant='caption' color='text.secondary'>{summary}</Typography>
               <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}><strong>Notes:</strong> {entry.notes || '(none)'}</Typography>
               <TextField label='Customer ID' size='small' value={edits.customer_id} onChange={handleField('customer_id')} />
               <TextField label='Customer Job ID' size='small' value={edits.customer_job_id} onChange={handleField('customer_job_id')} />
               <TextField label='General Work Description ID' size='small' value={edits.general_work_description_id} onChange={handleField('general_work_description_id')} />
               <TextField label='Transaction Date (YYYY-MM-DD)' size='small' value={edits.transaction_date} onChange={handleField('transaction_date')} />
               <TextField label='Logged For User ID' size='small' value={edits.logged_for_user_id} onChange={handleField('logged_for_user_id')} />
               <TextField label='Duration (minutes)' size='small' type='number' value={edits.duration_minutes} onChange={handleField('duration_minutes')} />
               <TextField label='Note' size='small' multiline minRows={2} value={edits.note} onChange={handleField('note')} />
               {error && <Alert severity='error'>{error}</Alert>}
            </Stack>
         </DialogContent>
         <DialogActions>
            <Button onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant='contained' onClick={handleSave} disabled={submitting}>{submitting ? 'Saving…' : 'Apply & dismiss hold'}</Button>
         </DialogActions>
      </Dialog>
   );
}
