import { canonicalPath, validId } from './routePaths';
import { buildSidebarRoutes, canOpenPage } from './SidebarRoutes';

test.each([
 ['/customers/customersList','/clients'],
 ['/customers/customersList/customerProfile/17/customerInvoices','/clients/17/statements'],
 ['/customers/customersList/customerProfile/17/customerTransactions','/clients/17/work'],
 ['/customers/customersList/customerProfile/17/customerPayments','/clients/17/receipts'],
 ['/customers/customersList/customerProfile/17/retainersAndPrePayments','/clients/17/credits'],
 ['/customers/customersList/customerProfile/17/editCustomerProfile','/clients/17/edit'],
 ['/customers/customersList/customerProfile/17/aiAudit','/clients/17/aiAudit'],
 ['/customers/customersList/customerProfile/17/auditRecord','/clients/17/auditRecord'],
 ['/transactions/customerTransactions','/work/entries'],
 ['/transactions/customerPayments','/payments/receipts'],
 ['/transactions/customerRetainers','/payments/retainers'],
 ['/transactions/customerWriteOffs','/receivables/write-offs'],
 ['/transactions/possibleDuplicates','/work/duplicates'],
 ['/transactions/pendingPayments','/payments/imports'],
 ['/transactions/employeeTimeTrackerTransactions','/time-tracking/trackingAdministration'],
 ['/invoices/createInvoice','/billing/create'],
 ['/invoices/invoices','/billing/invoices'],
 ['/invoices/quotes','/billing/quotes'],
 ['/invoices/accountsReceivable','/receivables/aging'],
 ['/invoices/accountAudit','/reports/account-audit'],
 ['/analytics/billingPerformance','/reports/billing-performance'],
 ['/analytics/clientRates','/reports/client-rates'],
 ['/analytics/timeAllocation','/reports/time-allocation'],
 ['/analytics/wipAging','/reports/wip-aging'],
 ['/analytics/jobBudgets','/reports/job-budgets'],
 ['/analytics/taxSeasonCapacity','/reports/tax-capacity'],
 ['/jobs/jobsList','/work/jobs'],
 ['/jobs/jobTypesList','/settings/job-types'],
 ['/jobs/jobCategoriesList','/settings/job-categories'],
 ['/jobs/workDescriptionsList','/settings/work-descriptions'],
 ['/account/accountUsers','/settings/users'],
 ['/account/accountSettings','/settings/account'],
 ['/account/automations','/settings/automations'],
 ['/time-tracking/billingReview','/work/review'],
 ['/time-tracking/update-template','/settings/tracker-template'],
 ['/time-tracking/settings','/settings/tracker'],
 ['/customers/recurringCustomers','/billing/recurring'],
])('bookmark %s preserves search and fragment', (old,target)=>{
 expect(canonicalPath(old+'?customerId=17&tab=needsReview#evidence')).toBe(target+'?customerId=17&tab=needsReview#evidence');
});
test.each([
 ['/transactions/customerTransactions/editTransaction',{transaction_id:7,customer_id:3},'/work/entries/3/7/edit'],
 ['/transactions/customerPayments/reversePayment',{payment_id:7},'/payments/receipts/legacy/7/reverse'],
 ['/transactions/customerRetainers/deleteRetainer',{retainer_id:7},'/payments/retainers/7/delete'],
 ['/transactions/customerWriteOffs/deleteWriteOff',{writeoff_id:7},'/receivables/write-offs/7/delete'],
 ['/jobs/jobsList/editJob',{customer_job_id:7},'/work/jobs/7/edit'],
 ['/jobs/jobTypesList/editJobType',{job_type_id:7},'/settings/job-types/7/edit'],
 ['/jobs/jobCategoriesList/deleteJobCategory',{customer_job_category_id:7},'/settings/job-categories/7/delete'],
 ['/jobs/workDescriptionsList/deleteWorkDescription',{general_work_description_id:7},'/settings/work-descriptions/7/delete'],
 ['/account/accountUsers/editUser',{user_id:7},'/settings/users/7/edit'],
 ['/invoices/invoices/invoiceDetail/invoicePayments',{customer_invoice_id:7,parent_invoice_id:5},'/billing/invoices/5/payments'],
])('selected record %s becomes a refreshable URL', (old,rowData,target)=>expect(canonicalPath(old,{rowData})).toBe(target));
test('invoice query IDs survive old emailed URLs; absent IDs do not guess',()=>{
 expect(canonicalPath('/invoices/invoices/invoiceDetail/invoiceTransactions?invoiceId=7#lines')).toBe('/billing/invoices/7/work?invoiceId=7#lines');
 expect(canonicalPath('/invoices/invoices/invoiceDetail/invoiceTransactions')).toBe('/billing/invoices/selected');
 expect(canonicalPath('/transactions/customerTransactions/editTransaction')).toBe('/work/entries/selected');
 expect(canonicalPath('/billing/invoices/8/work',{customer_invoice_id:7})).toBe('/billing/invoices/8/work');
});
test.each(['0','-1','1e3','abc','9007199254740992'] )('rejects invalid database ID %s',value=>expect(validId(value)).toBe(false));
test('all categories are available to a super admin without duplicate leaves',()=>{
 const groups=buildSidebarRoutes({accessLevel:'SUPER ADMIN'});
 expect(groups.map(g=>g.title)).toEqual(['Clients','Time & Work','Billing','Payments & Credits','Receivables','Reports','Time Tracking','Settings']);
 const leaves=groups.flatMap(g=>g.children.map(x=>x.path));expect(new Set(leaves).size).toBe(leaves.length);expect(leaves).toHaveLength(39);
});
test('employee navigation retains transfer history and their trackers; manager sees catalogues but no admin settings',()=>{
 expect(buildSidebarRoutes({accessLevel:'employee'}).flatMap(g=>g.children.map(x=>x.path))).toEqual(['/payments/transfers','/time-tracking/upload','/time-tracking/history']);
 const paths=buildSidebarRoutes({accessLevel:'manager'}).flatMap(g=>g.children.map(x=>x.path));
 expect(paths).toContain('/settings/job-types');expect(paths).toContain('/receivables/write-offs');
 for(const path of ['/settings/account','/settings/users','/settings/entities','/settings/automations','/work/review/entities'])expect(paths).not.toContain(path);
 expect(canOpenPage({accessLevel:'manager'},'admin')).toBe(false);
 expect(canOpenPage({accessLevel:'AdMiN'},'admin')).toBe(true);
});
