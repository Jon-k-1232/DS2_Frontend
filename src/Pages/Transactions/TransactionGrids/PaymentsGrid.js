import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import Payment from '../TransactionForms/AddTransaction/Payment';
import PaymentIcon from '@mui/icons-material/Payment';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function PaymentsGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.paymentsList || !customerData.paymentsList.activePaymentsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      paymentsList: { activePaymentsData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Payment',
         tooltipText: 'New Payment',
         icon: () => <PaymentIcon style={{ color: palette.primary.main }} />,
         component: () => <Payment customerData={customerData} setCustomerData={data => setCustomerData(data)} dialogSize='xl' />
      }
   ];

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
   const filteredGrid = filterGridByColumnName(activePaymentsData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Payments'
               tableData={filteredGrid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/transactions/customerPayments/deletePayment'}
            />
         </Stack>
      </>
   );
}
