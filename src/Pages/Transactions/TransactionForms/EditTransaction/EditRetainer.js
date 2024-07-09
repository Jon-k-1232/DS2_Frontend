import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Alert, Stack, Autocomplete, TextField } from '@mui/material';
import InitialSelectionOptions from '../AddTransaction/FormSubComponents/InitialSelectionOptions';
import { postEditRetainer } from '../../../../Services/ApiCalls/PutCalls';
import PaymentOptions from '../AddTransaction/FormSubComponents/PaymentOptions';
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
   currentAmount: 0,
   quantity: 1,
   formOfPayment: null,
   paymentReferenceNumber: '',
   typeOfHold: null,
   note: '',
   displayName: ''
};

export default function EditRetainer({ customerData, setCustomerData, retainerData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);
   const { quantity } = selectedItems;
   const { teamMembersList: { activeUserData: { activeUsers } = [] } = [], customersList: { activeCustomerData: { activeCustomers } = [] } = [] } = {
      ...customerData
   };

   const {
      account_id,
      created_at,
      created_by_user_id,
      current_amount,
      customer_id,
      form_of_payment,
      is_retainer_active,
      note,
      parent_retainer_id,
      payment_reference_number,
      retainer_id,
      starting_amount,
      type_of_hold,
      display_name
   } = retainerData || {};

   useEffect(() => {
      if (retainerData && Object.keys(retainerData).length) {
         setSelectedItems({
            ...selectedItems,
            accountID: account_id,
            retainerID: retainer_id,
            parentRetainerID: parent_retainer_id,
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id),
            selectedTeamMember: activeUsers.find(user => user.user_id === created_by_user_id),
            selectedDate: dayjs(created_at),
            isTransactionBillable: is_retainer_active,
            unitCost: starting_amount,
            currentAmount: current_amount,
            quantity: 1,
            formOfPayment: form_of_payment,
            paymentReferenceNumber: payment_reference_number,
            typeOfHold: type_of_hold,
            note,
            displayName: display_name
         });
      }
      // eslint-disable-next-line
   }, [retainerData]);

   const handleSubmit = async () => {
      const dataToPost = formObjectForRetainerPost(selectedItems, loggedInUser);
      const postedItem = await postEditRetainer(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, accountRetainersList: postedItem.accountRetainersList });
         navigate('/transactions/customerRetainers');
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

            <TextField
               sx={{ width: 350 }}
               variant='standard'
               type='string'
               label='Label of Retainer Or Payment'
               value={selectedItems.displayName}
               onChange={e => setSelectedItems({ ...selectedItems, displayName: e.target.value })}
            />

            <PaymentOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} page='editRetainer' />

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
               <Typography>Total: {formatTotal(quantity * selectedItems.currentAmount)}</Typography>
            </Stack>

            <Box style={{ textAlign: 'center', marginTop: '18px' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}
