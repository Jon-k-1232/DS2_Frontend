import dayjs from 'dayjs';

/**
 * Find the most recent invoice for each invoice group
 * @returns
 */
const findCustomerInvoices = customerInvoiceData => {
   // Group invoices
   const invoiceGroups = customerInvoiceData.reduce((acc, invoice) => {
      const identifier = invoice.parent_invoice_id || invoice.customer_invoice_id;

      if (!acc[identifier]) acc[identifier] = [];

      acc[identifier].push(invoice);
      return acc;
   }, {});

   // Get most recent invoice for each group
   const mostRecentInvoices = Object.values(invoiceGroups).map(group => {
      return group.reduce((mostRecent, invoice) => {
         if (!mostRecent || dayjs(invoice.created_at).isAfter(dayjs(mostRecent.created_at))) return invoice;

         return mostRecent;
      }, null);
   });

   // Filter out groups where the most recent invoice has remaining_balance_on_invoice <= 0
   return mostRecentInvoices.filter(invoice => invoice.remaining_balance_on_invoice > 0);
};

export default findCustomerInvoices;
