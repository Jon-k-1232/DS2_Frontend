import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Alert,Button,Pagination,Stack,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Typography} from '@mui/material';
import EntityPicker from '../../Components/BillingEntities/EntityPicker';
import {receiptCall,receiptError} from '../../Services/ApiCalls/ReceiptCalls';
export default function ReceiptsPage({customerId=null,billingEntityId=null}){
 const [data,setData]=useState({receipts:[],totalCount:0}),[page,setPage]=useState(1),[entityId,setEntityId]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const scopeEntity=customerId?billingEntityId:entityId;
 useEffect(()=>{let live=true;setLoading(true);setError('');receiptCall(`/receipts?page=${page}&limit=25${scopeEntity?`&entityId=${scopeEntity}`:''}${customerId?`&customerId=${customerId}`:''}`).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(receiptError(e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[page,scopeEntity,customerId,retry]);
 return <Stack spacing={2} sx={{p:3}}>
  <Typography variant='h4'>Payment receipts</Typography>
  <Stack direction='row' useFlexGap flexWrap='wrap' gap={1}><Button component={Link} to={`/payments/receive${customerId?'?customerId='+customerId+(scopeEntity?'&entityId='+scopeEntity:''):''}`} variant='contained'>Receive payment</Button><Button component={Link} to='/payments/receipts/legacy'>Legacy payments & applications</Button></Stack>
  {!customerId && <EntityPicker all value={entityId} onChange={v=>{setEntityId(v);setPage(1);}}/>}
  {error?<Alert severity='error'>{error}<Button onClick={()=>setRetry(n=>n+1)}>Try again</Button></Alert>:loading?<Typography role='status'>Loading receipts…</Typography>:<>
   {!data.receipts.length && <Alert severity='info'>No receipts match this business. Receive a payment to record one.</Alert>}
   <TableContainer><Table aria-label='Payment receipts'><TableHead><TableRow><TableCell>Receipt</TableCell><TableCell>Client</TableCell><TableCell>Business</TableCell><TableCell>Date / reference</TableCell><TableCell align='right'>Received</TableCell></TableRow></TableHead><TableBody>{data.receipts.map(r=><TableRow key={r.receipt_id}><TableCell><Link to={`/payments/receipts/${r.receipt_id}`}>Receipt #{r.receipt_id}</Link></TableCell><TableCell><Link to={`/clients/${r.customer_id}/receipts`}>{r.display_name}</Link></TableCell><TableCell>{r.billing_entity_name}</TableCell><TableCell>{String(r.receipt_date).slice(0,10)} · {r.reference || r.method}</TableCell><TableCell align='right'>${Number(r.amount).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
   <Pagination aria-label='Receipt pages' page={page} count={Math.max(1,Math.ceil(data.totalCount/25))} onChange={(_,v)=>setPage(v)}/>
  </>}
 </Stack>;
}
