import ReceiptsPage from '../../Payments/ReceiptsPage';
import { Stack, Typography } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function CustomerProfilePayments({ profileData, entityId }) {
   const customerPayments = profileData?.customerPaymentData?.grid ?? {};

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
            <ReceiptsPage key={`${profileData?.customerData?.customerData?.customer_id}:${entityId || 'all'}`} customerId={profileData?.customerData?.customerData?.customer_id} billingEntityId={entityId}/>
            <Typography variant='h6'>Payment applications and legacy entries</Typography>
            <DataGridTable tableData={filteredGrid} />
         </Stack>
      </>
   );
}
