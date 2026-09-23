import { useMemo } from 'react';
import { Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';

// zeroOutAbsorbedInvoices stamps an absorbed parent's notes with
// "[absorbed_by:INV-...@date]" once a newer chain has rolled its balance
// forward. Older/pre-fix data can still carry a stale non-zero
// remaining_balance_on_invoice on those rows even though the debt has moved
// on — showing them plainly reads as unpaid debt. Label them instead of
// hiding them so the account's full billing history stays visible.
const ABSORBED_TAG = '[absorbed_by:';
const isAbsorbedRow = row => typeof row?.notes === 'string' && row.notes.includes(ABSORBED_TAG);

const labelAbsorbedRow = row => {
   if (!row) return row;
   const decorated = isAbsorbedRow(row) ? { ...row, invoice_number: `${row.invoice_number || ''} (Rolled forward)`.trim() } : row;
   if (!Array.isArray(row.children)) return decorated;
   return { ...decorated, children: row.children.map(labelAbsorbedRow) };
};

export default function CustomerProfileInvoices({ profileData }) {
   const { customerInvoiceData = {} } = profileData || {};

   // Re-derived only when the underlying tree actually changes — label passes
   // over every row (children included), same cost concern as ExpandableGrid's
   // own column-filter memo.
   const decoratedInvoiceData = useMemo(() => {
      if (!customerInvoiceData?.treeGrid) return customerInvoiceData;
      return {
         ...customerInvoiceData,
         treeGrid: {
            ...customerInvoiceData.treeGrid,
            rows: (customerInvoiceData.treeGrid.rows || []).map(labelAbsorbedRow)
         }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [customerInvoiceData]);

   if (!profileData || !profileData.customerInvoiceData) {
      // Render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const displayColumnNames = [
      'customer_invoice_id',
      'parent_invoice_id',
      'customer_name',
      'invoice_number',
      'invoice_date',
      'due_date',
      'beginning_balance',
      'total_payments',
      'total_charges',
      'total_write_offs',
      'total_retainers',
      'total_amount_due',
      'remaining_balance_on_invoice',
      'is_invoice_paid_in_full',
      'fully_paid_date',
      'created_at',
      'created_by_user_name'
   ];

   return (
      <>
         <Stack spacing={3}>
            <ExpandableGrid
               idField='customer_invoice_id'
               parentColumnName='parent_invoice_id'
               tableData={decoratedInvoiceData}
               checkboxSelection
               rowSelectionOnly
               displayColumnNames={displayColumnNames}
            />
         </Stack>
      </>
   );
}
