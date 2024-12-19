import { Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';
import Retainer from '../TransactionForms/AddTransaction/Retainer';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import palette from '../../../Theme/palette';

export default function RetainersGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.accountRetainersList || !customerData.accountRetainersList.activeRetainerData) {
      return <div>Loading...</div>;
   }

   const {
      accountRetainersList: { activeRetainerData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Retainer',
         tooltipText: 'New Retainer',
         icon: () => <LibraryAddIcon style={{ color: palette.primary.main }} />,
         component: () => <Retainer customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const displayColumnNames = [
      'retainer_id',
      'parent_retainer_id',
      'customer_id',
      'customer_name',
      'display_name',
      'type_of_hold',
      'starting_amount',
      'current_amount',
      'form_of_payment',
      'payment_reference_number',
      'is_retainer_active',
      'created_at',
      'created_by_user_name',
      'notes'
   ];

   return (
      <>
         <Stack spacing={3}>
            <ExpandableGrid
               title='Retainers and Deposits'
               idField='retainer_id'
               parentColumnName='parent_retainer_id'
               tableData={activeRetainerData}
               arrayOfButtons={gridButtons}
               checkboxSelection
               enableSingleRowClick
               rowSelectionOnly
               displayColumnNames={displayColumnNames}
               routeToPass={'/transactions/customerRetainers/deleteRetainer'}
            />
         </Stack>
      </>
   );
}
