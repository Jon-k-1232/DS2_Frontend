import { Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';

export default function CustomerProfileInvoices({ profileData }) {
   const { customerInvoiceData = {} } = profileData || {};

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
               tableData={customerInvoiceData}
               checkboxSelection
               rowSelectionOnly
               displayColumnNames={displayColumnNames}
            />
         </Stack>
      </>
   );
}
