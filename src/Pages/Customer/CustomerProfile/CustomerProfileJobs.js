import { Stack } from '@mui/material';
import ExpandableGrid from '../../../Components/DataGrids/ExpandableGrid';

export default function CustomerProfileJobs({ profileData }) {
   const { customerJobData = {} } = profileData || {};

   if (!profileData || !profileData.customerJobData) {
      // Render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const displayColumnNames = [
      'customer_job_id',
      'parent_job_id',
      'customer_name',
      'job_description',
      'customer_job_category',
      'agreed_job_amount',
      'current_job_total',
      'book_rate',
      'is_job_complete',
      'is_quote',
      'job_quote_amount',
      'created_at',
      'created_by_user',
      'notes'
   ];

   return (
      <>
         <Stack spacing={3}>
            <ExpandableGrid
               idField='customer_job_id'
               parentColumnName='parent_job_id'
               tableData={customerJobData}
               checkboxSelection
               enableSingleRowClick
               rowSelectionOnly
               routeToPass={'/jobs/jobsList/deleteJob'}
               displayColumnNames={displayColumnNames}
            />
         </Stack>
      </>
   );
}
