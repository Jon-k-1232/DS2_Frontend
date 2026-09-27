import useJobSearch from '../../Components/Lookups/useJobSearch';
import useJobChoices from '../../Components/Lookups/useJobChoices';
import CustomerPicker from '../../Components/Lookups/CustomerPicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, FormControlLabel, Checkbox, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import EntityPicker from '../../Components/BillingEntities/EntityPicker';
import DataGridTable from '../../Components/DataGrids/PaginationGrid';
import { recurringCall, recurringError, retryKey } from '../../Services/ApiCalls/RecurringCalls';
import RecurringCharges from './RecurringCharges';
const blank = { customerId: '', entityId: null, jobId: '', description: '', amount: '', frequency: 'monthly', billDay: '1', startDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix' }).format(new Date()), endDate: '', active: true, reason: '' };
const formFor = p => ({ customerId: p.customer_id, entityId: p.billing_entity_id, jobId: p.job_id || '', description: p.description || '', amount: p.recurring_bill_amount, frequency: p.subscription_frequency.toLowerCase(), billDay: p.bill_on_date, startDate: p.start_date.slice(0, 10), endDate: p.end_date?.slice(0, 10) || '', active: p.is_recurring_customer_active, expectedVersion: p.version, reason: '' });
export default function RecurringPlansPage({ customerData }) {
  const { planId } = useParams(), navigate = useNavigate();
  const [data, setData] = useState({ plans: [] }), [form, setForm] = useState(blank), [error, setError] = useState(''), [message, setMessage] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [entity, setEntity] = useState(null), [filter, setFilter] = useState(''), [status, setStatus] = useState('all'), [client, setClient] = useState(''), [page, setPage] = useState({ page: 0, pageSize: 10 });
  const flight = useRef(false), key = useRef(null), generationKey = useRef(null), editor = !!planId;
  const [jobSearch,setJobSearch]=useJobSearch(form.customerId,form.entityId);
  const jobChoices=useJobChoices(form.customerId,form.entityId,jobSearch,revision,form.jobId);
  const jobs=jobChoices.rows;
  const reload = useCallback(() => { setRevision(n => n + 1); }, []);
  useEffect(() => { let live = true; setLoading(true); setError(''); key.current = null;
    if (planId === 'new') { setForm({ ...blank }); setData({ plans: [] }); setLoading(false); return () => { live = false; }; }
    recurringCall(planId ? `/plans/${planId}` : '/plans').then(result => { if (!live) return; setData(result.plan ? { plans: [result.plan] } : result); if (result.plan) setForm(formFor(result.plan)); }).catch(e => { if (live) setError(recurringError(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [planId, revision]);
  useEffect(() => setPage(p => ({ ...p, page: 0 })), [entity, filter, status, client]);
  const set = (field, value) => setForm(old => ({ ...old, [field]: value, ...(['customerId', 'entityId'].includes(field) ? { jobId: '' } : {}) }));
  const save = async () => {
    if (flight.current) return;
    if (!form.customerId || !form.entityId || (!form.description.trim() && !form.jobId) || !form.reason.trim() || !/^\d+(\.\d{1,2})?$/.test(String(form.amount)) || Number(form.amount) <= 0 || !Number.isInteger(Number(form.billDay)) || Number(form.billDay) < 1 || Number(form.billDay) > 31 || !form.startDate || (form.endDate && form.endDate < form.startDate)) { setError('Choose a client and business, enter a description or job, a positive fee, day 1–31, valid dates and a reason.'); return; }
    flight.current = true; setBusy(true); setError('');
    try { const result = await recurringCall(planId === 'new' ? '/plans' : `/plans/${planId}`, planId === 'new' ? 'post' : 'patch', form, retryKey(key, form)); setMessage(result.message); key.current = null; navigate(`/billing/recurring/${result.plan.recurring_customer_id}`); reload(); }
    catch (e) { setError(recurringError(e)); } finally { flight.current = false; setBusy(false); }
  };
  const generate = async () => {
    if (flight.current) return; flight.current = true; setBusy(true); setError('');
    const body = { ...(entity ? { entityId: entity } : {}), ...(planId && planId !== 'new' ? { planId: Number(planId) } : {}), ...(client ? { customerId: Number(client) } : {}) };
    try { const result = await recurringCall('/prepare', 'post', body, retryKey(generationKey, body)); setMessage(`${result.generated} recurring charges prepared; ${result.remaining} periods remain.`); generationKey.current = null; reload(); } catch (e) { setError(recurringError(e)); } finally { flight.current = false; setBusy(false); }
  };
  const selected = useMemo(() => data.plans.filter(p => (!entity || Number(p.billing_entity_id) === Number(entity)) && (!client || Number(p.customer_id) === Number(client)) && (status === 'all' || p.is_recurring_customer_active === (status === 'active')) && `${p.display_name} ${p.description} ${p.business}`.toLowerCase().includes(filter.toLowerCase())), [data, entity, client, status, filter]);
  const columns = [{ field: 'display_name', headerName: 'Client', flex: 1 }, { field: 'business', headerName: 'Business', flex: 1 }, { field: 'description', headerName: 'Services', flex: 1 }, { field: 'recurring_bill_amount', headerName: 'Fee', width: 100 }, { field: 'subscription_frequency', headerName: 'Frequency', width: 115 }, { field: 'bill_on_date', headerName: 'Bill day', width: 80 }, { field: 'is_recurring_customer_active', headerName: 'Active', type: 'boolean', width: 80 }, { field: 'edit', headerName: 'Plan', width: 90, renderCell: p => <Button component={Link} to={`/billing/recurring/${p.row.recurring_customer_id}`}>Open</Button> }];
  return <Stack spacing={2} sx={{ p: 2, maxWidth: 1400 }}>
    <Typography variant='h5'>{editor ? planId === 'new' ? 'New recurring plan' : 'Recurring plan' : 'Recurring plans'}</Typography>
    <Typography>Prepare recurring fees before billing. Charges use the full agreed fee; month-end dates clamp to the last day.</Typography>
    {error && <Alert severity='error'>{error}</Alert>}{message && <Alert severity='success'>{message}</Alert>}{loading && <LinearProgress />}
    <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{'& .MuiButton-root':{whiteSpace:'nowrap'}}}><Button component={Link} to='/billing/recurring'>All recurring plans</Button>{!editor && <Button component={Link} to='/billing/recurring/new'>New recurring plan</Button>}<Button onClick={reload} disabled={busy}>Reload</Button>{planId !== 'new' && <Button onClick={generate} disabled={busy || loading}>Generate due charges</Button>}</Stack>
    {editor ? (!loading && (planId === 'new' || data.plans.length > 0) && <Stack spacing={2} sx={{ maxWidth: 700 }}>
      <CustomerPicker native customerData={customerData} required   label='Client' value={form.customerId} disabled={busy || planId !== 'new'} InputLabelProps={{ shrink: true }} onChange={value=> set('customerId', value)} />
      <EntityPicker value={form.entityId} customerId={form.customerId} onChange={value => set('entityId', value)} disabled={busy || !!data.plans[0]?.occurrences?.length} />
      <TextField label='Find job' value={jobSearch} onChange={e=>setJobSearch(e.target.value)} helperText={jobChoices.error || 'Search this client’s jobs'} error={!!jobChoices.error}/>
      <TextField select SelectProps={{ native: true }} label='Job (optional)' value={form.jobId} InputLabelProps={{ shrink: true }} onChange={e => set('jobId', e.target.value)}><option value=''>Description-only fee</option>{jobs.filter(j => Number(j.customer_id) === Number(form.customerId) && (!j.billing_entity_id || Number(j.billing_entity_id) === Number(form.entityId)) && !j.is_job_complete).map(j => <option key={j.customer_job_id} value={j.customer_job_id}>{j.job_description || `Job ${j.customer_job_id}`}</option>)}</TextField>
      <TextField label='Services description' value={form.description} onChange={e => set('description', e.target.value)} required={!form.jobId} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label='Recurring fee' value={form.amount} inputProps={{ inputMode: 'decimal' }} onChange={e => set('amount', e.target.value)} required /><TextField label='Frequency' select SelectProps={{ native: true }} value={form.frequency} onChange={e => set('frequency', e.target.value)}>{['monthly', 'quarterly', 'semiannual', 'annual'].map(f => <option key={f} value={f}>{f}</option>)}</TextField><TextField label='Bill-on day' sx={{ minWidth: 130 }} type='number' inputProps={{ min: 1, max: 31 }} value={form.billDay} onChange={e => set('billDay', e.target.value)} /></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label='Start date' type='date' value={form.startDate} InputLabelProps={{ shrink: true }} onChange={e => set('startDate', e.target.value)} /><TextField label='End date (optional)' type='date' value={form.endDate} InputLabelProps={{ shrink: true }} onChange={e => set('endDate', e.target.value)} /></Stack>
      <FormControlLabel label='Active plan' control={<Checkbox checked={form.active} onChange={e => set('active', e.target.checked)} />} />
      <Typography variant='body2'>Deactivating stops new fees. Already prepared charges remain available to edit or skip. Rate changes affect only periods that have not been generated.</Typography>
      <TextField label='Reason for plan change' required multiline value={form.reason} onChange={e => set('reason', e.target.value)} /><Button onClick={save} disabled={busy}>Save plan</Button>
    </Stack>) : <><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label='Find recurring plan' value={filter} onChange={e => setFilter(e.target.value)} /><EntityPicker all value={entity} onChange={setEntity} /><CustomerPicker native customerData={customerData} label='Client filter' InputLabelProps={{shrink:true}}   value={client} onChange={value=> setClient(value)} /><TextField label='Plan status' select SelectProps={{ native: true }} value={status} onChange={e => setStatus(e.target.value)}>{['all', 'active', 'inactive'].map(x => <option key={x} value={x}>{x}</option>)}</TextField><Button onClick={() => { setEntity(null); setFilter(''); setClient(''); setStatus('all'); }}>Clear filters</Button></Stack>
      <DataGridTable tableData={{ rows: selected, columns, totalCount: selected.length }} getRowId={p => p.recurring_customer_id} useClientPagination paginationModel={page} onPaginationModelChange={setPage} passedHeight={420} loading={loading} />
    </>}
    {planId !== 'new' && <RecurringCharges plans={editor ? data.plans : selected} disabled={busy} onChanged={reload} />}
  </Stack>;
}
