import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { context } from '../../../App';
import { invoiceExceptionCall } from '../../../Services/ApiCalls/InvoiceExceptionCalls';
import { fetchFileDownload } from '../../../Services/ApiCalls/FetchCalls';
export default function InvoiceHistory({ invoiceID, onBalanceChange }) {
   const { accountID, userID } = useContext(context).loggedInUser;
   const [history, setHistory] = useState(null);
   const [reason, setReason] = useState('');
   const [condition, setCondition] = useState('bounced_check');
   const [selected, setSelected] = useState([]);
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState('');
   const [open, setOpen] = useState(false);
   const load = useCallback(async () => {
      const result = await invoiceExceptionCall({ accountID, userID, invoiceID });
      if (result.status !== 200) { setError(result.message); return; }
      setHistory(result);
      if (onBalanceChange) onBalanceChange(result.current_remaining_balance);
   }, [accountID, userID, invoiceID, onBalanceChange]);
   useEffect(() => { if (invoiceID) load(); }, [invoiceID, load]);
   const active = history?.exceptions?.find(e => ['flagged', 'reversed'].includes(e.state));
   const act = async (operation, body) => {
      setBusy(true); setError('');
      try {
         const result = await invoiceExceptionCall({ accountID, userID, invoiceID, exceptionID: active?.exception_id, operation, body });
         if (result.status !== 200) { setError(result.message); return; }
         setOpen(false); setSelected([]); setReason('');
         await load();
      } finally { setBusy(false); }
   };
   const download = async r => {
      setBusy(true); setError('');
      try {
         const result = await fetchFileDownload(r.artifact_key, `invoice_revision_${r.revision}.zip`, accountID, userID);
         if (result?.status !== 200) setError(result?.message || 'Download failed.');
      } catch (e) { setError('Download failed. Please try again.'); }
      finally { setBusy(false); }
   };
   if (!invoiceID) return null;
   return <Box sx={{ my: 2 }} aria-label='Invoice history'>
      {error && <Alert severity='error'>{error}</Alert>}
      {history?.sent_locked && <Alert severity='info'>Sent — locked · {history.locked_invoice_number}. Original records and PDFs are preserved.</Alert>}
      {history?.sent_locked && !active && <Button disabled={busy} onClick={() => setOpen(!open)}>Flag exception</Button>}
      {open && <Stack spacing={1} sx={{ my: 2 }}>
         <TextField select label='Condition' value={condition} onChange={e => setCondition(e.target.value)}>
            {history.conditions.map(c => <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>)}
         </TextField>
         <TextField label='Reason' multiline value={reason} inputProps={{ maxLength: 2000 }} onChange={e => setReason(e.target.value)} />
         <Typography>Select the affected payments:</Typography>
         {history.statementPayments.filter(p => p.eligible_for_exception).map(p => <FormControlLabel key={p.payment_id}
            control={<Checkbox checked={selected.includes(p.payment_id)} onChange={e => setSelected(e.target.checked ? [...selected, p.payment_id] : selected.filter(id => id !== p.payment_id))} />}
            label={`Payment #${p.payment_id}: $${Math.abs(Number(p.payment_amount)).toFixed(2)} ${p.payment_reference_number || ''}`} />)}
         {!history.statementPayments.some(p => p.eligible_for_exception) && <Typography>No eligible receipts on this statement.</Typography>}
         <Button disabled={busy || !reason.trim() || !selected.length} onClick={() => act('flag', { condition, reason, paymentIds: selected })}>Record exception</Button>
      </Stack>}
      {active && <Stack spacing={1} sx={{ my: 2 }}>
         <Alert severity='warning'>Exception #{active.exception_id}: {active.state}. {active.reason}</Alert>
         <Typography>{active.payments.map(p => `Payment #${p.payment_id} ($${Number(p.amount).toFixed(2)})`).join(', ')}</Typography>
         {active.state === 'flagged' ? <Stack direction='row' spacing={2}>
            <Button disabled={busy} onClick={() => act('reverse')}>Reverse selected payments</Button>
            <Button disabled={busy} onClick={() => act('resolve', { action: 'cancel' })}>Cancel flag</Button>
         </Stack> : <Stack direction='row' spacing={2}>
            <Button disabled={busy} onClick={() => act('resolve', { action: 'revision' })}>Issue revision for reprint / resend</Button>
            <Button disabled={busy} onClick={() => act('resolve', { action: 'roll_forward' })}>Roll into next invoice</Button>
         </Stack>}
      </Stack>}
      {!!history?.revisions?.length && <Typography variant='h6'>Archived versions</Typography>}
      {history?.revisions?.some(r => r.revision > 0) && <Typography variant='body2'>Each revision includes its correction and the unchanged original invoice. Reprint or resend both together.</Typography>}
      {history?.revisions?.map(r => <Button key={r.revision} disabled={busy || !r.artifact_key} onClick={() => download(r)}>
         {r.revision === 0 ? 'Reprint original' : `Reprint revision ${r.revision}`} (${Number(r.issued_amount).toFixed(2)})
      </Button>)}
      {!!history?.events?.length && <Typography variant='h6'>History</Typography>}
      {history?.events?.map(e => <Typography key={e.history_id} variant='body2' sx={{ my: 1 }}>
         {new Date(e.created_at).toLocaleString()} · User #{e.actor_id} · {e.event.replaceAll('_', ' ')}
         {e.detail.reason ? ` · ${e.detail.reason}` : ''}
         {e.detail.payment_ids ? ` · Payments ${e.detail.payment_ids.join(', ')}` : ''}
         {e.detail.reversal_ids?.length ? ` · Reversals ${e.detail.reversal_ids.join(', ')}` : ''}
         {e.detail.retainer_cancellations?.length ? ` · Cancelled credits: ${e.detail.retainer_cancellations.map(c => `retainer #${c.retainer_id} $${Number(c.amount).toFixed(2)}`).join(', ')}` : ''}
         {e.detail.after_balance != null ? ` · Balance $${Number(e.detail.after_balance).toFixed(2)}` : ''}
      </Typography>)}
   </Box>;
}
