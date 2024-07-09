import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function CustomerProfileTransactions({ profileData }) {
   const customerTransactions = profileData?.customerTransactionData?.grid ?? {};

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
            <DataGridTable tableData={filteredGrid} checkboxSelection enableSingleRowClick rowSelectionOnly routeToPass={'/transactions/customerTransactions/deleteTimeOrCharge'} />
         </Stack>
      </>
   );
}
