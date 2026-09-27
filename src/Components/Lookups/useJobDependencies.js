import {useContext,useEffect,useState} from 'react';
import axios from 'axios';
import {context} from '../../App';
import config from '../../config';
import {gridFor} from '../../Services/listViews';
export default function useJobDependencies(kind,id){
 const {accountID,userID}=useContext(context).loggedInUser;
 const [state,setState]=useState({rows:[],total:0,loading:true,error:''});
 useEffect(()=>{if(!id)return;const controller=new AbortController();setState({rows:[],total:0,loading:true,error:''});
 axios.get(`${config.API_ENDPOINT}/jobs/getJobs/${accountID}/${userID}`,{signal:controller.signal,params:{[kind]:id,limit:100}}).then(({data})=>{if(!controller.signal.aborted)setState({rows:data.accountJobsList.activeJobData.activeJobs,total:data.accountJobsList.activeJobData.pagination.totalItems,loading:false,error:''});}).catch(e=>{if(!controller.signal.aborted)setState({rows:[],total:0,loading:false,error:'Unable to load linked jobs. All links will still be checked before deletion.'});});
 return()=>controller.abort();},[accountID,userID,kind,id]);
 return {...state,grid:gridFor(state.rows)};
}
