import { useEffect } from 'react';
import { Stack, TextField, Checkbox, FormControlLabel, FormControl, Typography, RadioGroup, Radio, Autocomplete } from '@mui/material';

export default function ChargeOptions({ customerData, selectedItems, setSelectedItems }) {
   const { workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions } = [] } = [] } = { ...customerData };

   const { detailedJobDescription, quantity, unitCost, isTransactionBillable, isInAdditionToMonthlyCharge, selectedCustomer, selectedGeneralWorkDescription } = selectedItems;

   useEffect(() => {
      if (selectedCustomer?.is_recurring && !isInAdditionToMonthlyCharge && isTransactionBillable) {
         updateSelectedItems('isTransactionBillable', false);
      }
      if (selectedCustomer?.is_recurring && isInAdditionToMonthlyCharge && !isTransactionBillable) {
         updateSelectedItems('isTransactionBillable', true);
      }
      // eslint-disable-next-line
   }, [isInAdditionToMonthlyCharge]);

   const updateSelectedItems = (key, value) => {
      setSelectedItems(prevItems => ({ ...prevItems, [key]: value }));
   };

   return (
      <>
         <Autocomplete
            required
            size='small'
            sx={{ width: 350, marginTop: '10px' }}
            value={selectedGeneralWorkDescription}
            onChange={(e, value) => {
               updateSelectedItems('selectedGeneralWorkDescription', value);
            }}
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

         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
            <TextField variant='standard' sx={{ width: 100 }} type='number' label='Quantity' value={quantity} onChange={e => updateSelectedItems('quantity', e.target.value)} />
            <TextField variant='standard' sx={{ width: 100 }} type='number' label='Unit Cost' value={unitCost} onChange={e => updateSelectedItems('unitCost', e.target.value)} />
         </Stack>

         <FormControlLabel control={<Checkbox checked={isTransactionBillable} onChange={e => updateSelectedItems('isTransactionBillable', e.target.checked)} />} label='Billable' />

         {selectedCustomer?.is_recurring && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
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
            </Stack>
         )}
      </>
   );
}
