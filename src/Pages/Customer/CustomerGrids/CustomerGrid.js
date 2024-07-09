import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import NewCustomer from '../CustomerForms/AddCustomer/NewCustomer';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function Customers({ customerData, setCustomerData }) {
   if (!customerData || !customerData.customersList || !customerData.customersList.activeCustomerData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      customersList: { activeCustomerData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Customer',
         tooltipText: 'Add Customer',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <NewCustomer customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = [
      'customer_id',
      'business_name',
      'customer_name',
      'display_name',
      'customer_street',
      'customer_city',
      'customer_state',
      'customer_zip',
      'customer_phone',
      'is_billable',
      'is_recurring',
      'is_customer_active'
   ];
   const filteredGrid = filterGridByColumnName(activeCustomerData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Customers'
               tableData={filteredGrid}
               checkboxSelection={false}
               arrayOfButtons={gridButtons}
               enableSingleRowClick
               rowSelectionOnly
               routeToPass='/customers/customersList/customerProfile/customerInvoices'
            />
         </Stack>
      </>
   );
}
