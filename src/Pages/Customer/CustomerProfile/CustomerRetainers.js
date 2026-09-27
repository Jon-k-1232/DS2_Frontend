import RetainerEvents from './RetainerEvents';
import { Link } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';

export default function CustomerRetainers({ profileData, onChanged, entityId }) {
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
            <Alert severity='info'>Receipt credits and retainers are separate funds. Choose the business above to review its available credit.
               <Button component={Link} to={`/payments/credits?customerId=${profileData?.customerData?.customerData?.customer_id}${entityId?'&entityId='+entityId:''}`}>View client credits</Button>
            </Alert>
            <RetainerEvents rows={customerRetainerData.customerRetainers || customerRetainerData.grid?.rows || []} onChanged={onChanged} />
            <ExpandableGrid
               idField='retainer_id'
               parentColumnName='parent_retainer_id'
               tableData={customerRetainerData}
               displayColumnNames={displayColumnNames}
            />
         </Stack>
      </>
   );
}
