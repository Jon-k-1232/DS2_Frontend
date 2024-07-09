import { Stack, TextField, Autocomplete } from '@mui/material';

export default function AccessSelections({ selectedItems, setSelectedItems }) {
  const { role, accessLevel } = selectedItems; // accessLevel is a string or undefined

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='Role'
            value={role}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, role: e.target.value }))}
          />
          <Autocomplete
            size='small'
            value={accessLevel}
            onChange={(event, newValue) => setSelectedItems(otherItems => ({ ...otherItems, accessLevel: newValue }))}
            isOptionEqualToValue={(option, value) => option === value || value === ''} // Accept empty string
            options={accessLevels || []}
            sx={{ width: 350 }}
            renderInput={params => <TextField {...params} label='Access Level' variant='standard' />}
          />
        </Stack>
      </Stack>
    </>
  );
}

const accessLevels = ['Admin', 'Manager', 'User'];
