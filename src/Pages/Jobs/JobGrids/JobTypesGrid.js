import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import NewJobType from '../JobForms/AddJob/NewJobType';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function JobTypesGrid({ customerData, setCustomerData }) {
   const { jobTypesList: { activeJobTypesData = {} } = {} } = customerData || {};

   if (!customerData || !customerData.jobTypesList || !customerData.jobTypesList.activeJobTypesData) {
      // Render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const gridButtons = [
      {
         dialogTitle: 'New Type Of Job',
         tooltipText: 'Add New Type of Job',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <NewJobType customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = ['job_type_id', 'job_description', 'customer_job_category', 'customer_job_category_id', 'is_job_type_active', 'estimated_straight_time', 'book_rate'];
   const filteredGrid = filterGridByColumnName(activeJobTypesData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Job Options'
               tableData={filteredGrid}
               checkboxSelection={false}
               arrayOfButtons={gridButtons}
               enableSingleRowClick
               rowSelectionOnly
               routeToPass={'/jobs/jobTypesList/deleteJobType'}
            />
         </Stack>
      </>
   );
}
