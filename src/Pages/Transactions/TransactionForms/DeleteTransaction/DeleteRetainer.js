import React, { useState, useContext, useEffect } from 'react';
import { Box, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Typography, Divider } from '@mui/material';
import { deleteRetainer } from '../../../../Services/ApiCalls/DeleteCalls';
import { context } from '../../../../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DataGridTable from '../../../../Components/DataGrids/DataGrid';

const initialState = {
   paymentID: null,
   paymentDate: dayjs(),
   selectedCustomer: null,
   formOfPayment: '',
   isTransactionBillable: null,
   paymentAmount: '',
   paymentReferenceNumber: ''
};

export default function DeleteRetainer({ customerData, setCustomerData, retainerData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [selectedItems, setSelectedItems] = useState(initialState);
   const [postStatus, setPostStatus] = useState(null);
   const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
   const [paymentsWithMatchingRetainer, setPaymentsWithMatchingRetainer] = useState({ columns: [], rows: [] });

   const { paymentsList: { activePaymentsData = [] } = [], customersList: { activeCustomerData: { activeCustomers } = [] } = [] } = {
      ...customerData
   };

   const { selectedCustomer, retainerID, typeOfHold, startingAmount, currentAmount, formOfPayment, paymentReferenceNumber, isRetainerActive, createdByUserID } = selectedItems || {};

   const { retainer_id, customer_id, type_of_hold, starting_amount, current_amount, form_of_payment, payment_reference_number, is_retainer_active, created_by_user_id, note } = retainerData || {};

   useEffect(() => {
      if (retainerData && Object.keys(retainerData).length) {
         const paymentRows = activePaymentsData.grid.rows.filter(payment => payment.retainer_id === retainer_id);
         setPaymentsWithMatchingRetainer({ columns: activePaymentsData.grid.columns, rows: paymentRows });

         setSelectedItems({
            ...selectedItems,
            retainerID: retainer_id,
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id),
            typeOfHold: type_of_hold,
            startingAmount: starting_amount,
            currentAmount: current_amount,
            formOfPayment: form_of_payment,
            paymentReferenceNumber: payment_reference_number,
            isRetainerActive: is_retainer_active,
            createdByUserID: created_by_user_id,
            note: note
         });
      }
      // eslint-disable-next-line
   }, [retainerData]);

   const handleSubmit = () => {
      setIsConfirmationOpen(true);
   };

   const handleConfirmation = async () => {
      setIsConfirmationOpen(false);
      const postedItem = await deleteRetainer(retainerID, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, accountRetainersList: postedItem.accountRetainersList });
         navigate('/transactions/customerRetainers');
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
                        <TableCell>Customer:</TableCell>
                        <TableCell>{selectedCustomer ? selectedCustomer.display_name : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Type of Hold:</TableCell>
                        <TableCell>{typeOfHold || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Starting Amount:</TableCell>
                        <TableCell>{startingAmount || 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Current Amount:</TableCell>
                        <TableCell>{currentAmount || 'N/A'}</TableCell>
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
                        <TableCell>Is Retainer Active:</TableCell>
                        <TableCell>{isRetainerActive !== null ? String(isRetainerActive) : 'N/A'}</TableCell>
                     </TableRow>
                     <TableRow>
                        <TableCell>Created By User ID:</TableCell>
                        <TableCell>{createdByUserID || 'N/A'}</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </TableContainer>

            <Box style={{ margin: '10px', textAlign: 'center' }}>
               <Button disabled={paymentsWithMatchingRetainer.rows.length > 0} onClick={handleSubmit}>
                  Delete Retainer
               </Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>

            {paymentsWithMatchingRetainer.rows.length > 0 && (
               <Box style={{ width: '100vh' }}>
                  <Typography variant='h6' style={{ color: 'red' }}>
                     Before deletion, please remove the following items:
                  </Typography>

                  <Divider />

                  <Box style={{ margin: '20px 0px' }}>
                     <DataGridTable
                        title='Linked Transactions'
                        tableData={paymentsWithMatchingRetainer}
                        passedHeight='350px'
                        enableSingleRowClick
                        routeToPass={'/transactions/customerPayments/deletePayment'}
                     />
                  </Box>
               </Box>
            )}

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
