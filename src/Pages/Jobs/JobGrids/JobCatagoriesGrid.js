import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import NewJobCategory from '../JobForms/AddJob/NewJobCategory';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';

export default function JobCatagoriesGrid({ customerData, setCustomerData }) {
   const { jobCategoriesList: { activeJobCategoriesData = {} } = {} } = customerData || {};

   if (!customerData || !customerData.jobCategoriesList || !customerData.jobCategoriesList.activeJobCategoriesData) {
      // Render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const gridButtons = [
      {
         dialogTitle: 'New Job Category',
         tooltipText: 'Add a New Job Category',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <NewJobCategory customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = ['customer_job_category_id', 'customer_job_category', 'is_job_category_active'];
   const filteredGrid = filterGridByColumnName(activeJobCategoriesData.grid, arrayOfColumnNames);

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Job Categories'
               tableData={filteredGrid}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/jobs/jobCategoriesList/deleteJobCategory'}
            />
         </Stack>
      </>
   );
}
