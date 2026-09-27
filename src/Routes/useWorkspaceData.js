import {deriveViews,mergeWorkspace} from '../Services/listViews';
import {useCallback,useEffect,useState} from 'react';
import {getInitialAppData,fetchSingleUser} from '../Services/ApiCalls/FetchCalls';

// Reference lists belong to one session. A paginated feature list never writes
// into this hook; mutation responses retain the existing explicit refresh API.
export default function useWorkspaceData(user,setLoggedInUser){
 const {accountID,userID,token,displayName,accessLevel}=user;
 const key=`${accountID}:${userID}:${accessLevel}:${token}`;
 const [state,setState]=useState({}),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!accountID || !userID || !token)return;
  let live=true;
  setState({key,loading:true,data:{}});
  const load=async()=>{
   try{
    const initialData=await getInitialAppData(accountID,userID,token);
    if(initialData?.status!==200)throw new Error(initialData?.message || 'Unable to load reference lists. Try again.');
    if(!live)return;
    if(!displayName){
     const response=await fetchSingleUser(accountID,userID,token);
     if(!live)return;
     const active=response?.activeUserData?.activeUser;
     if(!active)throw new Error('Unable to load your account. Try again.');
     setLoggedInUser({accountID:active.account_id,userID:active.user_id,displayName:active.display_name,role:active.job_title,accessLevel:active.access_level,token});
    }
    setState({key,data:deriveViews(initialData),loading:false});
   }catch(error){if(live)setState({key,data:{},error:error.message,loading:false});}
  };
  load();return()=>{live=false;};
 },[accountID,userID,token,displayName,key,attempt,setLoggedInUser]);
 const setCustomerData=useCallback(update=>setState(previous=>previous.key===key?{...previous,data:mergeWorkspace(previous.data,typeof update==='function'?update(previous.data):update)}:previous),[key]);
 const current=state.key===key?state:{};
 return {customerData:current.data || {},setCustomerData,loading:Boolean(current.loading),error:current.error,retry:()=>setAttempt(n=>n+1)};
}
