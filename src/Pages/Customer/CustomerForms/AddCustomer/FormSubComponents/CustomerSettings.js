import { Stack, FormControlLabel, Checkbox } from '@mui/material';

export default function CustomerSettings({ selectedItems, setSelectedItems }) {
  const { isCustomerActive, isCustomerBillable, isCustomerRecurring } = selectedItems;

  return (
    <>
      <Stack spacing={3}>
        <Stack direction='row' alignItems='right' justifyContent='space-between' mb={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isCustomerActive || false}
                onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerActive: e.target.checked }))}
              />
            }
            label='Customer Active'
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isCustomerBillable || false}
                onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerBillable: e.target.checked }))}
              />
            }
            label='Customer Billable'
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isCustomerRecurring || false}
                onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCustomerRecurring: e.target.checked }))}
              />
            }
            label='Billing Recurring Monthly'
          />
        </Stack>
      </Stack>
    </>
  );
}
