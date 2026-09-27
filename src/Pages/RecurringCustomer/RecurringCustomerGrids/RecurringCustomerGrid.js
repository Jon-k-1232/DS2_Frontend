import {useState} from 'react';
import EntityPicker,{filterEntityGrid} from '../../../Components/BillingEntities/EntityPicker';
import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import AddRecurringCustomer from '../RecurringCustomerForms/AddCustomer/AddRecurringCustomer';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';

export default function RecurringCustomers({ customerData, setCustomerData }) {
   const [entityId,setEntityId]=useState(null);
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
      <><EntityPicker all value={entityId} onChange={setEntityId} />
         <Stack spacing={3}>
            <DataGridTable
               title='Recurring Customers'
               passedHeight={window.innerHeight - 140}
               tableData={filterEntityGrid(activeRecurringCustomersData.grid,entityId)}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={row => `/clients/${row.customer_id}/statements`}
            />
         </Stack>
      </>
   );
}
