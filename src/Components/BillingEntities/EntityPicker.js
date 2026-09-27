import React,{useContext,useEffect,useState} from 'react';
import {TextField,Alert,Box} from '@mui/material';
import {context} from '../../App';
import {entitiesCall,entityError} from '../../Services/ApiCalls/BillingEntitiesCalls';
export const sameEntity=(row,entityId,shared=false)=>!entityId || Number(row.billing_entity_id)===Number(entityId) || (shared && row.billing_entity_id==null);
export const filterEntityGrid=(grid,entityId)=>({...grid,rows:(grid?.rows || []).filter(r=>sameEntity(r,entityId,true)).map(r=>({...r,...(r.children?{children:filterEntityGrid({rows:r.children},entityId).rows}:{})}))});
export default function EntityPicker({value,onChange,all=false,allowInactive=false,disabled=false,customerId,preferredId,label='Billing business'}) {
 const {loggedInUser}=useContext(context);const accountId=loggedInUser?.accountID;
 const [entities,setEntities]=useState([]),[error,setError]=useState('');
 useEffect(()=>{let live=true;setEntities([]);setError('');entitiesCall().then(data=>{if(live)setEntities(data.entities || []);}).catch(e=>{if(live)setError(entityError(e));});return()=>{live=false;};},[accountId]);
 useEffect(()=>{if(all || value || disabled || !entities.length)return;const saved=sessionStorage.getItem(`ds2.business.${accountId}.${customerId || 'account'}`);const selected=entities.find(e=>e.active && Number(e.billing_entity_id)===Number(preferredId || saved)) || entities.find(e=>e.active && e.is_default);if(selected)onChange(selected.billing_entity_id);},[all,value,disabled,entities,accountId,customerId,preferredId,onChange]);
 const change=e=>{const v=e.target.value?Number(e.target.value):null;if(v)sessionStorage.setItem(`ds2.business.${accountId}.${customerId || 'account'}`,String(v));onChange(v);};
 return <Box sx={{minWidth:220}}>{error && <Alert severity='error'>{error}</Alert>}<TextField select SelectProps={{native:true}} fullWidth size='small' label={label} value={value || ''} onChange={change} disabled={disabled || !entities.length} required={!all} InputLabelProps={{shrink:true}} helperText={all?'Balances are kept separately for each business.':disabled?'This record keeps its original business.':'Choose the business receiving this work or payment.'}>
 <option value=''>{all?'All businesses':'Choose a business'}</option>{entities.filter(e=>allowInactive || e.active || Number(e.billing_entity_id)===Number(value)).map(e=><option key={e.billing_entity_id} value={e.billing_entity_id} disabled={!e.active && !allowInactive}>{e.name}{e.active?'':' (inactive)'}</option>)}
 </TextField></Box>;
}
