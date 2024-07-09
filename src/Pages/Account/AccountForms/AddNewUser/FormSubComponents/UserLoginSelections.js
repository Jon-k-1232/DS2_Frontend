import { Stack, TextField } from '@mui/material';

export default function UserLoginSelections({ selectedItems, setSelectedItems }) {
  const { userLoginName, userLoginPassword } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='User Login Name'
            value={userLoginName}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userLoginName: e.target.value }))}
          />
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='User Login Password'
            value={userLoginPassword}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userLoginPassword: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
