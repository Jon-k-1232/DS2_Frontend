// Internal keys still travel with rows for navigation and guarded mutations.
// The ordinary workspace shows business names; audit views retain evidence IDs.
const labels={display_name:'Display name',customer_name:'Client name',business_name:'Client company',billing_entity_name:'Our business',created_by_user_name:'Created by',user_display_name:'Staff member',actor_name:'Recorded by'};
export function presentationColumns(columns=[]){
 const first=['invoice_number','display_name','customer_name','business_name','billing_entity_name','job_description','created_by_user_name','actor_name'];
 const order=field=>first.includes(field)?first.indexOf(field):first.length;
 return columns.filter(c=>!/(?:^id$|_id$)/i.test(c.field)).sort((a,b)=>order(a.field)-order(b.field)).map(c=>{
  const text=c.headerName || c.field.replace(/_/g,' ');
  const headerName=labels[c.field] || (text.charAt(0).toUpperCase()+text.slice(1).toLowerCase()).replace(/\b(ar|wip|pdf|csv|ai)\b/gi,x=>x.toUpperCase());
  return {...c,headerName};
 });
}
