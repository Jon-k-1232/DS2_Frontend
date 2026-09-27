import {useCallback,useState} from 'react';
// A search belongs to its client/business. Reset synchronously when scope
// changes so no hidden term filters the next client's otherwise blank picker.
export default function useJobSearch(customerId,entityId){
 const scope=`${customerId || ''}:${entityId || ''}`;
 const [entry,setEntry]=useState({scope,text:''});
 if(entry.scope!==scope) setEntry({scope,text:''});
 const setSearch=useCallback(text=>setEntry({scope,text}),[scope]);
 return [entry.scope===scope?entry.text:'',setSearch,scope];
}
