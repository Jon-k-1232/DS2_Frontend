import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import palette from '../../../Theme/palette';
import AddWorkDescription from '../WorkDescriptionForms/AddWorkDescription/AddWorkDescription';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function WorkDescriptionsGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.workDescriptionsList || !customerData.workDescriptionsList.activeWorkDescriptionsData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      workDescriptionsList: { activeWorkDescriptionsData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'Add Work Description',
         tooltipText: 'Add Work Description',
         icon: () => <LibraryAddIcon style={{ color: palette.primary.main }} />,
         component: () => <AddWorkDescription customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = ['general_work_description_id', 'general_work_description', 'estimated_time', 'is_general_work_description_active'];
   const filteredGrid = filterGridByColumnName(activeWorkDescriptionsData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='General Work Descriptions'
               tableData={filteredGrid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/jobs/workDescriptionsList/deleteWorkDescription'}
            />
         </Stack>
      </>
   );
}
