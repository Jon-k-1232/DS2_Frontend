import PagedRegister from '../../../Components/Lookups/PagedRegister';
import Retainer from '../TransactionForms/AddTransaction/Retainer';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import palette from '../../../Theme/palette';
export default function RetainersGrid({customerData,setCustomerData}) {
   const gridButtons = [
      {
         dialogTitle: 'New Retainer',
         tooltipText: 'New Retainer',
         icon: () => <LibraryAddIcon style={{ color: palette.primary.main }} />,
         component: () => <Retainer customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const displayColumnNames = [
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
      'retainer_id',
      'parent_retainer_id',
      'customer_id',
      'note'
   ];

   return <PagedRegister title='Retainers and Deposits' path='/retainers/getRetainers' listKey='accountRetainersList' dataKey='activeRetainerData' rowsKey='activeRetainers' idField='retainer_id' route='/payments/retainers/deleteRetainer' columns={displayColumnNames} buttons={gridButtons} revision={customerData?.workspaceRevision || 0}/>;
}
