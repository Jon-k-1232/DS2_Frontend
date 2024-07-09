import React, { useState, useContext, useEffect } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Alert } from '@mui/material';
import { deleteWriteOff } from '../../../../Services/ApiCalls/DeleteCalls';
import { formObjectForWriteOffPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const initialState = {
   writeoffID: null,
   writeoffDate: dayjs(),
   writeoffAmount: '',
   customerID: null,
   customerTransactionID: null,
   customerInvoiceID: null,
   customerJobID: null
};

export default function DeleteWriteOff({ customerData, setCustomerData, writeOffData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [selectedItems, setSelectedItems] = useState(initialState);
   const [postStatus, setPostStatus] = useState(null);
   const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

   const { writeoffID, writeoffDate, writeoffAmount, customerID, customerTransactionID, customerInvoiceID, customerJobID } = selectedItems || {};

   const { customersList: { activeCustomerData: { activeCustomers } = [] } = [], accountJobsList: { activeJobData: { activeJobs } = [] } = [] } = { ...customerData };

   const { writeoff_id, writeoff_date, writeoff_amount, transaction_type, customer_id, transaction_id, customer_invoice_id, customer_job_id } = writeOffData || {};

   useEffect(() => {
      if (writeOffData) {
         setSelectedItems({
            ...selectedItems,
            writeoffID: writeoff_id,
            writeoffDate: dayjs(writeoff_date),
            writeoffAmount: writeoff_amount,
            transactionType: transaction_type,
            customerID: activeCustomers.find(customer => customer.customer_id === customer_id),
            customerTransactionID: transaction_id,
            customerInvoiceID: customer_invoice_id,
            customerJobID: activeJobs.find(job => job.customer_job_id === customer_job_id)
         });
      }
      // eslint-disable-next-line
   }, [writeOffData]);

   const handleSubmit = () => {
      setIsConfirmationOpen(true);
   };

   const handleConfirmation = async () => {
      setIsConfirmationOpen(false);
      const dataToPost = formObjectForWriteOffPost(selectedItems, loggedInUser);
      const postedItem = await deleteWriteOff(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, writeOffsList: postedItem.writeOffsList, invoicesList: postedItem.invoicesList });
         navigate('/transactions/customerWriteOffs');
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
                        <TableCell>Write-off ID:</TableCell>
                        <TableCell>{writeoffID}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Date:</TableCell>
                        <TableCell>{writeoffDate ? dayjs(writeoffDate).format('MMMM DD, YYYY') : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Customer ID:</TableCell>
                        <TableCell>{customerID?.display_name || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Transaction ID:</TableCell>
                        <TableCell>{customerTransactionID || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Invoice ID:</TableCell>
                        <TableCell>{customerInvoiceID || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Job ID:</TableCell>
                        <TableCell>{customerJobID?.job_name || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Write-off Amount:</TableCell>
                        <TableCell>{writeoffAmount || 'N/A'}</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </TableContainer>

            <Box style={{ margin: '10px', textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Delete Write-off</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>

            <Dialog open={isConfirmationOpen} onClose={handleCancel}>
               <DialogTitle>Confirmation</DialogTitle>
               <DialogContent>Are you sure you want to delete this write-off?</DialogContent>
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
