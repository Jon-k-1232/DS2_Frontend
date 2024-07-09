import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function InvoiceTransactions({ invoiceData }) {
   if (!invoiceData || !invoiceData.invoiceTransactionsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const customerTransactions = invoiceData?.invoiceTransactionsData?.grid ?? {};

   const arrayOfColumnNames = [
      'transaction_id',
      'customer_name',
      'transaction_type',
      'quantity',
      'unit_cost',
      'total_transaction',
      'customer_invoice_id',
      'retainer_id',
      'is_transaction_billable',
      'is_excess_to_subscription',
      'created_at',
      'logged_for_user_name',
      'job_description',
      'general_work_description',
      'detailed_work_description'
   ];
   const filteredGrid = filterGridByColumnName(customerTransactions, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable title='Transactions' tableData={filteredGrid} />
         </Stack>
      </>
   );
}
