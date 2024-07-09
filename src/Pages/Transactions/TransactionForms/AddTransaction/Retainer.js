import React, { useState, useContext } from 'react';
import { Box, Button, Typography, Alert, Stack, Autocomplete, TextField } from '@mui/material';
import InitialSelectionOptions from './FormSubComponents/InitialSelectionOptions';
import { postNewRetainer } from '../../../../Services/ApiCalls/PostCalls';
import PaymentOptions from './FormSubComponents/PaymentOptions';
import { formObjectForRetainerPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import dayjs from 'dayjs';
import { context } from '../../../../App';

const initialState = {
   selectedCustomer: null,
   selectedTeamMember: null,
   detailedJobDescription: '',
   selectedDate: dayjs(),
   isTransactionBillable: true,
   unitCost: 0,
   quantity: 1,
   formOfPayment: null,
   paymentReferenceNumber: '',
   typeOfHold: null,
   note: '',
   displayName: ''
};

export default function Retainer({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);
   const { unitCost, quantity } = selectedItems;

   const handleSubmit = async () => {
      const dataToPost = formObjectForRetainerPost(selectedItems, loggedInUser);
      const postedItem = await postNewRetainer(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, accountRetainersList: postedItem.accountRetainersList });
      }
   };

   const formatTotal = value => {
      return value
         .toFixed(2)
         .toString()
         .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
   };

   return (
      <>
         <Box sx={{ display: 'grid', gap: 3 }}>
            <InitialSelectionOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} page='Retainer' initialState={initialState} />

            <PaymentOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} page='NewRetainer' />

            <TextField
               sx={{ width: 350 }}
               variant='standard'
               type='string'
               label='Label of Retainer Or Payment'
               value={selectedItems.displayName}
               onChange={e => setSelectedItems({ ...selectedItems, displayName: e.target.value })}
            />

            <Stack style={{ margin: '5px 0px' }}>
               <Autocomplete
                  required
                  size='small'
                  sx={{ width: 350 }}
                  value={selectedItems.typeOfHold}
                  onChange={(e, value) => setSelectedItems({ ...selectedItems, typeOfHold: value })}
                  getOptionLabel={option => (option ? option.toString() : undefined)}
                  options={['Retainer', 'Prepayment']}
                  renderInput={params => <TextField {...params} label='Type of Hold' variant='standard' />}
               />
            </Stack>

            <Stack style={{ margin: '5px 0px' }}>
               <TextField sx={{ width: 350 }} variant='standard' type='string' label='Note' value={selectedItems.note} onChange={e => setSelectedItems({ ...selectedItems, note: e.target.value })} />
            </Stack>

            <Stack spacing={2}>
               <Typography>Total: {formatTotal(quantity * unitCost)}</Typography>
            </Stack>

            <Box style={{ textAlign: 'center', marginTop: '18px' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}
