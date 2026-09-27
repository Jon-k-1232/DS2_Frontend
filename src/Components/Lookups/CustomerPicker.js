import {useContext,useEffect,useState} from 'react';
import {Autocomplete,TextField,MenuItem} from '@mui/material';
import axios from 'axios';
import config from '../../config';
import {context} from '../../App';
const EMPTY=[];
export function useCustomerChoices(customerData,search='',selectedId){
 const {accountID,userID}=useContext(context).loggedInUser;
 const directory=customerData?.customersList?.activeCustomerData;
 const local=directory?.activeCustomers || EMPTY,remote=!!directory?.remote;
 const [state,setState]=useState({rows:[],key:'',error:'',loading:false});
 const key=`${accountID}:${userID}:${search}:${selectedId}:${remote}`;
 useEffect(()=>{
  if(!remote)return;
  const controller=new AbortController();setState({key,rows:[],loading:true,error:''});
  const timer=setTimeout(async()=>{
   try{const {data}=await axios.get(`${config.API_ENDPOINT}/customer/lookup/${accountID}/${userID}`,{signal:controller.signal,params:{search,limit:50}});
    let rows=data.customers;
    if(selectedId && !rows.some(c=>Number(c.customer_id)===Number(selectedId))){const {data:chosen}=await axios.get(`${config.API_ENDPOINT}/customer/lookup/${accountID}/${userID}`,{signal:controller.signal,params:{customerId:selectedId}});rows=[...chosen.customers,...rows];}
    if(!controller.signal.aborted)setState({key,rows,loading:false,error:''});
   }catch(e){if(!controller.signal.aborted)setState({key,rows:[],loading:false,error:e.response?.data?.message||e.message||'Unable to find clients. Retry the search.'});}
  },search?200:0);
  return()=>{clearTimeout(timer);controller.abort();};
 },[accountID,userID,remote,search,selectedId,key]);
 return {remote,rows:remote?(state.key===key?state.rows:EMPTY):local,error:remote&&state.key===key?state.error:'',loading:remote&&(state.key!==key||state.loading)};
}
export default function CustomerPicker({customerData,value,onChange,label='Client',native=false,menu=false,disabled=false,required=false,placeholder='Choose client',...props}){
 const [search,setSearch]=useState('');
 const choices=useCustomerChoices(customerData,search,typeof value==='object'?value?.customer_id:value);
 const selected=typeof value==='object'?value:choices.rows.find(c=>Number(c.customer_id)===Number(value))||null;
 if(!customerData?.customersList?.activeCustomerData)return <TextField {...props} disabled label={label} value='' helperText='Loading clients…'/>;
 if((native||menu) && !choices.remote)return <TextField {...props} required={required} disabled={disabled} select SelectProps={{native}} InputLabelProps={{shrink:true}} label={label} value={value||''} onChange={e=>onChange(e.target.value)}>{native?<option value=''>{placeholder}</option>:<MenuItem value=''>{placeholder}</MenuItem>}{choices.rows.map(c=>native?<option key={c.customer_id} value={c.customer_id}>{c.display_name}</option>:<MenuItem key={c.customer_id} value={c.customer_id}>{c.display_name}</MenuItem>)}</TextField>;
 return <Autocomplete {...props} disabled={disabled} options={choices.rows} value={selected} loading={choices.loading} filterOptions={choices.remote?x=>x:undefined} getOptionLabel={c=>c.display_name||''} isOptionEqualToValue={(a,b)=>Number(a.customer_id)===Number(b.customer_id)} onInputChange={(_,v,reason)=>{if(reason==='input'||reason==='clear')setSearch(v);}} onChange={(_,v)=>onChange((native||menu)?(v?.customer_id||''):v)} noOptionsText={choices.error||'No matching clients'} renderInput={p=><TextField {...p} required={required} label={label} error={!!choices.error} helperText={choices.error|| (choices.remote?'Type to find a client':'')}/>}/>;
}
