import { Stack, TextField } from '@mui/material';

export default function AddressForm({ selectedItems, setSelectedItems }) {
  const { customerStreet, customerCity, customerState, customerZip, customerPhone, customerEmail } = selectedItems;

  return (
    <>
      <Stack>
        <Stack direction='row' alignItems='right' justifyContent='space-between' mb={2}>
          <TextField
            sx={{ width: 350 }}
            variant='standard'
            label='Street Address'
            value={customerStreet}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerStreet: e.target.value }))}
          />
        </Stack>
        <Stack direction='row' alignItems='right' justifyContent='space-between' mb={2}>
          <TextField
            sx={{ marginRight: '10px' }}
            variant='standard'
            label='City'
            value={customerCity}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerCity: e.target.value }))}
          />
          <TextField
            sx={{ marginRight: '10px', marginLeft: '10px' }}
            variant='standard'
            label='State'
            value={customerState}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerState: e.target.value }))}
          />
          <TextField
            sx={{ marginLeft: '10px' }}
            type='number'
            variant='standard'
            label='Zip'
            value={customerZip}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerZip: e.target.value }))}
          />
        </Stack>
        <Stack direction='row' alignItems='right' mb={2}>
          <TextField
            variant='standard'
            sx={{ marginRight: '10px' }}
            type='tel'
            label='Phone'
            value={customerPhone}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerPhone: e.target.value }))}
          />
          <TextField
            variant='standard'
            sx={{ marginLeft: '10px' }}
            type='email'
            label='Email'
            value={customerEmail}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, customerEmail: e.target.value }))}
          />
        </Stack>
      </Stack>
    </>
  );
}
