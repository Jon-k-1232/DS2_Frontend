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
   const [submitting, setSubmitting] = useState(false);
   const [selectedItems, setSelectedItems] = useState(initialState);
   const [customerProfileData, setCustomerProfileData] = useState([]);

   const { unitCost, quantity, selectedCustomer, note } = selectedItems;

   useEffect(() => {
      if (selectedCustomer) {
         const fetchCustomerData = async () => {
            const customerInfo = await fetchCustomerProfileInformation(accountID, userID, selectedCustomer.customer_id, token);
            setCustomerProfileData({ ...customerInfo });

            // Auto select the user. Functional update — the await above means any
            // field the user touched in the meantime would be clobbered by a
            // stale object spread.
            const selectedUserObject = customerData.teamMembersList.activeUserData.activeUsers.find(user => user.user_id === userID);
            setSelectedItems(prev => ({ ...prev, selectedTeamMember: selectedUserObject }));
         };
         fetchCustomerData();
      }
      // eslint-disable-next-line
   }, [selectedCustomer]);

   const validatePayment = () => {
      if (!selectedItems.selectedCustomer) return 'Select a customer.';
      if (!selectedItems.selectedInvoice) return 'Select the invoice this payment applies to.';
      if (!selectedItems.formOfPayment) return 'Select a form of payment.';
      if (!Math.abs(Number(selectedItems.unitCost))) return 'Enter a payment amount.';
      if ((selectedItems.formOfPayment === 'Retainer' || selectedItems.formOfPayment === 'Prepayment') && !selectedItems.selectedRetainer)
         return 'Select the retainer/prepayment funding this payment.';
      return null;
   };

   const handleSubmit = async () => {
      if (submitting) return;
      const validationError = validatePayment();
      if (validationError) {
         setPostStatus({ status: 400, message: validationError });
         return;
      }

      setSubmitting(true);
      try {
         const dataToPost = formObjectForPaymentPost(selectedItems, loggedInUser);
         const postedItem = await postNewPayment(dataToPost, accountID, userID, token);

         setPostStatus(postedItem);

         if (postedItem.status === 200) {
            setTimeout(() => setPostStatus(null), 6000);
            setSelectedItems(initialState);
            setCustomerData({ ...customerData, paymentsList: postedItem.paymentsList, invoicesList: postedItem.invoicesList, accountRetainersList: postedItem.accountRetainersList });
            try {
               window.dispatchEvent(new CustomEvent('payments:updated'));
            } catch (e) {
               // no-op
            }
         }
      } catch (error) {
         setPostStatus({ status: 500, message: error.response?.data?.message || error.message || 'An error occurred while creating the payment.' });
      } finally {
         setSubmitting(false);
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
                  <TextField sx={{ width: '100%', maxWidth: '350px' }} value={note} variant='standard' label='Optional Note' onChange={e => setSelectedItems({ ...selectedItems, note: e.target.value })} />
               </Stack>

               <Stack spacing={2}>
                  <Typography>Total: {formatTotal(quantity * unitCost)}</Typography>
               </Stack>

               <Box style={{ textAlign: 'center', marginTop: '18px', width: '100%', maxWidth: '350px' }}>
                  <Button onClick={handleSubmit} disabled={submitting}>
                     {submitting ? 'Submitting…' : 'Submit'}
                  </Button>

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
   `Select the customer, then the invoice the payment applies to. The dropdown shows only the customer's CURRENT statement — the newest invoice carries the full balance owed (older invoices were rolled into it), so there is normally exactly one to pick.`,
   `If the check references an older invoice number, still select the current invoice — the system applies the money to the current balance and records the referenced invoice number on the payment automatically.`,
   `The invoice number fills in automatically from your selection. Re-type it in the confirmation field to confirm you are applying the payment to the right statement.`,
   `A payment cannot exceed the remaining balance on the current invoice. If the customer paid more than they owe, or has no open invoice, record the funds as a Retainer/Prepayment from the Retainers page and apply it to a future bill.`,
   `Optionally select a job to make a job-specific payment — this eases payment tracking per job and improves analytics.`
];
