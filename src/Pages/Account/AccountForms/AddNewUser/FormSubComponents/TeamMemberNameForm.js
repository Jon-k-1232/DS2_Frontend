import { Stack, TextField } from '@mui/material';

export default function TeamMemberName({ selectedItems, setSelectedItems, page }) {
  const { userFirstName, userLastName, userDisplayName, userEmail } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        {page !== 'editUser' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
            <TextField
              sx={{ width: '350px' }}
              variant='standard'
              label='First Name'
              value={userFirstName}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userFirstName: e.target.value }))}
            />
            <TextField
              sx={{ width: '350px' }}
              variant='standard'
              label='Last Name'
              value={userLastName}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userLastName: e.target.value }))}
            />
          </Stack>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='Display Name'
            value={userDisplayName}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userDisplayName: e.target.value }))}
          />
          <TextField
            sx={{ width: '350px' }}
            variant='standard'
            label='Email'
            value={userEmail}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, userEmail: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
