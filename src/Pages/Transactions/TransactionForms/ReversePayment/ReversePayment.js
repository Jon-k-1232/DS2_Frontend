import React, { useState, useContext } from 'react';
import { Box, Stack, Typography, TextField, Button, Alert, Paper } from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { context } from '../../../../App';
import { postReversePayment } from '../../../../Services/ApiCalls/PostCalls';

const fmtMoney = v => `$${Math.abs(Number(v || 0)).toFixed(2)}`;

/**
 * NSF / bounced-check reversal. Billed payments are immutable, so this posts a
 * NEW positive payment event that restores the debt on the customer's current
 * invoice — the original and the reversal stay cross-annotated in the ledger.
 */
export default function ReversePayment({ paymentData, customerData, setCustomerData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [reason, setReason] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [postStatus, setPostStatus] = useState(null);

   const hasPayment = paymentData && Object.keys(paymentData).length > 0;
   const alreadyReversed = hasPayment && (paymentData.note || '').includes('[reversed ');
   const isReversalRow = hasPayment && Number(paymentData.payment_amount) >= 0;

   const handleSubmit = async () => {
      if (submitting) return;
      if (!reason.trim()) {
         setPostStatus({ status: 400, message: 'Enter the reversal reason (e.g. "NSF — check #1234 returned").' });
         return;
      }
      setSubmitting(true);
      try {
         const result = await postReversePayment(accountID, userID, { paymentID: paymentData.payment_id, reason: reason.trim() }, token);
         setPostStatus(result);
         if (result.status === 200) {
            // Clear the payments slice so the grid refetches its paginated
            // page on mount — the mutation response carries the full
            // unpaginated list, which the grid can't page.
            setCustomerData({
               ...customerData,
               paymentsList: null,
               invoicesList: result.invoicesList,
               accountRetainersList: result.accountRetainersList
            });
            setTimeout(() => navigate('/transactions/customerPayments'), 2500);
         }
      } catch (error) {
         setPostStatus({ status: 500, message: error.response?.data?.message || error.message || 'An error occurred while reversing the payment.' });
      } finally {
         setSubmitting(false);
      }
   };

   if (!hasPayment) {
      return <Alert severity='info'>Select a payment from the Payments grid first.</Alert>;
   }

   return (
      <Box sx={{ maxWidth: 480 }}>
         <Stack spacing={2}>
            <Typography variant='h6'>Reverse Payment (NSF / bounced check)</Typography>

            <Paper variant='outlined' sx={{ p: 1.5 }}>
               <Typography variant='body2'>
                  Payment #{paymentData.payment_id} — {fmtMoney(paymentData.payment_amount)} {paymentData.form_of_payment || ''}
                  {paymentData.payment_reference_number ? ` #${paymentData.payment_reference_number}` : ''} on{' '}
                  {dayjs(paymentData.payment_date).format('MM/DD/YYYY')}
               </Typography>
               <Typography variant='caption' color='text.secondary'>
                  Reversing restores {fmtMoney(paymentData.payment_amount)} to the customer's current invoice balance. The original payment record is kept and
                  annotated — nothing is deleted.
               </Typography>
            </Paper>

            {alreadyReversed && <Alert severity='warning'>This payment has already been reversed.</Alert>}
            {isReversalRow && <Alert severity='warning'>This entry is itself a reversal and cannot be reversed.</Alert>}

            <TextField
               label='Reason'
               placeholder='NSF — check #1234 returned'
               value={reason}
               onChange={e => setReason(e.target.value)}
               multiline
               minRows={2}
               disabled={alreadyReversed || isReversalRow}
            />

            <Box>
               <Button variant='contained' color='warning' onClick={handleSubmit} disabled={submitting || alreadyReversed || isReversalRow}>
                  {submitting ? 'Reversing…' : 'Reverse Payment'}
               </Button>
            </Box>

            {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         </Stack>
      </Box>
   );
}
