import dayjs from 'dayjs';

/**
 * The backend Api generally gives all the column data nd row data. this will allow a user to specify what columns they want.
 * @param {*} data- the table data object
 * @param {*} columns - when passing column names, id is required - ['id', 'name', 'age'] these should be columns that are to be showen.
 * @returns  {object} - returns an object with the columns and rows filtered based on user input
 */
export const filterGridByColumnName = (data, columns) => {
   // Filter and sort columns based on the order in the 'columns' array
   const filteredColumns = columns
      .map(colName => {
         return data.columns.find(col => col.field === colName);
      })
      .filter(Boolean); // Remove undefined items

   // Only strings shaped like an ISO date ("2026-05-22..." / "2026-05-22T10:30:00.000Z")
   // are candidates for date formatting. Gating on this regex before calling dayjs
   // matters: grids run this on every cell, and a 44k-row tree (Jobs) means ~600k
   // cells — dayjs parse attempts on all of them blocked the UI for seconds.
   const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}([T\s]|$)/;

   // Recursive function to filter and transform rows
   const filterRows = rows => {
      return rows.map(row => {
         const filteredRow = filteredColumns.reduce(
            (acc, col) => {
               const value = row[col.field];
               if (typeof value === 'string' && ISO_DATE_PREFIX.test(value) && dayjs(value).isValid()) {
                  acc[col.field] = dayjs(value).format('MMMM D, YYYY hh:mm A');
               } else {
                  acc[col.field] = value;
               }
               return acc;
            },
            { id: row.id }
         ); // Initialize with the 'id' field

         // If the row has children, recursively filter them
         if (row.children && row.children.length > 0) {
            filteredRow.children = filterRows(row.children);
         }

         return filteredRow;
      });
   };

   const filteredRows = filterRows(data.rows);

   return {
      columns: filteredColumns,
      rows: filteredRows
   };
};

/**
 * formats the total
 * @param {*} value
 * @returns
 */
export const formatTotal = value => {
   return value
      .toFixed(2)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/** Current parent choices with the latest snapshot balance; issued parents stay immutable. */
export const getOpenInvoicesForPayment = invoiceRows => {
   if (!Array.isArray(invoiceRows) || !invoiceRows.length) return [];
   const parents = invoiceRows.filter(r => !r.parent_invoice_id);
   if (!parents.length) return [];
   const dateOf = r => r.invoice_date ? new Date(r.invoice_date).toISOString().slice(0, 10) : '';
   const newestDate = parents.map(dateOf).sort().slice(-1)[0];
   const absorbed = r => typeof r.notes === 'string' && r.notes.includes('[absorbed_by:');
   return parents.filter(p => dateOf(p) === newestDate && !absorbed(p)).map(parent => {
      const chain = invoiceRows.filter(r => r.customer_invoice_id === parent.customer_invoice_id || r.parent_invoice_id === parent.customer_invoice_id);
      const latest = chain.slice().sort((a,b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0) || b.customer_invoice_id - a.customer_invoice_id)[0];
      if (absorbed(latest)) return null;
      return { ...parent, remaining_balance_on_invoice: latest.remaining_balance_on_invoice, is_invoice_paid_in_full: latest.is_invoice_paid_in_full };
   }).filter(r => r && Number(r.remaining_balance_on_invoice) > 0)
      .sort((a,b) => Number(b.remaining_balance_on_invoice) - Number(a.remaining_balance_on_invoice));
};
