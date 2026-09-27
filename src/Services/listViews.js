// API rows cross the wire once. Legacy grid consumers get a derived view only
// on access, without keeping a second copy in shared workspace state.
const keys=['customer_id','transaction_id','customer_job_id','payment_id','writeoff_id','retainer_id','customer_invoice_id','user_id','job_type_id','customer_job_category_id','general_work_description_id','recurring_customer_id'];
export function gridFor(rows=[]) {
 const fields=Object.keys(rows[0] || {});
 const key=keys.find(k=>rows.length && rows.every(r=>r[k]!=null) && new Set(rows.map(x=>x[k])).size===rows.length);
 return {columns:fields.map(field=>({field,headerName:field.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())})),rows:rows.map((r,i)=>({...r,id:key?r[key]:i}))};
}
const clientFields=['customer_id','account_id','display_name','customer_name','business_name','is_recurring','is_customer_active'];
const clientIdentity=row=>Object.fromEntries(clientFields.filter(k=>k in row).map(k=>[k,row[k]]));
const lists={activeCustomers:null,activeRecurringCustomers:null,activeUsers:null,activeTransactions:null,activeInvoices:['customer_invoice_id','parent_invoice_id'],activeJobs:['customer_job_id','parent_job_id'],activeJobCategories:null,jobTypesData:null,activeWriteOffs:null,activePayments:null,activeRetainers:['retainer_id','parent_retainer_id'],workDescriptions:null,workDescriptionsData:null,activeCustomerJobs:['customer_job_id','parent_job_id']};
export function deriveViews(data) {
 if(!data || typeof data!=='object' || Array.isArray(data))return data;
 Object.values(data).forEach(v=>{if(v && typeof v==='object' && !Array.isArray(v))deriveViews(v);});
 for(const [key,tree] of Object.entries(lists))if(Array.isArray(data[key])){
  if(!data.grid)Object.defineProperty(data,'grid',{configurable:true,get:()=>gridFor(data[key])});
  if(tree && !data.treeGrid)Object.defineProperty(data,'treeGrid',{configurable:true,get:()=>{
   const [id,parent]=tree,rows=data[key],map=new Map(rows.map(r=>[r[id],{...r,children:[]}])),roots=[];
   map.forEach(row=>{const p=map.get(row[parent]);if(p)p.children.push(row);else roots.push(row);});
   return {...gridFor(rows),rows:roots};
  }});
 }
 return data;
}
export function mergeWorkspace(previous, incoming) {
 const next={...previous,...Object.fromEntries(Object.entries(incoming || {}).filter(([,value])=>value!==undefined))};
 const page=incoming?.customersList?.activeCustomerData,old=previous?.customersList?.activeCustomerData;
 if(page?.scope==='record' && old)next.customersList=previous.customersList;
 if(page?.partial && old){
  const changed=page.changes || {};
  if(changed.recurringCustomers){const ids=new Set((changed.customers||[]).map(c=>Number(c.customer_id)));next.recurringCustomersList={activeRecurringCustomersData:{activeRecurringCustomers:[...(previous?.recurringCustomersList?.activeRecurringCustomersData?.activeRecurringCustomers||[]).filter(r=>!ids.has(Number(r.customer_id))),...changed.recurringCustomers]}};}
  const deleted=new Set((changed.deletedCustomers || []).map(Number));
  const rows=new Map((old.activeCustomers||[]).filter(r=>!deleted.has(Number(r.customer_id))).map(r=>[Number(r.customer_id),r]));
  for(const row of changed.customers || []){if(row.is_customer_active===false)rows.delete(Number(row.customer_id));else if(!old.remote)rows.set(Number(row.customer_id),clientIdentity(row));}
  const remote=old.remote || rows.size>old.threshold;
  next.customersList={activeCustomerData:{...old,remote,activeCustomers:remote?[]:[...rows.values()].sort((a,b)=>a.display_name.localeCompare(b.display_name)),revision:(old.revision||0)+1}};
 }
 next.workspaceRevision=(previous?.workspaceRevision||0)+1;
 return deriveViews(next);
}
