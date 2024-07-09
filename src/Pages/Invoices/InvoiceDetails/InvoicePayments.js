import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function InvoicePayments({ invoiceData }) {
   if (!invoiceData || !invoiceData?.invoicePaymentsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const customerPayments = invoiceData?.invoicePaymentsData?.grid ?? {};

   const arrayOfColumnNames = [
      'payment_id',
      'customer_id',
      'customer_name',
      'payment_date',
      'payment_amount',
      'form_of_payment',
      'payment_reference_number',
      'customer_invoice_id',
      'customer_job_id',
      'retainer_id',
      'is_transaction_billable',
      'created_at',
      'created_by_user_name',
      'note'
   ];
   const filteredGrid = filterGridByColumnName(customerPayments, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable title='Payments' tableData={filteredGrid} />
         </Stack>
      </>
   );
}
