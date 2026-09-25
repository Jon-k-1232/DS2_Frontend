import React, {useContext,useEffect,useMemo,useState} from 'react';
import {Alert,Button,Stack,TextField,MenuItem,Typography,Table,TableHead,TableRow,TableCell,TableBody} from '@mui/material';
import {context} from '../../../App';
import {retainerEventsCall} from '../../../Services/ApiCalls/LedgerReviewCalls';
const dollars=n=>`$${Number(n || 0).toFixed(2)}`;
const localDate=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
export default function RetainerEvents({rows=[],onChanged}) {
 const {accountID,userID}=useContext(context).loggedInUser;
 const roots=useMemo(()=>rows.filter(r=>!r.parent_retainer_id),[rows]);
 const [selected,setSelected]=useState(roots[0]?.retainer_id || '');
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[confirm,setConfirm]=useState(false);
 const [form,setForm]=useState({kind:'refund',direction:'decrease',amount:'',date:localDate(),method:'',reference:'',reason:''});
 useEffect(()=>{
  if(!roots.some(r=>String(r.retainer_id)===String(selected))){const next=roots[0]?.retainer_id || '';if(next!==selected)setSelected(next);}
 },[roots,selected]);
 useEffect(()=>{let current=true;setData(null);setConfirm(false);setError('');
  if(selected) retainerEventsCall({accountID,userID,retainerID:selected}).then(r=>{if(!current)return;if(r.status===200)setData(r);else setError(r.message);});
  return()=>{current=false;};
 },[selected,accountID,userID]);
 const change=(key,value)=>{setForm(f=>({...f,[key]:value}));setConfirm(false);setSuccess('');};
 const amountValid=/^\d+(\.\d{1,2})?$/.test(form.amount) && Number(form.amount)>0 && Number(form.amount)<=99999999.99;
 const after=data && amountValid ? Math.round((Number(data.available)+(form.kind==='adjustment' && form.direction==='increase' ? 1:-1)*Number(form.amount))*100)/100 : null;
 const valid=data && amountValid && after>=0 && after<=99999999.99 && form.date && form.reason.trim() && (form.kind!=='refund' || (form.method.trim() && form.reference.trim()));
 const submit=async()=>{if(busy || !valid)return;setBusy(true);setError('');
  const r=await retainerEventsCall({accountID,userID,retainerID:selected,body:{...form,direction:form.kind==='refund'?'decrease':form.direction}});
  if(r.status!==200){setError(r.message);setConfirm(false);}else{
   setSuccess(r.message);setConfirm(false);setForm(f=>({...f,amount:'',reason:'',reference:''}));
   const h=await retainerEventsCall({accountID,userID,retainerID:selected});if(h.status===200)setData(h);else {setData(null);setError(`Event saved. ${h.message}`);}
   if(onChanged)onChanged();
  }setBusy(false);
 };
 if(!roots.length)return <Alert severity='info'>Record a retainer receipt before refunding or adjusting available credit.</Alert>;
 return <Stack spacing={2}>
  <Typography variant='h6'>Refund or adjust a retainer</Typography>
  {error && <Alert severity='error'>{error}</Alert>}{success && <Alert severity='success'>{success}</Alert>}
  <TextField select label='Retainer' value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>{roots.map(r=><MenuItem key={r.retainer_id} value={r.retainer_id}>#{r.retainer_id} {r.display_name || r.type_of_hold}</MenuItem>)}</TextField>
  {data && <>
   <Typography>Available credit: {dollars(data.available)}</Typography>
   {data.lockedInvoice && <Alert severity='info'>Original records are locked to {data.lockedInvoice}. This records new activity on the next statement.</Alert>}
   <TextField select label='Event type' value={form.kind} disabled={busy} onChange={e=>change('kind',e.target.value)}><MenuItem value='refund'>Refund to client</MenuItem><MenuItem value='adjustment'>Adjustment</MenuItem></TextField>
   {form.kind==='adjustment' && <TextField select label='Direction' value={form.direction} disabled={busy} onChange={e=>change('direction',e.target.value)}><MenuItem value='increase'>Increase credit</MenuItem><MenuItem value='decrease'>Decrease credit</MenuItem></TextField>}
   <TextField label='Amount' value={form.amount} disabled={busy} error={!!form.amount && !amountValid} helperText={form.amount && !amountValid ? 'Enter a positive amount with at most two decimal places, up to $99,999,999.99.' : ''} onChange={e=>change('amount',e.target.value)} inputProps={{inputMode:'decimal'}} />
   <TextField label='Date' type='date' value={form.date} disabled={busy} onChange={e=>change('date',e.target.value)} InputLabelProps={{shrink:true}} />
   <TextField label='Method' required={form.kind==='refund'} value={form.method} disabled={busy} inputProps={{maxLength:50}} onChange={e=>change('method',e.target.value)} />
   <TextField label='Reference' required={form.kind==='refund'} value={form.reference} disabled={busy} inputProps={{maxLength:100}} onChange={e=>change('reference',e.target.value)} />
   <TextField label='Reason' required multiline value={form.reason} disabled={busy} inputProps={{maxLength:2000}} onChange={e=>change('reason',e.target.value)} />
   <Typography>{after===null ? 'Enter a valid amount to preview available credit.' : `Available after event: ${dollars(after)}. Invoice debt is unchanged.`}</Typography>
   {after<0 && <Alert severity='error'>The amount exceeds available credit. Funds already applied cannot be removed.</Alert>}
   {!confirm ? <Button disabled={!valid || busy} onClick={()=>setConfirm(true)}>Review event</Button> : <Alert severity='warning'>Confirm {form.kind} of {dollars(form.amount)}. Availability changes from {dollars(data.available)} to {dollars(after)}. Saved events cannot be edited.
    <Button disabled={busy} onClick={submit}>Confirm record event</Button><Button disabled={busy} onClick={()=>setConfirm(false)}>Cancel</Button></Alert>}
   <Typography variant='h6'>Retainer event history</Typography>
   <Table size='small'><TableHead><TableRow>{['Date','Event','Amount','Available before / after','Method / Reference','Reason','Recorded by / at'].map(x=><TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{data.events.map(e=><TableRow key={e.event_id}>
    <TableCell>{String(e.event_date).slice(0,10)}</TableCell><TableCell>{e.kind} {e.direction}</TableCell><TableCell>{dollars(e.amount)}</TableCell><TableCell>{dollars(e.available_before)} / {dollars(e.available_after)}</TableCell><TableCell>{e.method} / {e.reference}</TableCell><TableCell>{e.reason}</TableCell><TableCell>User {e.actor_id} / {new Date(e.created_at).toLocaleString()}</TableCell>
   </TableRow>)}</TableBody></Table>
  </>}
 </Stack>;
}
