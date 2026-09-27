import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { recurringCall, recurringError, retryKey } from '../../Services/ApiCalls/RecurringCalls';

export default function RecurringCharges({ plans = [], onChanged, disabled = false }) {
  const [edit, setEdit] = useState(null), [amount, setAmount] = useState(''), [description, setDescription] = useState('');
  const [reason, setReason] = useState(''), [action, setAction] = useState('generate'), [periods, setPeriods] = useState([]), [historical, setHistorical] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), inFlight = useRef(false), key = useRef(null);
  const open = (kind, row) => { key.current = null; setEdit({ kind, row }); setAmount(row.amount || row.snapshot_amount || ''); setDescription(row.description?.replace(/ \(\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}\)$/, '') || row.snapshot_description || ''); setReason(''); setAction('generate'); setPeriods((row.pending || []).slice(0, 12).map(p => p.periodStart)); setHistorical(false); setError(''); };
  const save = async () => {
    if (inFlight.current) return;
    if (!reason.trim()) { setError('A reason is required.'); return; }
    if (edit.kind === 'edit' && (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !description.trim())) { setError('Enter a positive amount with cents and a description.'); return; }
    if (edit.kind === 'catchup' && (!periods.length || periods.length > 12)) { setError('Choose 1 through 12 periods.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    const row = edit.row, body = { reason: reason.trim(), expectedVersion: row.version,
      ...(edit.kind === 'edit' ? { amount, description, entityId: row.billing_entity_id } : {}),
      ...(edit.kind === 'catchup' ? { action, periods, confirmHistorical: historical } : {}) };
    const path = edit.kind === 'catchup' ? `/${row.recurring_customer_id}/catch-up` : `/occurrences/${row.occurrence_id}${edit.kind === 'skip' ? '/skip' : ''}`;
    try { await recurringCall(path, edit.kind === 'edit' ? 'patch' : 'post', body, retryKey(key, body)); setEdit(null); await onChanged(); }
    catch (e) { setError(recurringError(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const rows = plans.flatMap(p => p.occurrences.map(o => ({ ...o, client: p.display_name, business: p.business })));
  return <Stack spacing={2}>
    <Typography variant='h6'>Recurring charges</Typography>
    <Typography variant='body2'>Fees are prepared by period. Edit or skip a charge with a reason before finalizing. Finalized charges are locked.</Typography>
    {plans.filter(p => p.remaining > 0 || p.review_status !== 'ready' || p.blockedReason || p.excludedPeriods?.length).map(p => <Alert key={p.recurring_customer_id} severity={p.catchUpRequired ? 'warning' : 'info'}>
      {p.display_name} — {p.description}: {p.remaining} due period{p.remaining === 1 ? '' : 's'} remaining. {p.blockedReason}
      {!!p.excludedPeriods?.length && ` ${p.excludedPeriods.length} earlier periods excluded at cutover to prevent duplicate billing.`}
      {(p.remaining > 0 || p.excludedPeriods?.length > 0) && <Button disabled={disabled || busy || !p.is_recurring_customer_active || p.review_status !== 'ready'} onClick={() => open('catchup', p)}>Review catch-up</Button>}
    </Alert>)}
    {!rows.length ? <Typography>No recurring charges prepared for this selection.</Typography> : <Box sx={{ overflowX: 'auto' }}><Table size='small' aria-label='Recurring charges ready for billing'><TableHead><TableRow>{['Client / business', 'Period', 'Due', 'Fee', 'Status', 'Actions'].map(x => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>
      {rows.map(o => <TableRow key={o.occurrence_id}><TableCell>{o.client}<br />{o.business}</TableCell><TableCell>{o.period_start.slice(0, 10)} to {o.period_end.slice(0, 10)}</TableCell><TableCell>{o.due_date.slice(0, 10)}</TableCell><TableCell>${Number(o.amount || o.snapshot_amount).toFixed(2)}</TableCell><TableCell>{o.state === 'generated' ? 'Ready' : o.state === 'issued' ? 'Finalized — locked' : 'Skipped'}</TableCell><TableCell>
        {o.state === 'generated' && <><Button disabled={disabled || busy} onClick={() => open('edit', o)} aria-label={`Edit recurring charge ${o.occurrence_id}`}>Edit</Button><Button disabled={disabled || busy} onClick={() => open('skip', o)} aria-label={`Skip recurring charge ${o.occurrence_id}`}>Skip</Button></>}
      </TableCell></TableRow>)}
    </TableBody></Table></Box>}
    <Dialog open={!!edit} onClose={() => !busy && setEdit(null)} maxWidth='sm' fullWidth><DialogTitle>{edit?.kind === 'catchup' ? 'Review recurring catch-up' : edit?.kind === 'skip' ? 'Skip recurring period' : 'Edit recurring charge'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      {error && <Alert severity='error'>{error}</Alert>}
      {edit?.kind === 'edit' && <><TextField label='Charge amount' value={amount} onChange={e => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }} /><TextField label='Charge description' value={description} onChange={e => setDescription(e.target.value)} /></>}
      {edit?.kind === 'skip' && <Alert severity='info'>This period will remain skipped, including when Create Invoice opens again.</Alert>}
      {edit?.kind === 'catchup' && <><Typography>Handle at most 12 periods at a time. Earlier cutover periods may already have been billed manually.</Typography>
        <TextField label='Period action' select SelectProps={{ native: true }} value={action} onChange={e => setAction(e.target.value)}><option value='generate'>Generate fees</option><option value='skip'>Skip periods</option></TextField>
        <Box sx={{ maxHeight: 240, overflow: 'auto' }}>{[...(edit.row.pending || []), ...(edit.row.excludedPeriods || [])].map(p => <FormControlLabel key={p.periodStart} sx={{ display: 'block' }} label={`${p.periodStart} (due ${p.dueDate})`} control={<Checkbox checked={periods.includes(p.periodStart)} onChange={e => setPeriods(prev => e.target.checked ? [...prev, p.periodStart] : prev.filter(v => v !== p.periodStart))} />} />)}</Box>
        <FormControlLabel label='I reviewed earlier periods and confirmed they will not be billed twice' control={<Checkbox checked={historical} onChange={e => setHistorical(e.target.checked)} />} /></>}
      <TextField required multiline label='Reason' value={reason} onChange={e => setReason(e.target.value)} />
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setEdit(null)}>Cancel</Button><Button disabled={busy} onClick={save}>Save recurring change</Button></DialogActions></Dialog>
  </Stack>;
}
