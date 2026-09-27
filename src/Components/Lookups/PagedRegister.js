import {useContext,useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField} from '@mui/material';
import {context} from '../../App';
import config from '../../config';
import EntityPicker from '../BillingEntities/EntityPicker';
import DataGridTable from '../DataGrids/PaginationGrid';
import ServerExportMenu from '../DataGrids/ServerExportMenu';
import {gridFor} from '../../Services/listViews';
export default function PagedRegister({title,path,listKey,dataKey,rowsKey,idField,columns,buttons,route,revision,sortable=false}){
 const {accountID,userID}=useContext(context).loggedInUser;
 const [entityId,setEntityId]=useState(null),[search,setSearch]=useState(''),[page,setPage]=useState({page:0,pageSize:20}),[sort,setSort]=useState([]),[result,setResult]=useState({rows:[],total:0}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  const timer=setTimeout(async()=>{
   try{const {data}=await axios.get(`${config.API_ENDPOINT}${path}/${accountID}/${userID}`,{signal:controller.signal,params:{page:page.page+1,limit:page.pageSize,search,...(entityId?{entityId}:{}),...(sort[0]?{sort:sort[0].field,direction:sort[0].sort}:{})}});
    if(data.status!==200)throw new Error(data.message);
    const block=data[listKey][dataKey];if(!controller.signal.aborted)setResult({rows:block[rowsKey],total:block.pagination.totalItems});
   }catch(e){if(!controller.signal.aborted)setError(e.response?.data?.message||e.message||'Unable to load records.');}finally{if(!controller.signal.aborted)setLoading(false);}
  },search?200:0);
  return()=>{clearTimeout(timer);controller.abort();};
 },[accountID,userID,path,listKey,dataKey,rowsKey,entityId,search,page,sort,revision,retry]);
 const reset=fn=>v=>{fn(v);setPage(p=>({...p,page:0}));};
 const grid=gridFor(result.rows);
 grid.columns=columns.map(field=>grid.columns.find(c=>c.field===field)).filter(Boolean).map(c=>({...c,sortable:sortable && ['customer_job_id','customer_name','job_description','created_at','current_job_total','is_job_complete'].includes(c.field)}));
 return <Stack spacing={2}>{error&&<Alert severity='error' action={<Button onClick={()=>setRetry(n=>n+1)}>Try again</Button>}>{error}</Alert>}
  <DataGridTable title={title} arrayOfButtons={buttons} tableData={{...grid,totalCount:result.total}} getRowId={r=>r[idField]} paginationModel={page} onPaginationModelChange={setPage} sortModel={sort} onSortModelChange={sortable?reset(setSort):undefined} loading={loading} showQuickFilter={false} enableSingleRowClick rowSelectionOnly routeToPass={route} renderExport={()=><ServerExportMenu labels={{exportFiltered:'Export this page',print:'Print this page'}}/>}
   renderToolbarContent={()=><Stack direction='row' spacing={2}><TextField size='small' label={`Search ${title.toLowerCase()}`} value={search} onChange={e=>reset(setSearch)(e.target.value)}/><EntityPicker all value={entityId} onChange={reset(setEntityId)}/><Button onClick={()=>{setSearch('');setEntityId(null);setSort([]);setPage(p=>({...p,page:0}));}}>Clear filters</Button></Stack>}/>
 </Stack>;
}
