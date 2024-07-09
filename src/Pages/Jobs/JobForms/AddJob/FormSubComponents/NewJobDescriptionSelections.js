import { Stack, Autocomplete, TextField } from '@mui/material';

export default function NewJobDescriptionSelections({ customerData, selectedItems, setSelectedItems }) {
  const { jobCategoriesList: { activeJobCategoriesData: { activeJobCategories = {} } = {} } = {} } = customerData;
  const { jobDescription, customerJobCategory, bookRate, estimatedStraightTime } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            type='string'
            variant='standard'
            label='Job Description'
            value={jobDescription}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, jobDescription: e.target.value }))}
          />
          <Autocomplete
            size='small'
            sx={{ width: 350 }}
            value={customerJobCategory}
            onChange={(e, newValue) => setSelectedItems(otherItems => ({ ...otherItems, customerJobCategory: newValue }))}
            getOptionLabel={option => option.customer_job_category || ''}
            options={activeJobCategories || []}
            renderInput={params => <TextField {...params} label='Job Category' variant='standard' />}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            type='number'
            variant='standard'
            label='Book Rate'
            value={bookRate}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, bookRate: e.target.value }))}
          />
          <TextField
            sx={{ width: '350px' }}
            type='number'
            variant='standard'
            label='Estimated Time In Hours'
            value={estimatedStraightTime}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, estimatedStraightTime: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
