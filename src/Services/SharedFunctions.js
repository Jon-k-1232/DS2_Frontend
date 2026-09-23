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

/**
 * Open invoices a payment may be applied to — CURRENT chain(s) only.
 *
 * Rolling-balance contract: each new parent invoice absorbs all prior
 * outstanding into its beginning_balance, so older chains must never be
 * offered for payment — the billing engine's date gate ignores them, and a
 * payment tagged there vanishes from every future bill. Duplicate same-day
 * parents are all live, so each is offered.
 *
 * Returns non-absorbed current parents (each parent's own authoritative
 * remaining balance — see below) with remaining > 0, largest balance first.
 */
export const getOpenInvoicesForPayment = invoiceRows => {
   if (!Array.isArray(invoiceRows) || !invoiceRows.length) return [];

   // zeroOutAbsorbedInvoices (backend) stamps an absorbed same-day parent's
   // notes with "[absorbed_by:...]" once a newer chain has rolled its balance
   // forward — that parent is a rolled-forward ledger artifact, not a
   // collectible statement, even though it's still a same-day root with
   // child rows of its own. Excluding it here used to be done indirectly (by
   // substituting each parent for its own latest child snapshot), which
   // backfired: an absorbed parent's zeroed remaining got replaced by its
   // still-positive HISTORICAL child balance, resurrecting exactly the
   // obsolete statement this function exists to hide. Genuinely independent
   // same-date roots (no absorption marker) are never touched by this filter
   // and stay offered individually, same as before.
   const parents = invoiceRows.filter(row => !row.parent_invoice_id && !(typeof row.notes === 'string' && row.notes.includes('[absorbed_by:')));
   if (!parents.length) return [];

   const dateOf = row => (row.invoice_date ? new Date(row.invoice_date).toISOString().slice(0, 10) : '');
   const newestDate = parents.map(dateOf).sort().slice(-1)[0];
   const currentParents = parents.filter(parent => dateOf(parent) === newestDate);

   // Each parent's own remaining_balance_on_invoice IS its authoritative
   // balance — no child-snapshot substitution needed once absorbed parents
   // are excluded above.
   return currentParents
      .filter(row => Number(row.remaining_balance_on_invoice) > 0)
      .sort((a, b) => Number(b.remaining_balance_on_invoice) - Number(a.remaining_balance_on_invoice));
};
