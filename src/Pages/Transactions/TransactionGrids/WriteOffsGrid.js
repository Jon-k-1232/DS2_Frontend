import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import WriteOff from '../TransactionForms/AddTransaction/WriteOff';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function WriteOffsGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.writeOffsList || !customerData.writeOffsList.activeWriteOffsData) {
      return <div>Loading...</div>;
   }

   const {
      writeOffsList: { activeWriteOffsData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New Write Off',
         tooltipText: 'New Write Off',
         icon: () => <PlaylistRemoveIcon style={{ color: palette.primary.main }} />,
         component: () => <WriteOff customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = [
      'writeoff_id',
      'customer_id',
      'customer_invoice_id',
      'customer_job_id',
      'customer_name',
      'job_description',
      'writeoff_amount',
      'transaction_type',
      'writeoff_date',
      'created_at',
      'created_by_user_name',
      'writeoff_reason',
      'note'
   ];
   const filteredGrid = filterGridByColumnName(activeWriteOffsData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Write Offs'
               tableData={filteredGrid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/transactions/customerWriteOffs/deleteWriteOff'}
            />
         </Stack>
      </>
   );
}
