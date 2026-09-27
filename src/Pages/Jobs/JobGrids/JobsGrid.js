import PagedRegister from '../../../Components/Lookups/PagedRegister';
import NewJob from '../JobForms/AddJob/NewJob';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';
export default function JobsGrid({customerData,setCustomerData}) {
   const gridButtons = [
      {
         dialogTitle: 'New Customer Job',
         tooltipText: 'Add New Customer Job',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <NewJob customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const displayColumnNames = [
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
      'customer_job_id',
      'parent_job_id',
      'notes'
   ];

   return <PagedRegister title='Jobs' path='/jobs/getJobs' listKey='accountJobsList' dataKey='activeJobData' rowsKey='activeJobs' idField='customer_job_id' route='/work/jobs/deleteJob' sortable columns={displayColumnNames} buttons={gridButtons} revision={customerData?.workspaceRevision || 0}/>;
}
