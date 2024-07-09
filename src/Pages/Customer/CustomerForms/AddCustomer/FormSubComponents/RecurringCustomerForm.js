import { Stack, TextField, FormControl, RadioGroup, FormControlLabel, Radio, Autocomplete } from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const frequencies = ['Monthly', 'Quarterly', 'Yearly'];

export default function RecurringCustomerForm({ selectedItems, setSelectedItems }) {
  const { recurringAmount, billingCycle, subscriptionFrequency, selectedStartDate } = selectedItems;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack spacing={2}>
        <DateTimePicker
          sx={{ width: 350 }}
          className='recurringDate'
          required
          label='Select Start Date'
          value={selectedStartDate || dayjs()}
          onChange={newValue => setSelectedItems(otherItems => ({ ...otherItems, selectedStartDate: dayjs(newValue) }))}
          renderInput={params => <TextField {...params} />}
        />

        <Autocomplete
          required
          size='small'
          sx={{ width: 350 }}
          value={subscriptionFrequency || null}
          onChange={(event, newValue) => {
            setSelectedItems(otherItems => ({
              ...otherItems,
              subscriptionFrequency: newValue
            }));
          }}
          options={frequencies}
          renderInput={params => <TextField {...params} label={'Subscription Frequency'} variant='standard' />}
        />

        <FormControl>
          <RadioGroup
            style={{ display: 'flex', flexDirection: 'row' }}
            value={billingCycle}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, billingCycle: e.target.value }))}
          >
            <FormControlLabel value='1' control={<Radio size='small' />} label='First of the Month' />
            <FormControlLabel value='15' control={<Radio size='small' />} label='Fifteenth of the Month' />
          </RadioGroup>
        </FormControl>

        <TextField
          sx={{ width: 350, marginLeft: '10px' }}
          variant='standard'
          type={'number'}
          label='Recurring Amount'
          value={recurringAmount}
          onChange={e =>
            setSelectedItems(otherItems => ({
              ...otherItems,
              recurringAmount: Number(e.target.value)
            }))
          }
        />
      </Stack>
    </LocalizationProvider>
  );
}
