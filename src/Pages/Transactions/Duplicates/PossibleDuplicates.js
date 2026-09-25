import React,{useContext,useEffect,useState,useCallback} from 'react';
import {Alert,Button,Stack,TextField,MenuItem,Typography,FormControlLabel,Checkbox,Table,TableBody,TableHead,TableRow,TableCell} from '@mui/material';
import {useNavigate,useLocation} from 'react-router-dom';
import {context} from '../../../App';
import {duplicatesCall} from '../../../Services/ApiCalls/LedgerReviewCalls';
const details=row=>row ? `Amount ${row.total_transaction ?? row.payment_amount ?? row.writeoff_amount ?? row.starting_amount}; date ${String(row.transaction_date || row.payment_date || row.writeoff_date || row.created_at).slice(0,10)}; ${row.payment_reference_number || row.detailed_work_description || row.writeoff_reason || row.display_name || ''}`:'Record no longer present';
export default function PossibleDuplicates(){
 const {accountID,userID}=useContext(context).loggedInUser;const navigate=useNavigate();const location=useLocation();
 const [rows,setRows]=useState([]),[reason,setReason]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[all,setAll]=useState(false),[confirm,setConfirm]=useState(null);
 const [manual,setManual]=useState({kind:'transaction',recordId:'',canonicalId:''});
 const [selected,setSelected]=useState(Number(new URLSearchParams(location.search).get('duplicateId')) || null);
 const load=useCallback(async()=>{const r=await duplicatesCall({accountID,userID,status:all?'all':'open'});if(r.status!==200)setError(r.message);else setRows(r.duplicates);},[accountID,userID,all]);
 useEffect(()=>{load();},[load]);
 const act=async(operation,extra={})=>{if(busy || !reason.trim())return;setBusy(true);setError('');setNotice('');
  const r=await duplicatesCall({accountID,userID,operation,...extra,body:{...extra.body,reason:reason.trim()}});
  if(r.status!==200)setError(r.message);else{setNotice(r.message || 'Duplicate flagged.');setReason('');setConfirm(null);await load();}setBusy(false);
 };
 const current=rows.find(r=>r.duplicate_id===selected);
 return <Stack spacing={2}>
  <Typography variant='h4'>Possible duplicates</Typography>
  <Typography>Review both records before removing an entry. Flags and dismissals leave balances unchanged. Removal recalculates affected work, payments and available retainers.</Typography>
  {error && <Alert severity='error'>{error}</Alert>}{notice && <Alert severity='success'>{notice}</Alert>}
  <TextField label='Reason' required multiline value={reason} inputProps={{maxLength:2000}} disabled={busy} onChange={e=>{setReason(e.target.value);setConfirm(null);}} />
  <Button disabled={busy || !reason.trim()} onClick={()=>act('scan')}>Scan for possible duplicates</Button>
  <FormControlLabel label='Include resolved reviews' control={<Checkbox checked={all} onChange={e=>setAll(e.target.checked)} />} />
  <Typography variant='h6'>Flag an entry for review</Typography>
  <Stack direction='row' spacing={2}>
   <TextField select label='Record kind' value={manual.kind} onChange={e=>setManual({...manual,kind:e.target.value})}>{['transaction','payment','writeoff','retainer'].map(k=><MenuItem key={k} value={k}>{k}</MenuItem>)}</TextField>
   <TextField label='Record ID' value={manual.recordId} onChange={e=>setManual({...manual,recordId:e.target.value})} />
   <TextField label='Original record ID (optional)' value={manual.canonicalId} onChange={e=>setManual({...manual,canonicalId:e.target.value})} />
   <Button disabled={busy || !reason.trim() || !/^[1-9]\d*$/.test(manual.recordId) || (!!manual.canonicalId && !/^[1-9]\d*$/.test(manual.canonicalId))} onClick={()=>act('flag',{body:{...manual,canonicalId:manual.canonicalId || undefined}})}>Flag possible duplicate</Button>
  </Stack>
  <Table size='small'><TableHead><TableRow>{['Review','Customer / Kind','Candidate','Original','Status'].map(t=><TableCell key={t}>{t}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(r=><TableRow key={r.duplicate_id} selected={selected===r.duplicate_id}>
   <TableCell><Button onClick={()=>{setSelected(r.duplicate_id);setConfirm(null);}}>Review #{r.duplicate_id}</Button></TableCell><TableCell>{r.customer_id} / {r.kind}</TableCell><TableCell>#{r.record_id}: {details(r.record)}</TableCell><TableCell>{r.canonical_id ? `#${r.canonical_id}: ${details(r.canonical)}`:'Not specified'}</TableCell><TableCell>{r.status}{r.locked_invoice_number && ` · Sent — locked ${r.locked_invoice_number}`}</TableCell>
  </TableRow>)}</TableBody></Table>
  {!rows.length && <Typography>No possible duplicates in this view.</Typography>}
  {current && <Stack spacing={1}>
   <Typography variant='h6'>Review #{current.duplicate_id}: {current.reason}</Typography>
   {current.locked_invoice_number && <Alert severity='info'>Sent records cannot be removed. Open the invoice exception workflow to review available corrections. Bounced-check exceptions permit payment reversal only.
    <Button onClick={()=>navigate('/invoices/invoices/invoiceDetail/invoicePayments',{state:{rowData:{customer_invoice_id:current.locked_invoice_id}}})}>Open invoice history</Button>
   </Alert>}
   {current.status==='open' && <Stack direction='row'>
    <Button disabled={busy || !reason.trim()} onClick={()=>act('resolve',{duplicateID:current.duplicate_id,body:{action:'dismiss'}})}>Not a duplicate</Button>
    <Button disabled={busy || !reason.trim() || !!current.locked_invoice_number || !current.record} onClick={()=>setConfirm(current.duplicate_id)}>Remove duplicate</Button>
   </Stack>}
   {confirm===current.duplicate_id && <Alert severity='warning'>Remove {current.kind} #{current.record_id}? This reverses its effect on the ledger and preserves this review history.
    <Button disabled={busy} onClick={()=>act('resolve',{duplicateID:current.duplicate_id,body:{action:'remove'}})}>Confirm removal</Button><Button onClick={()=>setConfirm(null)}>Cancel</Button>
   </Alert>}
   <Typography variant='h6'>Review history</Typography>
   {(current.history || []).map(e=><Typography key={e.history_id}>{new Date(e.created_at).toLocaleString()} · User {e.actor_id} · {e.action} · {e.reason}</Typography>)}
  </Stack>}
 </Stack>;
}
