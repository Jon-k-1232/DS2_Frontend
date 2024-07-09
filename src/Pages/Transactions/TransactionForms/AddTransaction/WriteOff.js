import React, { useState, useContext } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import InitialSelectionOptions from './FormSubComponents/InitialSelectionOptions';
import { postNewWriteOff } from '../../../../Services/ApiCalls/PostCalls';
import WriteOffOptions from './FormSubComponents/WriteOffOptions';
import { formObjectForWriteOffPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import InformationDialog from '../../../../Components/Dialogs/InformationDialog';
import { formatTotal } from '../../../../Services/SharedFunctions';
import InvoiceDropWithInvoiceAmounts from '../../../../Components/InitialSelectionOptions/InitialSelectionForms/InvoiceDropWithInvoiceAmounts';
import JobDropWithCurrentCycleJobAmount from '../../../../Components/InitialSelectionOptions/InitialSelectionForms/JobDropWithCurrentCycleJobAmount';

const initialState = {
   selectedCustomer: null,
   selectedInvoice: null,
   selectedJob: null,
   selectedTeamMember: null,
   writeoffReason: '',
   selectedDate: dayjs(),
   unitCost: 0,
   quantity: 1
};

export default function WriteOff({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const { unitCost, quantity } = selectedItems;

   const handleSubmit = async () => {
      const dataToPost = formObjectForWriteOffPost(selectedItems, loggedInUser);
      const postedItem = await postNewWriteOff(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, writeOffsList: postedItem.writeOffsList, invoicesList: postedItem.invoicesList });
      }
   };

   return (
      <>
         <Box sx={{ display: 'grid', gap: 3 }}>
            <InformationDialog dialogText={helpText} dialogTitle='Write Off Help' toolTipText={'Info'} buttonLocation={{ position: 'absolute', top: '1em', right: '1em', cursor: 'pointer' }} />

            <InitialSelectionOptions
               customerData={customerData}
               setCustomerData={data => setCustomerData(data)}
               selectedItems={selectedItems}
               setSelectedItems={data => setSelectedItems(data)}
               initialState={initialState}
               page='WriteOff'
            >
               <InvoiceDropWithInvoiceAmounts
                  customerData={customerData}
                  selectedItems={selectedItems}
                  setSelectedItems={data => setSelectedItems(data)}
                  dropDownPlaceholderText={'Select Prior Invoice'}
                  helperText={'For previously invoiced amounts, select an invoice with an outstanding invoice.'}
               />
               <JobDropWithCurrentCycleJobAmount
                  customerData={customerData}
                  selectedItems={selectedItems}
                  setSelectedItems={data => setSelectedItems(data)}
                  dropDownPlaceholderText={'Select Current Cycle Job'}
                  helperText={'For not yet invoiced amounts, select a job with an outstanding invoice.'}
               />
            </InitialSelectionOptions>

            <WriteOffOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

            <Typography>Total: {formatTotal(quantity * unitCost)}</Typography>

            <Box style={{ textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}

const helpText = [
   'Adjustments are not currently supported.',
   'If you need to adjust a current transaction, please edit or delete the transaction directly from the transactions list.',
   'You can either write off a portion or the entire amount of a job as long as the job has an outstanding amount for the current billing cycle.',
   'Definition of a Write Off: The inability to collect payment from a customer for a job that has been completed.',
   'When writing off a prior amount (an invoice) you need to include the invoice number in the reason field.',
   'An invoice write off will always show on the bill and be visible to the customer.',
   `'Reasons' will be visible to the customer on the bill.`
];
