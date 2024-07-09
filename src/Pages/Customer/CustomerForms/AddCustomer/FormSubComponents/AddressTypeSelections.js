import { Stack, Checkbox, FormControlLabel } from '@mui/material';

export default function AddressTypeSelections({ selectedItems, setSelectedItems }) {
  const { isCustomerPhysicalAddress, isCustomerBillingAddress, isCustomerMailingAddress } = selectedItems;

  return (
    <>
      <Stack direction='row' justifyContent='space-between' mb={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isCustomerPhysicalAddress}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerPhysicalAddress: e.target.checked }))}
            />
          }
          label='Physical Address'
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isCustomerBillingAddress}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerBillingAddress: e.target.checked }))}
            />
          }
          label='Billing Address'
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isCustomerMailingAddress}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerMailingAddress: e.target.checked }))}
            />
          }
          label='Mailing Address'
        />
      </Stack>
    </>
  );
}
