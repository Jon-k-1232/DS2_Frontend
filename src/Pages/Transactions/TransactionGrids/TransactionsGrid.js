import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import Charge from '../TransactionForms/AddTransaction/Charge';
import Time from '../TransactionForms/AddTransaction/Time';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function TransactionsGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.transactionsList || !customerData.transactionsList.activeTransactionsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      transactionsList: { activeTransactionsData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Charge',
         tooltipText: 'New Charge',
         icon: () => <LibraryAddIcon style={{ color: palette.primary.main }} />,
         component: () => <Charge customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      },
      {
         dialogTitle: 'Add Time',
         tooltipText: 'Add Time',
         icon: () => <MoreTimeIcon style={{ color: palette.primary.main }} />,
         component: () => <Time customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = [
      'transaction_id',
      'customer_id',
      'customer_name',
      'transaction_type',
      'quantity',
      'unit_cost',
      'total_transaction',
      'customer_invoice_id',
      'retainer_id',
      'is_transaction_billable',
      'is_excess_to_subscription',
      'transaction_date',
      'created_at',
      'logged_for_user_name',
      'job_description',
      'general_work_description',
      'detailed_work_description'
   ];
   const filteredGrid = filterGridByColumnName(activeTransactionsData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Charges and Time'
               tableData={filteredGrid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/transactions/customerTransactions/deleteTimeOrCharge'}
            />
         </Stack>
      </>
   );
}
