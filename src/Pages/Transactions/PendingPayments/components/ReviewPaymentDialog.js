import React, { useState, useEffect, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button, TextField, Autocomplete, Stack, Alert, Typography, Divider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import { postNewPayment } from '../../../../Services/ApiCalls/PostCalls';
import { approvePendingPayment } from '../../../../Services/ApiCalls/PendingPaymentsCalls';
import { fetchCustomers, fetchCustomerProfileInformation } from '../../../../Services/ApiCalls/FetchCalls';
import { formObjectForPaymentPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { getOpenInvoicesForPayment } from '../../../../Services/SharedFunctions';
import PaymentPdfPreview from './PaymentPdfPreview';

const PAYMENT_METHODS = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'ACH', 'Other'];

export default function ReviewPaymentDialog({ open, onClose, pendingPayment, customerData, setCustomerData, onApproved }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [customers, setCustomers] = useState([]);
   const [selectedCustomer, setSelectedCustomer] = useState(null);
   const [selectedInvoice, setSelectedInvoice] = useState(null);
   const [selectedJob, setSelectedJob] = useState(null);
   const [paymentDate, setPaymentDate] = useState(dayjs());
   const [paymentAmount, setPaymentAmount] = useState('');
   const [formOfPayment, setFormOfPayment] = useState('Check');
   const [referenceNumber, setReferenceNumber] = useState('');
   const [note, setNote] = useState('');
   const [invoiceNumber, setInvoiceNumber] = useState('');
   const [customerInvoices, setCustomerInvoices] = useState([]);
   const [submitting, setSubmitting] = useState(false);
   const [feedback, setFeedback] = useState(null);

   // Load all customers when dialog opens
   useEffect(() => {
      if (!open || !accountID || !userID || !token) return;
      const loadCustomers = async () => {
         try {
            const response = await fetchCustomers(accountID, userID, token, 1, 1000);
            const list = response?.customersList?.activeCustomerData?.activeCustomers || [];
            setCustomers(list);
         } catch (err) {
            console.error('Error loading customers:', err);
         }
      };
      loadCustomers();
   }, [open, accountID, userID, token]);

   // Pre-fill form when pending payment changes
   useEffect(() => {
      if (!pendingPayment || !open) return;

      const amount = pendingPayment.payment_amount ? Math.abs(Number(pendingPayment.payment_amount)) : '';
      setPaymentAmount(amount);
      setPaymentDate(pendingPayment.payment_date ? dayjs(pendingPayment.payment_date) : dayjs());
      setFormOfPayment(pendingPayment.form_of_payment || 'Check');
      setReferenceNumber(pendingPayment.payment_reference_number || '');
      setNote(pendingPayment.note || '');
      setInvoiceNumber(pendingPayment.customer_invoice_id || '');
      setSelectedInvoice(null);
      setSelectedJob(null);
      setFeedback(null);

      // Try to match customer
      const matchedId = pendingPayment.matched_customer_id || pendingPayment.customer_id;
      if (matchedId) {
         const matched = customers.find(c => c.customer_id === Number(matchedId));
         setSelectedCustomer(matched || null);
      } else {
         setSelectedCustomer(null);
      }
   }, [pendingPayment, open, customers]);

   // Load customer invoices when customer changes
   useEffect(() => {
      if (!selectedCustomer) {
         setCustomerInvoices([]);
         return;
      }
      const loadInvoices = async () => {
         try {
            const profileData = await fetchCustomerProfileInformation(accountID, userID, selectedCustomer.customer_id, token);
            const invoices = profileData?.customerInvoiceData?.customerInvoices || [];
            // Current chain(s) only — listing every row with a remaining balance
            // offered absorbed chains and intermediate snapshots with stale
            // amounts, and payments tagged to those never reached a bill.
            const outstandingInvoices = getOpenInvoicesForPayment(invoices);
            setCustomerInvoices(outstandingInvoices);

            // Auto-match invoice if pending payment has one
            if (invoiceNumber) {
               const matchingInv = outstandingInvoices.find(inv => String(inv.invoice_number) === String(invoiceNumber) || String(inv.customer_invoice_id) === String(invoiceNumber));
               if (matchingInv) setSelectedInvoice(matchingInv);
            }
         } catch (err) {
            console.error('Error loading customer invoices:', err);
         }
      };
      loadInvoices();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedCustomer]);

   const handleSubmit = async () => {
      if (!selectedCustomer) {
         setFeedback({ type: 'error', message: 'Please select a customer.' });
         return;
      }
      if (!selectedInvoice) {
         setFeedback({ type: 'error', message: 'Please select an invoice to apply this payment to.' });
         return;
      }
      if (!paymentAmount || Number(paymentAmount) <= 0) {
         setFeedback({ type: 'error', message: 'Please enter a valid payment amount.' });
         return;
      }

      setSubmitting(true);
      setFeedback(null);

      try {
         // Build the payment object matching the existing payment form shape
         const paymentData = formObjectForPaymentPost({
            selectedCustomer,
            selectedInvoice,
            selectedJob,
            selectedTeamMember: { user_id: userID },
            selectedRetainer: null,
            selectedDate: paymentDate,
            isTransactionBillable: true,
            unitCost: -Math.abs(Number(paymentAmount)),
            quantity: 1,
            formOfPayment,
            paymentReferenceNumber: referenceNumber,
            foundInvoiceID: selectedInvoice?.customer_invoice_id || null,
            note
         }, loggedInUser);

         // Step 1: Create the real payment via existing endpoint
         const paymentResult = await postNewPayment(paymentData, accountID, userID, token);

         if (paymentResult.status !== 200) {
            setFeedback({ type: 'error', message: paymentResult.message || 'Failed to create payment.' });
            setSubmitting(false);
            return;
         }

         // Step 2: Mark pending record as processed
         await approvePendingPayment(pendingPayment.payment_id, accountID, userID, token);

         // Update parent data
         if (paymentResult.paymentsList) {
            setCustomerData(prev => ({
               ...prev,
               paymentsList: paymentResult.paymentsList,
               invoicesList: paymentResult.invoicesList,
               accountRetainersList: paymentResult.accountRetainersList
            }));
         }

         setFeedback({ type: 'success', message: 'Payment approved and created successfully.' });
         setTimeout(() => {
            onApproved();
            onClose();
         }, 1200);
      } catch (error) {
         console.error('Error approving payment:', error);
         setFeedback({ type: 'error', message: error.response?.data?.message || error.message || 'An error occurred.' });
      } finally {
         setSubmitting(false);
      }
   };

   if (!pendingPayment) return null;

   return (
      <Dialog open={open} onClose={onClose} maxWidth='xl' fullWidth>
         <DialogTitle>Review & Approve Payment</DialogTitle>
         <DialogContent>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
               {/* Left: Payment Form */}
               <Box sx={{ flex: '0 0 55%' }}>
                  <Stack spacing={2}>
                     {/* Original OCR name (read-only) */}
                     <TextField
                        label='Original Customer Name (OCR)'
                        value={pendingPayment.customer_name || ''}
                        variant='standard'
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInput-input': { color: 'text.secondary' } }}
                     />

                     {/* Customer selection */}
                     <Autocomplete
                        size='small'
                        value={selectedCustomer}
                        onChange={(_, value) => {
                           setSelectedCustomer(value);
                           setSelectedInvoice(null);
                        }}
                        options={customers}
                        getOptionLabel={option => option.display_name || ''}
                        isOptionEqualToValue={(option, value) => option.customer_id === value?.customer_id}
                        renderInput={params => <TextField {...params} label='Customer' variant='standard' required />}
                        fullWidth
                     />

                     {/* Invoice selection */}
                     <Autocomplete
                        size='small'
                        value={selectedInvoice}
                        onChange={(_, value) => setSelectedInvoice(value)}
                        options={customerInvoices}
                        getOptionLabel={option => {
                           const num = option.invoice_number || `#${option.customer_invoice_id}`;
                           const bal = Math.abs(option.remaining_balance_on_invoice || 0).toFixed(2);
                           return `${num} — $${bal} remaining`;
                        }}
                        isOptionEqualToValue={(option, value) => option.customer_invoice_id === value?.customer_invoice_id}
                        renderInput={params => <TextField {...params} label='Invoice' variant='standard' required />}
                        fullWidth
                        noOptionsText={selectedCustomer ? 'No unpaid invoices' : 'Select a customer first'}
                     />

                     <Divider sx={{ my: 1 }} />

                     {/* Payment details */}
                     <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                           label='Payment Date'
                           value={paymentDate}
                           onChange={value => setPaymentDate(value)}
                           slotProps={{ textField: { variant: 'standard', fullWidth: true, size: 'small' } }}
                        />
                     </LocalizationProvider>

                     <Autocomplete
                        size='small'
                        value={formOfPayment}
                        onChange={(_, value) => setFormOfPayment(value)}
                        options={PAYMENT_METHODS}
                        renderInput={params => <TextField {...params} label='Form of Payment' variant='standard' />}
                        fullWidth
                     />

                     <TextField
                        label='Payment Reference Number'
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        variant='standard'
                        fullWidth
                     />

                     <TextField
                        label='Payment Amount'
                        type='number'
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        variant='standard'
                        fullWidth
                        required
                     />

                     <TextField
                        label='Note'
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        variant='standard'
                        fullWidth
                        multiline
                        maxRows={3}
                     />

                     <Typography variant='caption' color='text.secondary'>
                        Source file: {pendingPayment.source_file}
                     </Typography>

                     <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button variant='contained' color='primary' onClick={handleSubmit} disabled={submitting}>
                           {submitting ? 'Processing...' : 'Approve & Submit Payment'}
                        </Button>
                        <Button variant='outlined' onClick={onClose} disabled={submitting}>
                           Cancel
                        </Button>
                     </Box>

                     {feedback && (
                        <Alert severity={feedback.type} sx={{ mt: 1 }}>{feedback.message}</Alert>
                     )}
                  </Stack>
               </Box>

               {/* Right: PDF Preview */}
               <Box sx={{ flex: '0 0 43%', borderLeft: '1px solid', borderColor: 'divider', pl: 3 }}>
                  <Typography variant='subtitle2' sx={{ mb: 1 }}>Source Document</Typography>
                  <PaymentPdfPreview fileName={pendingPayment.source_file} />
               </Box>
            </Box>
         </DialogContent>
      </Dialog>
   );
}
