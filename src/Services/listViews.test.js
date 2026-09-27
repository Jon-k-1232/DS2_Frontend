import {deriveViews,mergeWorkspace} from './listViews';
const row=id=>({customer_id:id,display_name:`Client ${id}`,is_customer_active:true});
const state=()=>({customersList:{activeCustomerData:{activeCustomers:[row(1),row(2)],remote:false,threshold:1000}}});
test('a first-page save response patches its changed client without discarding unrelated clients',()=>{
 const next=mergeWorkspace(state(),{customersList:{activeCustomerData:{partial:true,activeCustomers:[row(3)],changes:{customers:[row(3)]}}}});
 expect(next.customersList.activeCustomerData.activeCustomers.map(r=>r.customer_id)).toEqual([1,2,3]);
});
test('deactivation and deletion remove only the changed clients and a committed warning preserves state',()=>{
 const before=state();const next=mergeWorkspace(before,{customersList:{activeCustomerData:{partial:true,activeCustomers:[],changes:{customers:[{...row(1),is_customer_active:false}],deletedCustomers:[2]}}}});expect(next.customersList.activeCustomerData.activeCustomers).toEqual([]);
 expect(mergeWorkspace(before,{customersList:undefined}).customersList).toBe(before.customersList);
});
test('a record-scoped directory never replaces shared reference data',()=>{
 const before=state();expect(mergeWorkspace(before,{customersList:{activeCustomerData:{scope:'record',activeCustomers:[row(3)]}}}).customersList).toBe(before.customersList);
});
test('crossing the threshold switches to remote search without keeping a partial directory',()=>{
 const before=state();before.customersList.activeCustomerData.threshold=2;
 const next=mergeWorkspace(before,{customersList:{activeCustomerData:{partial:true,changes:{customers:[row(3)]}}}}).customersList.activeCustomerData;expect(next.remote).toBe(true);expect(next.activeCustomers).toEqual([]);
});
test('derived views use database IDs and do not serialize duplicate rows',()=>{
 const data=deriveViews({activeJobData:{activeJobs:[{customer_job_id:8,parent_job_id:null},{customer_job_id:9,parent_job_id:8}]}});
 expect(data.activeJobData.grid.rows.map(r=>r.id)).toEqual([8,9]);expect(data.activeJobData.treeGrid.rows[0].children[0].customer_job_id).toBe(9);expect(JSON.stringify(data)).not.toMatch(/grid|treeGrid/);
});
test('patching a saved client keeps contacts out of the shared identity directory',()=>{
 const next=mergeWorkspace(state(),{customersList:{activeCustomerData:{partial:true,changes:{customers:[{...row(3),customer_email:'private@example.com',street_address:'Private'}]}}}});
 expect(next.customersList.activeCustomerData.activeCustomers.find(r=>r.customer_id===3)).toEqual(row(3));
});
