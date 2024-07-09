import { useEffect, useState } from 'react';
import { Box, TextField, Checkbox, FormControlLabel, Radio, RadioGroup, FormControl, Typography, Autocomplete } from '@mui/material';
import { sixMinuteIncrementTimeCalculation } from './TimeTrackingIncrements';
import dayjs from 'dayjs';

export default function TimeOptions({ customerData, selectedItems, setSelectedItems }) {
  const [minutes, setMinutes] = useState('');
  const [startTime, setStartTime] = useState(dayjs().format());
  const [endTime, setEndTime] = useState(dayjs().format());

  const { workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions } = [] } = [] } = { ...customerData };
  const {
    selectedTeamMember,
    isTransactionBillable,
    detailedJobDescription,
    isInAdditionToMonthlyCharge,
    selectedCustomer,
    selectedGeneralWorkDescription
  } = selectedItems;

  const updateSelectedItems = (key, value) => {
    setSelectedItems(prevItems => ({ ...prevItems, [key]: value }));
  };

  useEffect(() => {
    if (selectedCustomer?.is_recurring && !isInAdditionToMonthlyCharge && isTransactionBillable) {
      updateSelectedItems('isTransactionBillable', false);
    }
    if (selectedCustomer?.is_recurring && isInAdditionToMonthlyCharge && !isTransactionBillable) {
      updateSelectedItems('isTransactionBillable', true);
    }
    // eslint-disable-next-line
  }, [isInAdditionToMonthlyCharge]);

  const handleTimeCalculation = minuteDuration => {
    if (Object.keys(selectedTeamMember).length && minuteDuration && !isNaN(minuteDuration)) {
      const loggedTime = sixMinuteIncrementTimeCalculation(startTime, endTime, minuteDuration);
      const employeeRate = selectedTeamMember.billing_rate;

      if (!isNaN(loggedTime) && !isNaN(employeeRate)) {
        updateSelectedItems('quantity', loggedTime);
        updateSelectedItems('unitCost', employeeRate);
      }
    } else {
      updateSelectedItems('quantity', 1);
      updateSelectedItems('unitCost', 0);
    }

    if (!Object.keys(selectedTeamMember).length) alert('Please select a team member and enter a valid time duration');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Autocomplete
        required
        size='small'
        sx={{ width: 350, marginTop: '10px' }}
        value={selectedGeneralWorkDescription}
        onChange={(e, value) => {
          updateSelectedItems('selectedGeneralWorkDescription', value);
        }}
        getOptionLabel={option => (option ? option.general_work_description : '') || ''}
        options={workDescriptions || []}
        renderInput={params => <TextField {...params} label='General Work Description' variant='standard' />}
      />

      <TextField
        sx={{ width: 350, marginTop: '10px' }}
        variant='standard'
        label='Work Completed On Job'
        value={detailedJobDescription}
        onChange={e => updateSelectedItems('detailedJobDescription', e.target.value)}
      />
      <TextField
        variant='standard'
        sx={{ width: 350 }}
        type='number'
        label='Time In Minutes'
        value={minutes}
        disabled={!selectedTeamMember}
        onChange={e => {
          setStartTime(dayjs().format());
          setEndTime(dayjs().format());
          setMinutes(e.target.value);
          handleTimeCalculation(e.target.value);
        }}
      />
      <FormControlLabel
        control={
          <Checkbox checked={isTransactionBillable} onChange={e => updateSelectedItems('isTransactionBillable', e.target.checked)} />
        }
        label='Billable'
      />
      {selectedCustomer?.is_recurring && (
        <FormControl style={{ width: '350px' }} component='fieldset'>
          <Typography variant='body1'>Is this in addition to the customers monthly base charge?</Typography>
          <RadioGroup
            row
            name='isInAdditionToMonthlyCharge'
            value={isInAdditionToMonthlyCharge ? 'true' : 'false'}
            onChange={e => updateSelectedItems('isInAdditionToMonthlyCharge', e.target.value === 'true')}
          >
            <FormControlLabel value={true} control={<Radio />} label='Yes' />
            <FormControlLabel value={false} control={<Radio />} label='No' />
          </RadioGroup>
        </FormControl>
      )}
    </Box>
  );
}
