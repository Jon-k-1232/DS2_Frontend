import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import AddRecurringCustomer from '../RecurringCustomerForms/AddCustomer/AddRecurringCustomer';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';

export default function RecurringCustomers({ customerData, setCustomerData }) {
   if (!customerData || !customerData.recurringCustomersList || !customerData.recurringCustomersList.activeRecurringCustomersData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      recurringCustomersList: { activeRecurringCustomersData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Recurring Customer',
         tooltipText: 'Add New Recurring Customer',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <AddRecurringCustomer customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Recurring Customers'
               tableData={activeRecurringCustomersData.grid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass='/customers/customersList/customerProfile/customerInvoices'
            />
         </Stack>
      </>
   );
}
