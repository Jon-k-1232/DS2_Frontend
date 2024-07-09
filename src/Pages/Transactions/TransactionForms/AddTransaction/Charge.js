import React, { useState, useContext } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import InitialSelectionOptions from './FormSubComponents/InitialSelectionOptions';
import RetainerSelection from './FormSubComponents/RetainerSelection';
import { postTransaction } from '../../../../Services/ApiCalls/PostCalls';
import ChargeOptions from './FormSubComponents/ChargeOptions';
import { formObjectForTransactionPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import { formatTotal } from '../../../../Services/SharedFunctions';

const initialState = {
   selectedCustomer: null,
   selectedJob: null,
   selectedTeamMember: null,
   selectedGeneralWorkDescription: null,
   detailedJobDescription: '',
   selectedDate: dayjs(),
   isTransactionBillable: true,
   isInAdditionToMonthlyCharge: false,
   unitCost: 0,
   quantity: 1,
   transactionType: 'Charge',
   selectedRetainer: null
};

export default function Charge({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);
   const { unitCost, quantity } = selectedItems;

   const handleSubmit = async () => {
      const dataToPost = formObjectForTransactionPost(selectedItems, loggedInUser, 'Charge');
      const postedItem = await postTransaction(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({
            ...customerData,
            transactionsList: postedItem.transactionsList,
            accountRetainersList: postedItem.accountRetainersList,
            accountJobsList: postedItem.accountJobsList,
            paymentsList: postedItem.paymentsList
         });
      }
   };

   return (
      <>
         <InitialSelectionOptions
            customerData={customerData}
            setCustomerData={data => setCustomerData(data)}
            selectedItems={selectedItems}
            setSelectedItems={data => setSelectedItems(data)}
            initialState={initialState}
         />

         <RetainerSelection selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

         <ChargeOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

         <Typography variant='body1'>Total: {formatTotal(quantity * unitCost)}</Typography>

         <Box style={{ textAlign: 'center' }}>
            <Button onClick={handleSubmit}>Submit</Button>
            {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         </Box>
      </>
   );
}
