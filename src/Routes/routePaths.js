import legacyRoutes from './legacyRoutes.json';

export const editorRoutes = {
   '/work/entries': { key: 'transaction_id', customer: true, actions: { editTransaction: 'edit', deleteTimeOrCharge: 'delete' } },
   '/payments/receipts': { key: 'payment_id', base: '/payments/receipts/legacy', actions: { deletePayment: 'delete', reversePayment: 'reverse' } },
   '/payments/retainers': { key: 'retainer_id', actions: { deleteRetainer: 'delete' } },
   '/receivables/write-offs': { key: 'writeoff_id', actions: { deleteWriteOff: 'delete' } },
   '/work/jobs': { key: 'customer_job_id', actions: { editJob: 'edit', deleteJob: 'delete' } },
   '/settings/job-types': { key: 'job_type_id', actions: { editJobType: 'edit', deleteJobType: 'delete' } },
   '/settings/job-categories': { key: 'customer_job_category_id', actions: { editJobCategory: 'edit', deleteJobCategory: 'delete' } },
   '/settings/work-descriptions': { key: 'general_work_description_id', actions: { editWorkDescription: 'edit', deleteWorkDescription: 'delete' } },
   '/settings/users': { key: 'user_id', actions: { editUser: 'edit', deleteUser: 'delete' } }
};
export const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
export const clientTabs = { customerInvoices: 'statements', customerTransactions: 'work', customerJobs: 'jobs', customerPayments: 'receipts', retainersAndPrePayments: 'credits', editCustomerProfile: 'edit' };
export const invoiceTabs = { invoiceTransactions: 'work', invoicePayments: 'payments', invoiceWriteOffs: 'write-offs', invoiceOutstandingInvoices: 'balance-forward', invoiceRetainers: 'retainers' };

// Bookmarks and data-grid links share this adapter. Never infer an ID from a
// list position or a previously visited customer/invoice.
export function canonicalPath(input, state = {}) {
   const url = new URL(input, 'http://ds2.invalid');
   let path = url.pathname.replace(/\/$/, '') || '/';
   const prior = Object.keys(legacyRoutes).sort((a, b) => b.length - a.length)
      .find(old => path === old || path.startsWith(old + '/'));
   if (prior) path = legacyRoutes[prior] + path.slice(prior.length);
   const row = state?.rowData || state || {};
   if (path.startsWith('/clients/')) path = path.split('/').map(part => clientTabs[part] || part).join('/');
   if (path.startsWith('/billing/invoices/selected')) {
      const id = row.parent_invoice_id || row.customer_invoice_id || url.searchParams.get('invoiceId') || url.searchParams.get('invoiceID') || url.searchParams.get('customer_invoice_id');
      path = validId(id) ? path.replace('/selected', '/' + id) : '/billing/invoices/selected';
   }
   if (path.startsWith('/billing/invoices/')) path = path.split('/').map(part => invoiceTabs[part] || part).join('/');
   for (const [base, spec] of Object.entries(editorRoutes)) {
      const action = spec.actions[path.slice(base.length + 1)];
      if (!path.startsWith(base + '/') || !action) continue;
      const id = row[spec.key] || url.searchParams.get(spec.key) || url.searchParams.get('id');
      const customerId = row.customer_id || url.searchParams.get('customerId') || url.searchParams.get('customer_id');
      const target = spec.base || base;
      path = validId(id) && (!spec.customer || validId(customerId))
         ? `${target}/${spec.customer ? customerId + '/' : ''}${id}/${action}` : `${target}/selected`;
   }
   const roots = { '/customers': '/clients', '/transactions': '/work/entries', '/invoices': '/billing/invoices', '/jobs': '/work/jobs', '/analytics': '/reports/billing-performance', '/account': '/settings/account' };
   path = roots[path] || path;
   return path + url.search + url.hash;
}
