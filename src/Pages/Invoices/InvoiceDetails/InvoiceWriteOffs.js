import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function InvoiceWriteOffs({ invoiceData }) {
   if (!invoiceData || !invoiceData?.invoiceWriteoffsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const customerWriteOffs = invoiceData?.invoiceWriteoffsData?.grid ?? {};

   const arrayOfColumnNames = [
      'writeoff_id',
      'customer_id',
      'customer_name',
      'job_description',
      'writeoff_amount',
      'transaction_type',
      'created_at',
      'created_by_user_name',
      'writeoff_reason',
      'note'
   ];
   const filteredGrid = filterGridByColumnName(customerWriteOffs, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable title='Write Offs' tableData={filteredGrid} />
         </Stack>
      </>
   );
}
