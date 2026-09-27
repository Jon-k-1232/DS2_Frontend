import ReportHistoryFilter from '../../Components/Workspace/ReportHistoryFilter';
import React, {useContext, useEffect, useState} from 'react';
import {Alert, Box, Button, Chip, Paper, Stack, TextField, Tooltip, Typography} from '@mui/material';
import DataGridTable from '../../Components/DataGrids/PaginationGrid';
import {context} from '../../App';
import EntityPicker from '../../Components/BillingEntities/EntityPicker';
import {fetchBillingPerformance, downloadBillingPerformance} from '../../Services/ApiCalls/AnalyticsCalls';
import useExcludedCustomers from './useExcludedCustomers';
const money = n => n == null ? 'N/A' : Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
const pct = n => n == null ? 'N/A' : `${Number(n).toFixed(2)}%`;
const ReportGrid=({rows,columns,getRowId})=><DataGridTable tableData={{rows,columns,totalCount:rows.length}} getRowId={getRowId} passedHeight='100%' useClientPagination renderExport={()=>null}/>;
const amountColumn=(field,headerName,width=140)=>({field,headerName,width,valueFormatter:p=>money(p.value)});
export default function BillingPerformancePage(){
 const {loggedInUser:{accountID,userID}}=useContext(context);
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Phoenix'});
 const [entityId,setEntityId]=useState(null),[start,setStart]=useState(`${today.slice(0,4)}-01-01`),[end,setEnd]=useState(today),[asOf,setAsOf]=useState(today),[recordedThrough,setRecordedThrough]=useState('');
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[exporting,setExporting]=useState(false);
 const {ready,excludedIds,filter}=useExcludedCustomers();
 useEffect(()=>{let live=true;setData(null);setError('');
  if(!ready)return undefined;
  if(!start || !end || !asOf || start>end){setLoading(false);setError('Choose valid dates with start on or before end.');return undefined;}
  setLoading(true);
  fetchBillingPerformance(accountID,userID,{start,end,asOf,recordedThrough:recordedThrough || undefined,entityId,exclude:excludedIds}).then(res=>{if(live){if(!res.billingPerformance)throw Error(res.message || 'Unable to load billing performance.');setData(res.billingPerformance);}}).catch(e=>{if(live)setError(e.response?.data?.message || e.message);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[accountID,userID,start,end,asOf,recordedThrough,entityId,ready,excludedIds,reload]);
 const download=async format=>{setExporting(true);setError('');try{await downloadBillingPerformance(accountID,userID,{...data.period,exclude:excludedIds,format});}catch(e){setError(e.response?.data?.message || e.message || 'Export failed. Please retry.');}finally{setExporting(false);}};
 const t=data?.totals;
 const cards=t?[
  ['Work entered',money(t.work_entered_value),'work_entered'],['Unbilled WIP',money(t.wip),'wip'],['Net billed',money(t.net_billed),'billed'],['Applied receipts',money(t.collected),'collected'],['Held receipt credit',money(t.held_receipt_credit),'collected'],['Cohort margin',money(t.margin),'margin'],['Billing realization',pct(t.billing_realization_pct),'cohort'],['Collection realization',pct(t.collection_realization_pct),'cohort']
 ]:[];
 return <Stack spacing={2}>
  <Typography variant='h5'>Billing performance</Typography>
  <Typography>Work entered, issued statements, and applied receipts, with the same dates and business selection.</Typography>
  <Stack direction={{xs:'column',md:'row'}} spacing={2}>
   <EntityPicker all allowInactive value={entityId} onChange={setEntityId}/>
   {[[start,setStart,'Start date'],[end,setEnd,'End date'],[asOf,setAsOf,'As of']].map(([value,set,label])=><TextField key={label} type='date' size='small' label={label} value={value} onChange={e=>set(e.target.value)} InputLabelProps={{shrink:true}}/>)}
  </Stack>
  <ReportHistoryFilter value={recordedThrough} onChange={setRecordedThrough}/>
  <Stack direction='row' spacing={1}>{filter}<Button onClick={()=>setReload(n=>n+1)}>Refresh</Button><Button disabled={!data || loading || exporting} onClick={()=>download('csv')}>CSV</Button><Button disabled={!data || loading || exporting} onClick={()=>download('pdf')}>PDF</Button></Stack>
  {error && <Alert severity='error'>{error}</Alert>}
  {loading && <Typography role='status'>Loading billing performance…</Typography>}
  {data && <>
   <Alert severity='info'>Work is attributed to the business it was worked for. Statements and receipts stay with the business that billed them. Legacy tracker attribution never moves a balance.</Alert>
   <Typography variant='caption'>Through {data.period.asOf}; known at {data.period.recordedThrough}. Amounts in USD.</Typography>
   <Stack direction='row' spacing={1} alignItems='center'><Chip label={`Cost basis: ${t.cost_status}`}/><Typography>{t.estimated_cost_count} estimated cost records; {t.unknown_cost_count} unknown cost records.</Typography></Stack>
   {t.unknown_cost_count>0 && <Alert severity='warning'>Some supporting work has unknown labor cost. Margin is unavailable until reliable cost evidence exists.</Alert>}
   {!t.entries && !t.issued_statements && !t.held_work_hours && !t.held_work_value && !(data.events || []).length && !t.gross_cash_received && !t.collected && !t.net_billed && !t.cash_returned && !t.writeoffs && <Alert severity='info'>No activity in this period.</Alert>}
   <Box sx={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:2}}>{cards.map(([label,value,basis])=><Tooltip key={label} title={data.definitions[basis]}><Paper variant='outlined' sx={{p:2}}><Typography variant='body2'>{label}</Typography><Typography variant='h5'>{value}</Typography></Paper></Tooltip>)}</Box>
   <Typography>Gross issued {money(t.gross_billed)} · Prebill concessions {money(t.prebill_concessions)} · Credit memos {money(t.credit_memos)} · Voided charges {money(t.voided_charges)} · Bad-debt write-offs {money(t.writeoffs)}</Typography>
   <Typography>Cash received {money(t.gross_cash_received)} · Reversed {money(t.cash_reversed)} · Returned {money(t.cash_returned)} · Noncash applications {money(t.noncash_applications)} · Held work {money(t.held_work_value)}</Typography>
   <Typography variant='h6'>Business totals</Typography>
   <Box sx={{height:260}}><ReportGrid rows={data.byEntity} getRowId={r=>r.entity_id} columns={[{field:'name',headerName:'Business',minWidth:250,flex:1},amountColumn('work_entered_value','Work entered'),amountColumn('net_billed','Net billed'),amountColumn('collected','Applied receipts'),amountColumn('margin','Cohort margin'),{field:'cost_status',headerName:'Cost basis',width:120}]}/></Box>
   <Typography>Unattributed legacy work: {money(data.unattributed_legacy_work.value)} / {data.unattributed_legacy_work.hours} hours.</Typography>
   <Typography variant='h6'>Issued cohorts</Typography>
   <Typography variant='body2'>{data.definitions.cohort}</Typography>
   <Box sx={{height:320}}><ReportGrid rows={data.cohorts} getRowId={r=>r.invoice_id} columns={[{field:'invoice_number',headerName:'Statement',width:180},{field:'billed_by',headerName:'Billed by',width:230},amountColumn('net_billed','Cohort net billed'),amountColumn('collected','Applied receipts'),amountColumn('standard_value','Standard value'),amountColumn('labor_cost','Labor cost'),{field:'cost_status',headerName:'Cost basis',width:120}]}/></Box>
   <Typography variant='h6'>Worked for and billed by</Typography>
   <Box sx={{height:300}}><ReportGrid rows={data.attribution} getRowId={r=>`${r.invoice_id}/${r.work_id || 'unattributed'}`} columns={[{field:'invoice_number',headerName:'Statement',width:170},{field:'worked_for',headerName:'Worked for',width:230},{field:'billed_by',headerName:'Billed by',width:230},{field:'attribution_basis',headerName:'Attribution basis',width:250},amountColumn('net_billed','Allocated net billed'),{field:'cost_status',headerName:'Cost basis',width:120}]}/></Box>
   <Typography variant='h6'>Work and cost details</Typography>
   <Box sx={{height:320}}><ReportGrid rows={data.work} getRowId={r=>r.work_id} columns={[{field:'customer',headerName:'Client',width:180},{field:'employee',headerName:'Staff (includes inactive)',width:210},{field:'service_date',headerName:'Service date',width:120},{field:'status',headerName:'Work state',width:100},amountColumn('standard_value','Work value'),amountColumn('cost_rate','Captured cost rate'),amountColumn('labor_cost','Labor cost'),{field:'cost_status',headerName:'Cost basis',width:120},{field:'duration_source',headerName:'Hours basis',width:190}]}/></Box>
  </>}
 </Stack>;
}
