import React from 'react';
import { Stack, TextField, Autocomplete } from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const frequencies = ['Month', 'Quarter', 'Year'];
const billingDays = ['1', '15'];

export default function RecurringOptions({ customerData, selectedItems, setSelectedItems }) {
  const { selectedCustomer, selectedBillingDay, selectedFrequency, recurringAmount, selectedStartDate } = selectedItems;

  const { activeCustomers } = customerData?.customersList?.activeCustomerData || [];

  const handleAutocompleteChange = field => (event, value) => {
    setSelectedItems(prevItems => ({ ...prevItems, [field]: value }));
  };

  const handleInputChange = field => event => {
    setSelectedItems(prevItems => ({ ...prevItems, [field]: event.target.value }));
  };

  const renderAutocomplete = (value, onChange, options, label) => (
    <Autocomplete
      required
      size='small'
      sx={{ width: 350 }}
      value={value}
      onChange={onChange}
      getOptionLabel={option => option.display_name || option || ''}
      isOptionEqualToValue={(option, value) => option.user_id === value.user_id}
      options={options || []}
      renderInput={params => <TextField {...params} label={label} variant='standard' />}
    />
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack direction='column' spacing={{ xs: 1, sm: 2 }}>
        {renderAutocomplete(
          selectedCustomer,
          handleAutocompleteChange('selectedCustomer'),
          activeCustomers.filter(customer => !customer.is_recurring),
          'Select Customer'
        )}
        {renderAutocomplete(selectedBillingDay, handleAutocompleteChange('selectedBillingDay'), billingDays, 'Select Billing Day')}
        {renderAutocomplete(selectedFrequency, handleAutocompleteChange('selectedFrequency'), frequencies, 'Select Billing Frequency')}

        <TextField
          sx={{ width: 350 }}
          variant='standard'
          type='number'
          label='Recurring Amount'
          value={recurringAmount}
          onChange={handleInputChange('recurringAmount')}
        />

        <DateTimePicker
          sx={{ width: 350 }}
          className='myDatePicker'
          required
          label='Select Start Date'
          value={selectedStartDate || dayjs()}
          onChange={newValue => handleAutocompleteChange('selectedStartDate')(null, dayjs(newValue))}
          renderInput={params => <TextField {...params} />}
        />
      </Stack>
    </LocalizationProvider>
  );
}
