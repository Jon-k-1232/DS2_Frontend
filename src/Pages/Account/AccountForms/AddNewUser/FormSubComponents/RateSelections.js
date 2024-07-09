import { Stack, TextField } from '@mui/material';

export default function RateSelections({ selectedItems, setSelectedItems }) {
  const { costRate, billingRate } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            type='number'
            label='Cost Rate'
            value={costRate}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, costRate: e.target.value }))}
          />
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            type='number'
            label='Billing Rate'
            value={billingRate}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, billingRate: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
