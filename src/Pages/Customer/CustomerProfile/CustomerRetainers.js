import { Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';

export default function CustomerRetainers({ profileData }) {
   const { customerRetainerData = {} } = profileData || {};

   if (!profileData || !profileData.customerRetainerData) {
      // Render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const displayColumnNames = [
      'retainer_id',
      'parent_retainer_id',
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
               idField='retainer_id'
               parentColumnName='parent_retainer_id'
               tableData={customerRetainerData}
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
