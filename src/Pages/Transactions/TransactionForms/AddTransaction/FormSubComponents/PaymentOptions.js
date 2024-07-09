import { Stack, TextField, Autocomplete } from '@mui/material';
import RetainerSelection from './RetainerSelection';

export default function PaymentOptions({ selectedItems, setSelectedItems, page }) {
   const paymentFormsOne = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'ACH', 'Retainer', 'Prepayment', 'Other'];
   const paymentFormsTwo = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'ACH', 'Other'];
   const paymentForms = page !== 'NewRetainer' ? paymentFormsOne : paymentFormsTwo;

   const { unitCost, formOfPayment, paymentReferenceNumber, currentAmount } = selectedItems;

   const handleFieldChange = field => e => {
      setSelectedItems(prevItems => ({ ...prevItems, [field]: e.target.value }));
   };

   const handleAutocompleteChange = field => (event, value) => {
      if (field === 'formOfPayment') setSelectedItems({ ...selectedItems, selectedRetainer: null });
      setSelectedItems(prevItems => ({ ...prevItems, [field]: value }));
   };

   return (
      <>
         <Stack spacing={1}>
            <Stack style={{ margin: '5px 0px' }}>
               <Autocomplete
                  required
                  size='small'
                  sx={{ width: 350 }}
                  value={formOfPayment}
                  onChange={handleAutocompleteChange('formOfPayment')}
                  getOptionLabel={option => (option ? option.toString() : undefined)}
                  options={paymentForms}
                  renderInput={params => <TextField {...params} label='Form Of Payment' variant='standard' />}
               />
            </Stack>

            {formOfPayment !== 'Retainer' && formOfPayment !== 'Prepayment' && (
               <Stack style={{ margin: '5px 0px' }}>
                  <TextField
                     sx={{ width: 350 }}
                     variant='standard'
                     type='string'
                     label='Payment Reference Number'
                     value={paymentReferenceNumber}
                     onChange={handleFieldChange('paymentReferenceNumber')}
                  />
               </Stack>
            )}

            {(formOfPayment === 'Retainer' || formOfPayment === 'Prepayment') && (
               <Stack style={{ margin: '5px 0px' }}>
                  <RetainerSelection selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />
               </Stack>
            )}

            <Stack style={{ marginTop: '15px' }}>
               <TextField
                  sx={{ width: 350 }}
                  variant='standard'
                  type='number'
                  label={page === 'editRetainer' ? 'Starting Amount' : 'Payment Amount'}
                  value={unitCost}
                  onChange={e => setSelectedItems(prevItems => ({ ...prevItems, unitCost: -Math.abs(e.target.value) }))}
               />
               {page === 'editRetainer' && (
                  <TextField
                     sx={{ width: 350, marginTop: '15px' }}
                     variant='standard'
                     type='number'
                     label='Remaining Amount'
                     value={currentAmount}
                     onChange={e => setSelectedItems(prevItems => ({ ...prevItems, currentAmount: -Math.abs(e.target.value) }))}
                  />
               )}
            </Stack>
         </Stack>
      </>
   );
}
