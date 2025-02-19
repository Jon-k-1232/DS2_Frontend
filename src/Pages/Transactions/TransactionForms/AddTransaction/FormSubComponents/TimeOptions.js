// TimeOptions.jsx

import { useEffect, useState } from 'react';
import { Box, TextField, Checkbox, FormControlLabel, Radio, RadioGroup, FormControl, Typography, Autocomplete } from '@mui/material';
import dayjs from 'dayjs';
import { handleBillableStatus, handleTimeCalculation } from './SharedTransactionsFunctions';

export default function TimeOptions({ customerData, selectedItems, setSelectedItems }) {
   const [minutes, setMinutes] = useState('');
   const [startTime, setStartTime] = useState(dayjs().format());
   const [endTime, setEndTime] = useState(dayjs().format());

   const { workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions = [] } = {} } = {} } = customerData || {};

   const { selectedTeamMember, isTransactionBillable, detailedJobDescription, isInAdditionToMonthlyCharge, selectedCustomer, selectedGeneralWorkDescription } = selectedItems;

   const updateSelectedItems = (key, value) => {
      setSelectedItems(prev => ({ ...prev, [key]: value }));
   };

   useEffect(() => {
      // 1) Billable logic
      const newBillableStatus = handleBillableStatus(selectedCustomer, isInAdditionToMonthlyCharge, isTransactionBillable);
      if (newBillableStatus !== isTransactionBillable) {
         updateSelectedItems('isTransactionBillable', newBillableStatus);
      }

      // 2) If we already have minutes, set local state & run calculation
      if (selectedItems.minutes) {
         setMinutes(selectedItems.minutes);
         handleTimeCalculation(selectedItems.minutes, selectedTeamMember, startTime, endTime, updateSelectedItems);
      }
      // eslint-disable-next-line
   }, [isInAdditionToMonthlyCharge, selectedItems.minutes]);

   return (
      <Box sx={{ display: 'grid', gap: 2 }}>
         <Autocomplete
            required
            size='small'
            sx={{ width: 350, marginTop: '10px' }}
            value={selectedGeneralWorkDescription}
            onChange={(e, value) => updateSelectedItems('selectedGeneralWorkDescription', value)}
            getOptionLabel={option => (option ? option.general_work_description : '') || ''}
            options={workDescriptions}
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
               handleTimeCalculation(e.target.value, selectedTeamMember, dayjs().format(), dayjs().format(), updateSelectedItems);
            }}
         />

         <FormControlLabel control={<Checkbox checked={isTransactionBillable} onChange={e => updateSelectedItems('isTransactionBillable', e.target.checked)} />} label='Billable' />

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
