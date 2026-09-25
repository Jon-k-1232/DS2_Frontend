import SentInvoiceNotice from '../../../../Components/SentInvoiceNotice';
import useFinancialSubmit from '../AddTransaction/FormSubComponents/useFinancialSubmit';
import React, { useState, useContext, useEffect } from 'react';
import { Box, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableRow, Paper } from '@mui/material';
import { deleteChargeOrTimeTransaction } from '../../../../Services/ApiCalls/DeleteCalls';
import { formObjectForTransactionPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const initialState = {
   transactionID: null,
   selectedDate: dayjs(),
   selectedCustomer: null,
   selectedJob: null,
   selectedTeamMember: null,
   detailedJobDescription: '',
   isTransactionBillable: null,
   isInAdditionToMonthlyCharge: null,
   unitCost: '',
   quantity: 1,
   transactionType: '',
   totalTransaction: '',
   customerInvoicesID: null,
   selectedRetainerID: null
};

export default function DeleteTimeOrCharge({ customerData, setCustomerData, transactionData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [selectedItems, setSelectedItems] = useState(initialState);
   const [postStatus, setPostStatus] = useState(null);
   const { submitting, submit } = useFinancialSubmit(setPostStatus);
   const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

   const {
      quantity,
      unitCost,
      transactionType,
      selectedDate,
      selectedCustomer,
      selectedJob,
      selectedTeamMember,
      detailedJobDescription,
      isTransactionBillable,
      isInAdditionToMonthlyCharge,
      totalTransaction
   } = selectedItems || {};

   const activeCustomers = customerData?.customersList?.activeCustomerData?.activeCustomers || [];
   const activeUsers = customerData?.teamMembersList?.activeUserData?.activeUsers || [];
   const activeJobs = customerData?.accountJobsList?.activeJobData?.activeJobs || [];

   const {
      transaction_id,
      customer_id,
      customer_job_id,
      detailed_work_description,
      is_excess_to_subscription,
      is_transaction_billable,
      logged_for_user_id,
      unit_cost,
      quantity: db_quantity,
      transaction_date,
      transaction_type,
      total_transaction,
      customer_invoice_id,
      retainer_id
   } = transactionData || {};

   useEffect(() => {
      if (transaction_id && !transactionData.sent_locked) {
         setSelectedItems({
            ...initialState,
            transactionID: transaction_id,
            // The record can arrive before the shared lookups. Its saved IDs
            // remain authoritative, including for inactive customers/jobs.
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id) || { customer_id, display_name: transactionData.customer_name },
            selectedJob: activeJobs.find(job => job.customer_job_id === customer_job_id) || { customer_job_id },
            selectedTeamMember: activeUsers.find(user => user.user_id === logged_for_user_id) || { user_id: logged_for_user_id },
            isTransactionBillable: is_transaction_billable,
            detailedJobDescription: detailed_work_description,
            isInAdditionToMonthlyCharge: is_excess_to_subscription,
            unitCost: unit_cost,
            // Without this the page shows initialState's quantity (1) for every transaction.
            quantity: db_quantity ?? 1,
            totalTransaction: total_transaction,
            selectedDate: dayjs(transaction_date),
            transactionType: transaction_type,
            customerInvoicesID: customer_invoice_id,
            selectedRetainerID: retainer_id || null
         });
      }
      // eslint-disable-next-line
   }, [transactionData, customerData]);

   const handleSubmit = () => {
      setIsConfirmationOpen(true);
   };

   const handleConfirmation = () => submit(async () => {
      setIsConfirmationOpen(false);
      const dataToPost = formObjectForTransactionPost(selectedItems, loggedInUser);
      const postedItem = await deleteChargeOrTimeTransaction(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, transactionsList: postedItem.transactionsList });
         // A retainer-sync warning needs to actually be readable — the
         // immediate navigate below used to yank the user to the list view
         // in the same tick, before they could ever see it.
         if (postedItem.warning) {
            setTimeout(() => {
               setPostStatus(null);
               navigate('/transactions/customerTransactions');
            }, 4000);
         } else {
            setTimeout(() => setPostStatus(null), 2000);
            navigate('/transactions/customerTransactions');
         }
      }
   });

   const handleCancel = () => {
      setIsConfirmationOpen(false);
   };

   if (transactionData?.sent_locked) return <SentInvoiceNotice row={transactionData} />;

   return (
      <>
         <Box style={{ width: 'fit-content' }}>
            <TableContainer component={Paper}>
               <Table>
                  <TableBody>
                     <TableRow>
                        <TableCell>Selected Date:</TableCell>
                        <TableCell>{dayjs(selectedDate).format('MMMM DD, YYYY')}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Customer Name:</TableCell>
                        <TableCell>{selectedCustomer?.display_name || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Job Description:</TableCell>
                        <TableCell>{selectedJob?.job_description || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Detailed Job Description:</TableCell>
                        <TableCell>{detailedJobDescription}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Team Member:</TableCell>
                        <TableCell>{selectedTeamMember?.display_name || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Is In Addition to Monthly Charge:</TableCell>
                        <TableCell>{isInAdditionToMonthlyCharge !== null ? String(isInAdditionToMonthlyCharge) : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Is Transaction Billable:</TableCell>
                        <TableCell>{isTransactionBillable !== null ? String(isTransactionBillable) : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Transaction Type:</TableCell>
                        <TableCell>{transactionType}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Quantity:</TableCell>
                        <TableCell>{quantity}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Unit Cost:</TableCell>
                        <TableCell>{unitCost}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Total Transaction:</TableCell>
                        <TableCell>{totalTransaction}</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </TableContainer>

            <Box style={{ margin: '10px', textAlign: 'center' }}>
               <Button onClick={handleSubmit} disabled={submitting}>Delete Transaction</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
               {postStatus?.warning && (
                  <Alert severity='info' sx={{ mt: 1 }}>
                     {postStatus.warning}
                  </Alert>
               )}
            </Box>

            <Dialog open={isConfirmationOpen} onClose={handleCancel}>
               <DialogTitle>Confirmation</DialogTitle>
               <DialogContent>Are you sure you want to delete?</DialogContent>
               <DialogActions>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button onClick={handleConfirmation} disabled={submitting} color='error'>
                     Delete
                  </Button>
               </DialogActions>
            </Dialog>
         </Box>
      </>
   );
}
