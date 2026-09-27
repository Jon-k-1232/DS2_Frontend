import CustomerPicker from '../../Components/Lookups/CustomerPicker';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,Paper,Stack,Table,TableBody,TableCell,TableHead,TableRow,TextField,Typography} from '@mui/material';
import EntityPicker from '../../Components/BillingEntities/EntityPicker';
import {receiptCall,receiptError} from '../../Services/ApiCalls/ReceiptCalls';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const money=n=>`$${(Number(n || 0)/100).toFixed(2)}`;
const parse=value=>/^\d+(\.\d{1,2})?$/.test(String(value))?Math.round(Number(value)*100):NaN;
export function allocateOldest(obligations,received){let left=Math.max(0,received || 0);return Object.fromEntries(obligations.map(o=>{const amount=Math.min(left,o.openCents);left-=amount;return [o.obligation_id,amount?(amount/100).toFixed(2):''];}));}
export default function ReceivePaymentPage({customerData}){
 const [searchParams]=useSearchParams();
 const [form,setForm]=useState({customerId:searchParams.get('customerId') || '',entityId:searchParams.get('entityId') || null,amount:'',date:today(),method:'check',reference:'',reason:'',duplicateReason:''});
 const [state,setState]=useState(null),[lines,setLines]=useState({}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[confirm,setConfirm]=useState(false);
 const revision=useRef(0),flight=useRef(false),key=useRef(null),latest=useRef(form);latest.current=form;
 const load=useCallback(async()=>{
  const n=++revision.current;setState(null);setLines({});setError('');setLoading(false);
  if(!form.customerId || !form.entityId)return;
  setLoading(true);
  try{const data=await receiptCall(`/open-obligations?customerId=${form.customerId}&entityId=${form.entityId}`);if(n!==revision.current)return;setState(data);setLines(allocateOldest(data.obligations,parse(latest.current.amount)));key.current=null;}
  catch(e){if(n===revision.current)setError(receiptError(e));}finally{if(n===revision.current)setLoading(false);}
 },[form.customerId,form.entityId]);
 const cancelPending=useCallback(()=>{revision.current++;},[]);
 useEffect(()=>{load();return cancelPending;},[load,cancelPending]);
 const change=(field,value)=>{if(['customerId','entityId'].includes(field) && String(form[field] ?? '')===String(value ?? ''))return;key.current=null;setResult(null);setForm(f=>({...f,[field]:value}));if(['customerId','entityId'].includes(field)){revision.current++;setState(null);setLines({});}if(field==='amount' && state)setLines(allocateOldest(state.obligations,parse(value)));};
 const received=parse(form.amount),entries=Object.entries(lines).filter(([,amount])=>amount!==''),applied=entries.reduce((n,[,amount])=>n+(parse(amount) || 0),0),remaining=(received || 0)-applied;
 const suggested=state?allocateOldest(state.obligations,received):{};
 const override=JSON.stringify(suggested)!==JSON.stringify(lines);
 let validation='';
 if(!received || received<1 || received>9999999999)validation='Enter a positive received amount with at most two decimals.';
 else if(entries.some(([,amount])=>!Number.isFinite(parse(amount)) || parse(amount)<=0))validation='Allocation lines must be positive. Clear a line to leave that invoice unpaid.';
 else if(applied>received)validation='Applied total exceeds the received amount.';
 else if(entries.some(([id,amount])=>parse(amount)>(state?.obligations.find(o=>String(o.obligation_id)===id)?.openCents || 0)))validation='An allocation exceeds the invoice remaining amount.';
 else if(!form.date || form.date>today())validation='Choose a payment date that is not in the future.';
 else if(form.method!=='cash' && !form.reference.trim())validation='Enter the check or payment reference.';
 else if(override && !form.reason.trim())validation='Give a reason for changing the oldest-first allocation.';
 const submit=async()=>{
  if(flight.current || validation || !state)return;
  flight.current=true;setBusy(true);setError('');key.current ||= window.crypto.randomUUID();
  try{const response=await receiptCall('/receipts','post',{...form,customerId:Number(form.customerId),ledgerFingerprint:state.ledgerFingerprint,allocations:entries.map(([obligationId,amount])=>({obligationId,amount}))},key.current);setResult(response);setConfirm(false);setState(null);setLines({});setForm(f=>({...f,amount:'',reference:'',reason:'',duplicateReason:''}));key.current=null;await load();}
  catch(e){setError(receiptError(e));setConfirm(false);}finally{flight.current=false;setBusy(false);}
 };
 return <Stack spacing={2} sx={{p:3,maxWidth:1150}}>
  <Stack direction='row' justifyContent='space-between'><Typography variant='h4'>Receive payment</Typography><Button component={Link} to='/payments/receipts'>Receipt history</Button></Stack>
  <Typography>Enter the check once. Apply it to open invoices, oldest first. Any remainder stays as credit for this business and is used at the next billing.</Typography>
  {error && <Alert severity='error'>{error}<Button onClick={load} disabled={busy}>Refresh open invoices</Button></Alert>}
  {result && <Alert severity='success'>Receipt #{result.receipt.receipt_id} saved. Applied ${result.applied}; credit ${result.remainingCredit}. <Link to={`/payments/receipts/${result.receipt.receipt_id}`}>View receipt</Link></Alert>}
  <Stack direction={{xs:'column',md:'row'}} spacing={2}>
   <CustomerPicker native customerData={customerData}   InputLabelProps={{shrink:true}} label='Client' value={form.customerId} onChange={value=>change('customerId',value)} disabled={busy} fullWidth />
   <EntityPicker customerId={form.customerId} value={form.entityId} onChange={v=>change('entityId',v)} disabled={busy}/>
  </Stack>
  <Stack direction={{xs:'column',md:'row'}} spacing={2}>
   <TextField InputLabelProps={{shrink:true}} label='Amount received' value={form.amount} onChange={e=>change('amount',e.target.value)} inputProps={{inputMode:'decimal'}} disabled={busy}/>
   <TextField label='Payment date' type='date' InputLabelProps={{shrink:true}} value={form.date} onChange={e=>change('date',e.target.value)} disabled={busy}/>
   <TextField select SelectProps={{native:true}} InputLabelProps={{shrink:true}} label='Method' value={form.method} onChange={e=>change('method',e.target.value)} disabled={busy}><option value='check'>Check</option><option value='cash'>Cash</option><option value='other'>Other</option></TextField>
   <TextField InputLabelProps={{shrink:true}} sx={{minWidth:240,flex:1}} label={form.method==='cash'?'Cash note (optional)':'Check / payment reference'} value={form.reference} onChange={e=>change('reference',e.target.value)} disabled={busy}/>
  </Stack>
  <Paper variant='outlined' sx={{p:2}}><Stack direction='row' justifyContent='space-between'><Typography variant='h6'>Open invoices</Typography><Button disabled={!state || busy} onClick={()=>{setLines(allocateOldest(state.obligations,received));key.current=null;}}>Apply oldest first</Button></Stack>
   <Typography variant='body2'>An invoice keeps its original date when carried onto a newer statement.</Typography>
   {loading?<Typography>Loading open invoices…</Typography>:state && !state.obligations.length?<Typography>No open invoices. The payment will remain as credit.</Typography>:null}
   <Table><TableHead><TableRow><TableCell>Invoice / original date</TableCell><TableCell>Carried on</TableCell><TableCell align='right'>Remaining</TableCell><TableCell align='right'>Apply</TableCell></TableRow></TableHead><TableBody>{state?.obligations.map(o=><TableRow key={o.obligation_id}><TableCell>{o.invoice_number || `Invoice ${o.original_invoice_id}`}<Typography variant='caption' display='block'>{o.obligation_date?String(o.obligation_date).slice(0,10):'Unknown legacy age'}</Typography></TableCell><TableCell title={o.carrying_invoice_id?`Statement ID: ${o.carrying_invoice_id}`:undefined}>{o.carrying_invoice_id && o.carrying_invoice_id!==o.original_invoice_id?'Later statement':'Original statement'}</TableCell><TableCell align='right'>{money(o.openCents)}</TableCell><TableCell align='right'><TextField label='Apply amount' InputLabelProps={{shrink:true}} value={lines[o.obligation_id] ?? ''} disabled={busy} size='small' inputProps={{inputMode:'decimal','aria-label':`Apply to ${o.invoice_number || o.obligation_id}`}} onChange={e=>{key.current=null;setLines(l=>({...l,[o.obligation_id]:e.target.value}));}}/></TableCell></TableRow>)}</TableBody></Table>
  </Paper>
  <Stack direction='row' spacing={4}><Typography>Received: {money(received)}</Typography><Typography>Applied: {money(applied)}</Typography><Typography color={remaining<0?'error':undefined}>Remaining credit: {money(remaining)}</Typography></Stack>
  <TextField label='Allocation reason' helperText='Required when changing the oldest-first suggestion.' multiline value={form.reason} onChange={e=>change('reason',e.target.value)} disabled={busy}/>
  {error.toLowerCase().includes('duplicate') && <TextField label='Reason to record a similar receipt' value={form.duplicateReason} onChange={e=>change('duplicateReason',e.target.value)} disabled={busy}/>}
  {state && validation && form.amount && <Alert severity='info'>{validation}</Alert>}
  <Button variant='contained' disabled={busy || loading || !state || Boolean(validation)} onClick={()=>setConfirm(true)}>Review payment</Button>
  <Dialog aria-labelledby='receive-payment-confirmation' open={confirm} onClose={()=>{if(!busy)setConfirm(false);}} fullWidth><DialogTitle id='receive-payment-confirmation'>Confirm received payment</DialogTitle><DialogContent><Typography>Received {money(received)} · Applied {money(applied)} · Remaining credit {money(remaining)}</Typography>{state?.obligations.filter(o=>lines[o.obligation_id]).map(o=><Typography key={o.obligation_id}>{o.invoice_number}: {money(o.openCents)} → {money(o.openCents-parse(lines[o.obligation_id]))}</Typography>)}</DialogContent><DialogActions><Button disabled={busy} onClick={()=>setConfirm(false)}>Back</Button><Button variant='contained' disabled={busy} onClick={submit}>{busy?'Saving…':'Record payment'}</Button></DialogActions></Dialog>
 </Stack>;
}
