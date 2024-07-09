import React, { useState, useContext } from 'react';
import { Button, Typography, Alert, Box } from '@mui/material';
import dayjs from 'dayjs';
import InitialSelectionOptions from './FormSubComponents/InitialSelectionOptions';
import TimeOptions from './FormSubComponents/TimeOptions';
import { formObjectForTransactionPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postTransaction } from '../../../../Services/ApiCalls/PostCalls';
import { context } from '../../../../App';
import InformationDialog from '../../../../Components/Dialogs/InformationDialog';
import RetainerSelection from './FormSubComponents/RetainerSelection';

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
   transactionType: 'Time',
   selectedRetainer: null
};

export default function Time({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = useContext(context).loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);
   // Destructure selectedItems
   const { unitCost, quantity } = selectedItems;

   const handleSubmit = async () => {
      const dataToPost = formObjectForTransactionPost(selectedItems, loggedInUser);
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
         <InformationDialog dialogText={dialogText} dialogTitle='Time Transaction Help' toolTipText={'Info'} buttonLocation={{ position: 'absolute', top: '1em', right: '1em', cursor: 'pointer' }} />

         <InitialSelectionOptions
            customerData={customerData}
            setCustomerData={data => setCustomerData(data)}
            selectedItems={selectedItems}
            setSelectedItems={data => setSelectedItems(data)}
            initialState={initialState}
         />

         <RetainerSelection selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

         <TimeOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

         <Typography variant='body1'>
            Total:
            {(quantity * unitCost)
               .toFixed(2)
               .toString()
               .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
         </Typography>

         <Box style={{ textAlign: 'center' }}>
            <Button onClick={handleSubmit}>Submit</Button>
            {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         </Box>
      </>
   );
}

const dialogText = [
   `To input time, select a customer, job, and team member first. The dollar amount and time are calculated based on the team member's billing rate.`,
   'Work completed on the job will not appear on the bill. This is used to provide additional context of what the job entailed in one sentence length.'
];
