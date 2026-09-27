import React,{useContext,useRef,useState} from 'react';
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,Stack,TextField} from '@mui/material';
import {context} from '../../App';
import EntityPicker from './EntityPicker';
import {entitiesCall,entityError} from '../../Services/ApiCalls/BillingEntitiesCalls';
export default function ReclassifyWork({transactionId,onChanged}){
 const {loggedInUser}=useContext(context);const admin=['admin','super admin'].includes((loggedInUser?.accessLevel || '').toLowerCase());
 const [open,setOpen]=useState(false),[row,setRow]=useState(null),[entityId,setEntity]=useState(null),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const gate=useRef(false);
 const show=async()=>{setOpen(true);setRow(null);setError('');try{const data=await entitiesCall(`/work/${transactionId}`);setRow(data.transaction);setEntity(null);setReason('');}catch(e){setError(entityError(e));}};
 const save=async()=>{if(gate.current)return;gate.current=true;setBusy(true);setError('');try{await entitiesCall(`/work/${transactionId}`,'post',{entityId,reason,expectedSourceHash:row.source_hash});setOpen(false);onChanged();}catch(e){setError(entityError(e));}finally{gate.current=false;setBusy(false);}};
 if(!admin)return <Alert severity='info'>Only admins can reassign unissued work to another business.</Alert>;
 return <><Button onClick={show}>Reassign billing business</Button><Dialog open={open} onClose={()=>!busy && setOpen(false)} fullWidth><DialogTitle>Reassign unissued work</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>{error && <Alert severity='error'>{error}</Alert>}<Alert severity='info'>Issued work and funded retainer entries cannot be reassigned here.</Alert><EntityPicker all label='Destination business' value={entityId} onChange={v=>{setEntity(v);}}/><Alert severity='info'>The current job stays attached. If it belongs to the old business, move this entry to a shared job in Edit work first.</Alert><TextField label='Reason for reassignment' required multiline value={reason} onChange={e=>setReason(e.target.value)}/></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy || !row || !entityId || !reason.trim()} onClick={save}>Save assignment</Button></DialogActions></Dialog></>;
}
