import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Typography, Alert, Stack, TextField } from '@mui/material';
import dayjs from 'dayjs';
import InitialSelectionOptions from './FormSubComponents/InitialSelectionOptions';
import PaymentOptions from './FormSubComponents/PaymentOptions';
import { postNewPayment } from '../../../../Services/ApiCalls/PostCalls';
import { formObjectForPaymentPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { fetchCustomerProfileInformation } from '../../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../../App';
import InvoiceConfirmation from './FormSubComponents/InvoiceConfirmation';
import InformationDialog from '../../../../Components/Dialogs/InformationDialog';
import { formatTotal } from '../../../../Services/SharedFunctions';

const initialState = {
   selectedCustomer: null,
   selectedInvoice: null,
   selectedJob: null,
   selectedTeamMember: null,
   selectedRetainer: null,
   detailedJobDescription: '',
   selectedDate: dayjs(),
   isTransactionBillable: true,
   unitCost: 0,
   quantity: 1,
   formOfPayment: null,
   paymentReferenceNumber: '',
   foundInvoiceID: null,
   note: ''
};

export default function Payment({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);
   const [customerProfileData, setCustomerProfileData] = useState([]);

   const { unitCost, quantity, selectedCustomer, note } = selectedItems;

   useEffect(() => {
      if (selectedCustomer) {
         const fetchCustomerData = async () => {
            const customerInfo = await fetchCustomerProfileInformation(accountID, userID, selectedCustomer.customer_id, token);
            setCustomerProfileData({ ...customerInfo });

            // Auto select the user
            const selectedUserObject = customerData.teamMembersList.activeUserData.activeUsers.find(user => user.user_id === userID);
            setSelectedItems({ ...selectedItems, selectedTeamMember: selectedUserObject });
         };
         fetchCustomerData();
      }
      // eslint-disable-next-line
   }, [selectedCustomer]);

   const handleSubmit = async () => {
      const dataToPost = formObjectForPaymentPost(selectedItems, loggedInUser);
      const postedItem = await postNewPayment(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, paymentsList: postedItem.paymentsList, invoicesList: postedItem.invoicesList, accountRetainersList: postedItem.accountRetainersList });
      }
   };

   return (
      <>
         <Box sx={{ display: 'flex' }}>
            <Box sx={{ flex: '1', marginRight: '20px' }}>
               <InformationDialog dialogText={helpText} dialogTitle='Payment Help' toolTipText={'Info'} buttonLocation={{ position: 'absolute', top: '1em', right: '1em', cursor: 'pointer' }} />

               <InitialSelectionOptions
                  customerData={customerData}
                  selectedItems={selectedItems}
                  setSelectedItems={data => setSelectedItems(data)}
                  customerProfileData={customerProfileData}
                  initialState={initialState}
                  page='Payment'
               />

               <InvoiceConfirmation customerProfileData={customerProfileData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

               <PaymentOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

               <Stack>
                  <TextField sx={{ width: '350px' }} value={note} variant='standard' label='Optional Note' onChange={e => setSelectedItems({ ...selectedItems, note: e.target.value })} />
               </Stack>

               <Stack spacing={2}>
                  <Typography>Total: {formatTotal(quantity * unitCost)}</Typography>
               </Stack>

               <Box style={{ textAlign: 'center', marginTop: '18px', width: '350px' }}>
                  <Button onClick={handleSubmit}>Submit</Button>

                  {postStatus && (
                     <Box>
                        <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>
                     </Box>
                  )}
               </Box>
            </Box>
         </Box>
      </>
   );
}

const helpText = [
   `If you need to make a payment for a specific job and not the entire invoice, select the customer, invoice, and job. The Job dropdown will update based on the selected invoice. Note that only the outstanding bills for a customer will appear in the invoice dropdown.`,
   `Once a valid invoice is selected, update the invoice number field if it hasn't been updated already. This will search for invoices for this client and confirm that a valid invoice exists. To confirm, you will manually input the invoice number a second time in the invoice confirmation field.`,
   `If no invoice number is present, the system will automatically search for past-due invoices on the server. The payment will be applied to each invoice, from the oldest to the newest, until the payment amount is exhausted. However, it is not best practice to leave the invoice number field blank, so please select an invoice number.`,
   `If no invoices exist for the customer, the payment will be placed into "Retainers and Pre-payments" for later use. Note that a payment will need to be manually applied once an invoice is created or transactions are present for the customer.`,
   `If possible, for ease of tracking payments to a job, you may make a partial payment on an invoice and also reference the job. Doing so will significantly ease the tracking of payments for jobs and improve analytical data.`
];
