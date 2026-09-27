import ActorName from '../../Components/Workspace/ActorName';
import React,{useContext,useEffect,useRef,useState,useCallback} from 'react';
import {Alert,Button,Stack,TextField,Typography,Checkbox,FormControlLabel,Divider} from '@mui/material';
import {Link} from 'react-router-dom';
import {context} from '../../App';
import EntityPicker from '../../Components/BillingEntities/EntityPicker';
import {isAdjustmentAdmin} from '../../Components/AdminAdjustment';
import {correctionCall,correctionError,correctionPdf} from '../../Services/ApiCalls/CorrectionCalls';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function InvoiceCorrections({invoiceID,onChanged}){
 const {loggedInUser}=useContext(context),admin=isAdjustmentAdmin(loggedInUser.accessLevel);
 const [data,setData]=useState(null),[mode,setMode]=useState(''),[form,setForm]=useState({amount:'',reason:'',date:today(),replacementEntityId:null,allowCreditExcess:false,transferReleasedCredit:false}),[lines,setLines]=useState([{description:'',amount:''}]),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const key=useRef(null),flight=useRef(false),generation=useRef(0);
 const load=useCallback(async()=>{if(!invoiceID)return;const g=++generation.current;try{const r=await correctionCall(`/invoices/${invoiceID}/corrections`);if(g!==generation.current)return;setData(r);setError('');setForm(f=>({...f,replacementEntityId:r.entityId}));key.current=null;setPreview(null);}catch(e){if(g===generation.current)setError(correctionError(e));}},[invoiceID]);
 const invalidate=useCallback(()=>{generation.current+=1;},[]);
 useEffect(()=>{setData(null);setMode('');setError('');load();return invalidate;},[load,invalidate]);
 const change=(field,value)=>{setForm(f=>({...f,[field]:value}));setPreview(null);key.current=null;};
 const validAmount=a=>/^\d+(\.\d{1,2})?$/.test(a) && Number(a)>0 && Number(a)<=99999999.99;
 const excess=Number(form.amount)>Number(data?.openAmount),valid=form.reason.trim() && form.date && (mode==='memo'?validAmount(form.amount) && Number(form.amount)<=Number(data?.remainingCreditMemoAmount) && (!excess || form.allowCreditExcess):form.replacementEntityId && lines.every(l=>l.description.trim() && validAmount(l.amount)));
 const body=()=>({entityId:data.entityId,reason:form.reason,date:form.date,...(mode==='memo'?{amount:form.amount,allowCreditExcess:form.allowCreditExcess,ledgerFingerprint:data.ledgerFingerprint}:{replacementEntityId:form.replacementEntityId,transferReleasedCredit:form.transferReleasedCredit,lines})});
 const act=async(finalize=false)=>{if(flight.current || !valid || !admin)return;flight.current=true;setBusy(true);setError('');try{
  if(!finalize){if(mode==='memo')setPreview({memo:true});else setPreview(await correctionCall(`/invoices/${invoiceID}/void-rebill/preview`,'post',body()));}
  else{key.current ||= window.crypto.randomUUID();const r=await correctionCall(`/invoices/${invoiceID}/${mode==='memo'?'credit-memos':'void-rebill'}`,'post',{...body(),...(mode==='void'?{previewFingerprint:preview.previewFingerprint}:{})},key.current);setMessage(r.message);setMode('');setPreview(null);await load();if(onChanged)onChanged();}
 }catch(e){setError(correctionError(e));}finally{flight.current=false;setBusy(false);}};
 const pdf=async path=>{try{await correctionPdf(path);}catch(e){setError(correctionError(e));}};
 return <Stack spacing={2} aria-label='Invoice corrections'><Divider/><Typography variant='h6'>Invoice corrections</Typography>{error && <Alert severity='error'>{error}<Button disabled={busy} onClick={load}>Refresh correction</Button></Alert>}{message && <Alert severity='success'>{message}</Alert>}
 {!admin && <Alert severity='info'>Only admins may issue credit memos or void and rebill. Correction history remains available.</Alert>}
 {data && <><Typography>Business #{data.entityId} · Original new charges ${data.originalNetCharges} · Open debt ${data.openAmount} · Available to credit ${data.remainingCreditMemoAmount}</Typography>
 {data.void && <Alert severity='warning'>Original — void. {data.void.reason}<Button onClick={()=>pdf(`/invoice-voids/${data.void.void_id}/pdf`)}>Download void document</Button></Alert>}
 {data.rebill && <Stack direction='row' spacing={2}><Button component={Link} to={`/billing/invoices/${data.rebill.original_invoice_id}/work`}>Open original invoice</Button><Button component={Link} to={`/billing/invoices/${data.rebill.replacement_invoice_id}/work`}>Open corrected invoice</Button></Stack>}
 {!data.finalized && <Alert severity='info'>Finalize the invoice before applying a correction.</Alert>}
 {admin && data.finalized && !data.void && <Stack direction='row' spacing={2}><Button disabled={busy} onClick={()=>{setMode('memo');setPreview(null);key.current=null;}}>Credit memo</Button><Button disabled={busy} onClick={()=>{setMode('void');setPreview(null);key.current=null;}}>Void and rebill</Button></Stack>}
 {admin && mode && !data.void && <Stack spacing={2}>
 <Typography variant='h6'>{mode==='memo'?'New credit memo':'Corrected invoice'}</Typography>
 {mode==='memo'?<><TextField label='Credit memo amount' value={form.amount} disabled={busy} onChange={e=>change('amount',e.target.value)}/>{Number(form.amount)>Number(data.remainingCreditMemoAmount) && <Alert severity='error'>Amount exceeds remaining uncredited original charges.</Alert>}{excess && <FormControlLabel control={<Checkbox checked={form.allowCreditExcess} disabled={busy} onChange={e=>change('allowCreditExcess',e.target.checked)}/>} label={`Confirm $${Math.max(0,Number(form.amount)-Number(data.openAmount)).toFixed(2)} becomes client credit`}/>}</>:<>
 <EntityPicker label='Corrected invoice business' disabled={busy} all value={form.replacementEntityId} onChange={v=>change('replacementEntityId',v)}/>
 {lines.map((l,i)=><Stack key={i} direction='row' spacing={1}><TextField label={`Corrected charge ${i+1} description`} value={l.description} disabled={busy} onChange={e=>{setLines(a=>a.map((x,n)=>n===i?{...x,description:e.target.value}:x));setPreview(null);key.current=null;}}/><TextField label={`Corrected charge ${i+1} amount`} value={l.amount} disabled={busy} onChange={e=>{setLines(a=>a.map((x,n)=>n===i?{...x,amount:e.target.value}:x));setPreview(null);key.current=null;}}/>{lines.length>1 && <Button disabled={busy} onClick={()=>{setLines(a=>a.filter((_,n)=>n!==i));setPreview(null);key.current=null;}}>Remove charge {i+1}</Button>}</Stack>)}
 <Button disabled={busy || lines.length>=100} onClick={()=>{setLines(a=>[...a,{description:'',amount:''}]);setPreview(null);key.current=null;}}>Add corrected charge</Button>
 {form.replacementEntityId!==data.entityId && <><Alert severity='info'>Released receipt credit stays in the original business unless you explicitly transfer it below.</Alert><FormControlLabel control={<Checkbox checked={form.transferReleasedCredit} disabled={busy} onChange={e=>change('transferReleasedCredit',e.target.checked)}/>} label='Transfer released receipt credit to the corrected business'/></>}</>}
 <TextField label='Correction date' type='date' value={form.date} InputLabelProps={{shrink:true}} disabled={busy} onChange={e=>change('date',e.target.value)}/><TextField label='Correction reason' required multiline inputProps={{maxLength:2000}} value={form.reason} disabled={busy} onChange={e=>change('reason',e.target.value)}/>
 <Button disabled={!valid || busy} onClick={()=>act()}>Review correction</Button>
 {preview && <Alert severity='warning'>{mode==='memo'?`Credit $${Number(form.amount).toFixed(2)}. This memo is locked immediately.`:`Reverse $${preview.impact.chargesReversed}; corrected charges $${preview.impact.correctedCharges}; new balance $${preview.impact.replacementBalance}; receipt credit applied $${preview.impact.creditApplied}. The original PDF remains available.`}<Button disabled={busy} onClick={()=>act(true)}>Finalize correction</Button></Alert>}
 </Stack>}
 <Typography variant='h6'>Credit memo history</Typography>{data.memos.map(m=><Stack key={m.memo_id} direction='row'><Typography>{m.number} · ${m.amount} · {String(m.effective_date || '').slice(0,10)} · <ActorName id={m.actor_id} name={m.actor_name}/> · {m.reason}{m.reversed?' · Reversed':''}</Typography><Button onClick={()=>pdf(`/credit-memos/${m.memo_id}/pdf`)}>Download {m.number}</Button>{m.reversal_id && <Button onClick={()=>pdf(`/credit-memos/reversals/${m.reversal_id}/pdf`)}>Download reversal of {m.number}</Button>}</Stack>)}
 </>}
 </Stack>;
}
