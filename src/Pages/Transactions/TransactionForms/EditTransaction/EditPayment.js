import React, { useState, useEffect, useContext } from 'react';
import { Box, Alert, Button, TextField, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import PaymentOptions from '../AddTransaction/FormSubComponents/PaymentOptions';
import InitialSelectionOptions from '../AddTransaction/FormSubComponents/InitialSelectionOptions';
import InvoiceConfirmation from '../AddTransaction/FormSubComponents/InvoiceConfirmation';
import { formObjectForPaymentPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { putEditPayment } from '../../../../Services/ApiCalls/PutCalls';
import { formatTotal } from '../../../../Services/SharedFunctions';

const initialState = {
   selectedDate: dayjs(),
   selectedCustomer: null,
   selectedInvoice: null,
   selectedJob: null,
   selectedRetainer: null,
   selectedTeamMember: null,
   isTransactionBillable: true,
   unitCost: 0,
   quantity: 1,
   formOfPayment: null,
   paymentReferenceNumber: '',
   invoiceNumber: '',
   foundInvoiceID: null,
   note: ''
};

export default function EditPayment({ customerData, setCustomerData, paymentData, customerProfileData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const {
      customersList: { activeCustomerData: { activeCustomers } = [] } = [],
      teamMembersList: { activeUserData: { activeUsers } = [] } = [],
      customerRetainerData: { customerRetainers } = [],
      customerJobData: { customerJobs } = [],
      customerInvoiceData: { customerInvoices } = []
   } = { ...customerData, ...customerProfileData };

   const { unitCost, quantity, invoiceNumber } = selectedItems;

   const {
      account_id,
      customer_id,
      customer_invoice_id,
      customer_job_id,
      form_of_payment,
      is_transaction_billable,
      note,
      payment_amount,
      payment_date,
      payment_id,
      payment_reference_number,
      retainer_id,
      created_by_user_id
   } = paymentData || {};

   useEffect(() => {
      if (paymentData && Object.keys(paymentData).length) {
         const invoiceObject = customerInvoices && customerInvoices.find(invoice => invoice.customer_invoice_id === customer_invoice_id);
         const invoiceNumber = invoiceObject?.invoice_number;

         setSelectedItems({
            ...selectedItems,
            accountID: account_id,
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id),
            selectedInvoice: invoiceObject,
            selectedRetainer: customerRetainers.find(retainer => retainer.retainer_id === retainer_id),
            selectedJob: customerJobs.find(job => job.customer_job_id === customer_job_id),
            selectedTeamMember: activeUsers.find(user => user.user_id === created_by_user_id),
            invoiceNumber: invoiceNumber,
            foundInvoiceID: invoiceNumber,
            formOfPayment: form_of_payment,
            isTransactionBillable: is_transaction_billable,
            note: note,
            unitCost: payment_amount,
            selectedDate: dayjs(payment_date),
            paymentID: payment_id,
            paymentReferenceNumber: payment_reference_number
         });
      }
      // eslint-disable-next-line
   }, [paymentData]);

   const handleSubmit = async () => {
      const dataToPost = formObjectForPaymentPost(selectedItems, loggedInUser);
      const postedItem = await putEditPayment(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, paymentsList: postedItem.paymentsList });
         navigate('/transactions/customerPayments');
      }
   };

   return (
      <>
         <Box style={{ width: 'fit-content' }}>
            <Box sx={{ flex: '1', marginRight: '20px' }}>
               <Box sx={{ display: 'grid', gap: 3 }}></Box>
               <InitialSelectionOptions
                  customerData={customerData}
                  selectedItems={selectedItems}
                  setSelectedItems={data => setSelectedItems(data)}
                  customerProfileData={customerProfileData}
                  page='Payment'
               />

               <InvoiceConfirmation
                  customerProfileData={customerProfileData}
                  selectedItems={selectedItems}
                  setSelectedItems={data => setSelectedItems(data)}
                  invoiceConfirmationOverride={invoiceNumber}
               />

               <PaymentOptions selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

               <Stack>
                  <TextField sx={{ width: '350px' }} value={note} variant='standard' label='Optional Note' onChange={e => setSelectedItems({ ...selectedItems, note: e.target.value })} />
               </Stack>

               <Stack sx={{ marginTop: '10px' }}>
                  <Typography>Total: {formatTotal(quantity * unitCost)}</Typography>
               </Stack>

               <Box style={{ textAlign: 'center', marginTop: '18px' }}>
                  <Button onClick={handleSubmit}>Submit</Button>
                  {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
               </Box>
            </Box>
         </Box>
      </>
   );
}
