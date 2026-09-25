import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { context } from '../../../App';
import { canAccessAuditRecord } from '../../../Routes/AuditRecordProtectedAccess';
import { fetchAuditRecord, fetchPrintedRecords, printAuditRecord, openAuditRecord, verifyAuditRecord } from '../../../Services/ApiCalls/AuditRecordCalls';

const money=v=>Number(v || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
export const auditTime=v=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
const recordLabel=type=>type==='client'?'Client record':'Full evidence record';
export default function CustomerProfileAuditRecord({profileData}) {
   const {loggedInUser}=useContext(context);
   const customerID=profileData?.customerData?.customerData?.customer_id;
   const {accountID,userID}=loggedInUser;
   const allowed=canAccessAuditRecord(loggedInUser);
   const ids=useMemo(()=>({customerID,accountID,userID}),[customerID,accountID,userID]);
   const [recordType,setRecordType]=useState('client');
   const [range,setRange]=useState({startDate:'',endDate:''});
   const [filter,setFilter]=useState({startDate:'',endDate:'',offset:0,limit:25});
   const [data,setData]=useState(null),[printed,setPrinted]=useState({records:[],total:0});
   const [recordOffset,setRecordOffset]=useState(0),[refresh,setRefresh]=useState(0);
   const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[verification,setVerification]=useState('');
   useEffect(()=>{
      let active=true;
      if(!allowed || !customerID)return undefined;
      setLoading(true);setData(null);setPrinted({records:[],total:0});setError('');
      Promise.all([fetchAuditRecord(ids,filter),fetchPrintedRecords(ids,recordOffset)])
         .then(([history,records])=>{if(active){setData(history);setPrinted(records);}})
         .catch(e=>{if(active)setError(e.response?.data?.message || e.message || 'Unable to load Audit Record.');})
         .finally(()=>{if(active)setLoading(false);});
      return ()=>{active=false;};
   },[ids,allowed,customerID,filter,recordOffset,refresh]);
   const action=async fn=>{setBusy(true);setError('');try{await fn();}catch(e){setError(e.response?.data?.message || e.message || 'Unable to complete request.');}finally{setBusy(false);}};
   if(!allowed)return <Alert severity='error'>Audit Record is restricted to admins and super admins.</Alert>;
   const apply=()=>{if(range.startDate && range.endDate && range.startDate>range.endDate){setError('Start date must not be after end date.');return;}setFilter({...range,offset:0,limit:25});};
   const print=()=>action(async()=>{
      const result=await printAuditRecord(ids,{startDate:filter.startDate,endDate:filter.endDate,recordType});
      setRefresh(n=>n+1);await openAuditRecord(ids,result.record.record_id);
   });
   return <Box sx={{pt:2}}><Stack spacing={2}>
      <Typography variant='h6'>Audit Record</Typography>
      <Typography variant='body2'>Account history from saved records. All times America/Phoenix. Drafts remain editable; finalize means sent and locked.</Typography>
      <Stack direction='row' spacing={1} flexWrap='wrap'>
         <TextField size='small' label='From' type='date' value={range.startDate} onChange={e=>setRange({...range,startDate:e.target.value})} InputLabelProps={{shrink:true}} />
         <TextField size='small' label='Through' type='date' value={range.endDate} onChange={e=>setRange({...range,endDate:e.target.value})} InputLabelProps={{shrink:true}} />
         <Button onClick={apply} disabled={busy}>Apply dates</Button>
         <TextField select size='small' label='Print option' value={recordType} onChange={e=>setRecordType(e.target.value)} SelectProps={{native:true}}><option value='client'>Client record</option><option value='full_evidence'>Full evidence record</option></TextField>
         <Button variant='contained' onClick={print} disabled={loading || busy || !data}>Print record</Button>
      </Stack>
      {error && <Alert severity='error'>{error}</Alert>}
      {verification && <Alert severity={verification==='Verified'?'success':'error'}>{verification}</Alert>}
      {loading && <CircularProgress aria-label='Loading audit record' />}
      {data && <>
         <Typography>Opening {money(data.opening_balance)} · Closing {money(data.closing_balance)} · Current {money(data.current.running_balance)} (billed {money(data.current.billed_balance)}, unbilled {money(data.current.unbilled_balance)}) · Retainer available {money(data.current.retainer_available)}</Typography>
         <Typography variant='caption'>{data.methodology}</Typography>
         <Paper variant='outlined' sx={{overflowX:'auto'}}><Table size='small' aria-label='Account history'><TableHead><TableRow>
            {['When / who','Business activity and changes','Debit','Credit','Balance','Retainer'].map((t,i)=><TableCell key={t} align={i>=2?'right':'left'}>{t}</TableCell>)}
         </TableRow></TableHead><TableBody>
            {data.entries.length===0 && <TableRow><TableCell colSpan={6}>No history in this date range.</TableCell></TableRow>}
            {data.entries.map(entry=><TableRow key={entry.id} sx={{verticalAlign:'top'}}>
               <TableCell>{auditTime(entry.occurred_at)}{entry.reconstructed && <Typography variant='caption' display='block'>Reconstructed from existing records, before audit logging began</Typography>}
                  {entry.presentation.actors.map(name=><Typography key={name} variant='body2'>{name}</Typography>)}
               </TableCell>
               <TableCell sx={{maxWidth:650,overflowWrap:'anywhere'}}>
                  <Typography variant='body2'>{entry.presentation.description}</Typography>
                  <details><summary>Changes ({entry.presentation.changes.length})</summary>
                     {(entry.presentation.client_changes || entry.presentation.changes).map(change=><Box key={change.event_id} sx={{my:1}}>
                        <Typography variant='body2'>{change.kind==='statement_archive'?change.text:`${change.operation}: ${change.label}`} · {change.actor}</Typography>
                        {change.fields?.map(field=><Typography key={field.field} variant='body2'>{field.text.replace(' -> ',' → ')}</Typography>)}
                        {change.summaries?.map((summary,i)=><Typography key={i} variant='body2'>{summary}</Typography>)}
                        {change.reason && <Typography variant='body2'>Reason: {change.reason}</Typography>}
                     </Box>)}
                  </details>
               </TableCell>
               <TableCell align='right' sx={{whiteSpace:'nowrap'}}>{entry.presentation.debit}</TableCell>
               <TableCell align='right' sx={{whiteSpace:'nowrap'}}>{entry.presentation.credit}</TableCell>
               <TableCell align='right' sx={{whiteSpace:'nowrap'}}>{entry.presentation.balance}</TableCell>
               <TableCell align='right' sx={{whiteSpace:'nowrap'}}>{entry.presentation.retainer}</TableCell>
            </TableRow>)}
         </TableBody></Table></Paper>
         <Stack direction='row' spacing={1}><Button disabled={!filter.offset || loading} onClick={()=>setFilter({...filter,offset:filter.offset-25})}>Previous history</Button><Typography>{data.total?filter.offset+1:0}–{Math.min(filter.offset+25,data.total)} of {data.total}</Typography><Button disabled={filter.offset+25>=data.total || loading} onClick={()=>setFilter({...filter,offset:filter.offset+25})}>Next history</Button></Stack>
      </>}
      <Typography variant='h6'>Printed records</Typography>
      <Typography variant='body2'>To confirm a document is authentic and unchanged, give the firm its record ID; the firm's system recomputes the SHA-256 digest and checks it against the stored original and the audit chain. The firm can reopen the exact stored document using this ID.</Typography>
      <Paper variant='outlined' sx={{overflowX:'auto'}}><Table size='small' aria-label='Printed audit records'><TableHead><TableRow><TableCell>Record type / generated by / when</TableCell><TableCell>Range / record / SHA-256</TableCell><TableCell>Actions</TableCell></TableRow></TableHead><TableBody>
         {printed.records.length===0 && <TableRow><TableCell colSpan={3}>No printed records.</TableCell></TableRow>}
         {printed.records.map(r=><TableRow key={r.record_id}><TableCell>{recordLabel(r.record_type)}<br />{r.generated_by_name}<br />{auditTime(r.generated_at)}</TableCell><TableCell sx={{overflowWrap:'anywhere',maxWidth:600}}>{r.start_date?.slice(0,10) || 'Beginning'} – {r.end_date?.slice(0,10) || 'Generation time'}<br />{r.record_id}<br />SHA-256: {r.document_sha256}</TableCell><TableCell>
            <Button disabled={busy} onClick={()=>action(()=>openAuditRecord(ids,r.record_id))}>Reopen exact PDF</Button>
            <Button disabled={busy} onClick={()=>action(async()=>{const v=await verifyAuditRecord(ids,r.record_id);setVerification(v.valid?'Verified':'Verification failed');})}>Verify</Button>
         </TableCell></TableRow>)}
      </TableBody></Table></Paper>
      <Stack direction='row'><Button disabled={!recordOffset || loading} onClick={()=>setRecordOffset(n=>n-25)}>Previous records</Button><Button disabled={recordOffset+25>=printed.total || loading} onClick={()=>setRecordOffset(n=>n+25)}>Next records</Button></Stack>
   </Stack></Box>;
}
