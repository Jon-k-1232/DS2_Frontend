import { Stack, TextField } from '@mui/material';

export default function NewJobCategorySelections({ customerData, selectedItems, setSelectedItems }) {
  const { selectedNewJobCategory } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='New Job Category'
            value={selectedNewJobCategory}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, selectedNewJobCategory: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
