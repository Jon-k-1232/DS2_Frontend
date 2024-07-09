import React, { useState, useContext, useEffect } from 'react';
import { Box, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import { deletePayment } from '../../../../Services/ApiCalls/DeleteCalls';
import { formObjectForPaymentPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const initialState = {
   paymentID: null,
   paymentDate: dayjs(),
   selectedCustomer: null,
   formOfPayment: '',
   isTransactionBillable: null,
   paymentAmount: '',
   paymentReferenceNumber: '',
   invoiceNumber: '',
   foundInvoiceID: null
};

export default function DeletePayment({ customerData, setCustomerData, paymentData, customerProfileData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [selectedItems, setSelectedItems] = useState(initialState);
   const [postStatus, setPostStatus] = useState(null);
   const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

   const { customersList: { activeCustomerData: { activeCustomers } = [] } = [] } = { ...customerData };

   const { paymentAmount, formOfPayment, isTransactionBillable, paymentDate, selectedCustomer, paymentReferenceNumber, invoiceNumber } = selectedItems || {};

   const { customer_id, form_of_payment, is_transaction_billable, payment_amount, payment_date, payment_id, payment_reference_number, retainer_id, customer_invoice_id } = paymentData || {};

   useEffect(() => {
      if (paymentData && Object.keys(paymentData).length) {
         // This block of code finds matching invoices based on user input to confirm and invoice exists.
         const { customerInvoiceData = [] } = customerProfileData?.customerInvoiceData || {};
         const invoiceObject = customerInvoiceData.find(invoice => invoice.customer_invoice_id === customer_invoice_id);
         const invoiceNumber = invoiceObject?.invoice_number;

         setSelectedItems({
            ...selectedItems,
            paymentID: payment_id,
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id),
            formOfPayment: form_of_payment,
            isTransactionBillable: is_transaction_billable,
            paymentAmount: payment_amount,
            paymentDate: dayjs(payment_date),
            paymentReferenceNumber: payment_reference_number,
            retainerID: retainer_id,
            invoiceNumber,
            foundInvoiceID: customer_invoice_id
         });
      }
      // eslint-disable-next-line
   }, [paymentData]);

   const handleSubmit = () => {
      setIsConfirmationOpen(true);
   };

   const handleConfirmation = async () => {
      setIsConfirmationOpen(false);
      const dataToPost = formObjectForPaymentPost(selectedItems, loggedInUser);
      const postedItem = await deletePayment(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, paymentsList: postedItem.paymentsList, invoicesList: postedItem.invoicesList });
         navigate('/transactions/customerPayments');
      }
   };

   const handleCancel = () => {
      setIsConfirmationOpen(false);
   };

   return (
      <>
         <Box style={{ width: 'fit-content' }}>
            <TableContainer component={Paper}>
               <Table>
                  <TableBody>
                     <TableRow>
                        <TableCell>Payment Date:</TableCell>
                        <TableCell>{paymentDate ? dayjs(paymentDate).format('MMMM DD, YYYY') : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Customer Name:</TableCell>
                        <TableCell>{selectedCustomer?.display_name || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Is Transaction Billable:</TableCell>
                        <TableCell>{isTransactionBillable !== null ? String(isTransactionBillable) : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Payment on Invoice:</TableCell>
                        <TableCell>{invoiceNumber}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Form of Payment:</TableCell>
                        <TableCell>{formOfPayment || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Payment Reference Number:</TableCell>
                        <TableCell>{paymentReferenceNumber || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Payment Amount:</TableCell>
                        <TableCell>{paymentAmount || 'N/A'}</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </TableContainer>

            <Box style={{ margin: '10px', textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Delete Payment</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>

            <Dialog open={isConfirmationOpen} onClose={handleCancel}>
               <DialogTitle>Confirmation</DialogTitle>
               <DialogContent>Are you sure you want to delete?</DialogContent>
               <DialogActions>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button onClick={handleConfirmation} color='error'>
                     Delete
                  </Button>
               </DialogActions>
            </Dialog>
         </Box>
      </>
   );
}
