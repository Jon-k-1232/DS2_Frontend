import React, { useState, useEffect, useContext } from 'react';
import { Box, Stack, Tooltip, IconButton, TextField, Autocomplete } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import AutoCompleteWithDialog from '../../../../../Components/Dialogs/AutoCompleteWithDialog';
import NewJob from '../../../../Jobs/JobForms/AddJob/NewJob';
import NewCustomer from '../../../../Customer/CustomerForms/AddCustomer/NewCustomer';
import { getCustomerJobsList } from '../../../../../Services/ApiCalls/FetchCalls';
import { getOpenInvoicesForPayment } from '../../../../../Services/SharedFunctions';
import { context } from '../../../../../App';
import './Transactions.css';
import SplitOptionLabel from '../../../../../Components/SplitOptionLabel';

export default function InitialSelectionOptions({
   customerData,
   selectedItems,
   setSelectedItems,
   customerProfileData,
   setCustomerData,
   initialState,
   passedSelectedDate,
   page,
   children,
   fieldSuggestions = {}
}) {
   // Combine data from various sources
   const combinedData = { ...customerData, ...selectedItems, ...customerProfileData };
   const { selectedCustomer, selectedJob, selectedTeamMember, selectedDate, selectedInvoice } = combinedData;

   const activeCustomers = combinedData.customersList?.activeCustomerData?.activeCustomers || [];
   const activeUsers = combinedData.teamMembersList?.activeUserData?.activeUsers || [];
   const customerInvoiceData = combinedData?.customerInvoiceData?.customerInvoices || [];
   const customerTransactionData = combinedData?.customerTransactionData?.customerTransactionData || [];
   const customerJobData = combinedData?.customerJobData?.customerJobData || [];

   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [customerJobs, setCustomerJobs] = useState([]);
   const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
   const [jobDialogOpen, setJobDialogOpen] = useState(false);

   // Local date state to mirror parent's selectedDate
   const [dateValue, setDateValue] = useState(dayjs());

   // Whenever parent updates selectedDate (like on load), sync local state
   useEffect(() => {
      if (selectedDate) {
         setDateValue(selectedDate);
      } else {
         setDateValue(dayjs());
      }
   }, [selectedDate]);

   // If there's a passedSelectedDate, we can also sync that to the parent once
   useEffect(() => {
      if (passedSelectedDate) {
         setSelectedItems(prev => ({
            ...prev,
            selectedDate: dayjs(passedSelectedDate)
         }));
      }
      // eslint-disable-next-line
   }, [passedSelectedDate]);

   // Called when user changes the date/time
   const handleDateChange = newDate => {
      setDateValue(newDate);
      setSelectedItems(prev => ({
         ...prev,
         selectedDate: dayjs(newDate)
      }));
   };

   // Called when user selects a new Customer, Invoice, Job, TeamMember, etc.
   const handleAutocompleteChange = (key, value) => {
      // If the user picks a new customer, only reset specific fields if desired.
      // For instance, reset 'selectedJob', but keep 'minutes', 'selectedDate', etc.
      if (key === 'selectedCustomer') {
         setSelectedItems(prev => ({
            ...prev,
            [key]: value,
            selectedJob: null,
            // An invoice belongs to one customer — carrying the selection across
            // a customer switch posted payments against the wrong customer's invoice.
            selectedInvoice: null,
            foundInvoiceID: null
            // preserve everything else
         }));
         return;
      }

      // If the user picks a new invoice, reset the job (optional)
      if (key === 'selectedInvoice') {
         setSelectedItems(prev => ({
            ...prev,
            [key]: value,
            selectedJob: null
         }));
         return;
      }

      // Otherwise, just set the chosen field
      setSelectedItems(prev => ({ ...prev, [key]: value }));
   };

   // Fetch jobs when a customer is selected
   const [externalJobBump, setExternalJobBump] = useState(0);
   const [refreshingJobsLocal, setRefreshingJobsLocal] = useState(false);
   const fetchJobsForCustomer = React.useCallback(async () => {
      if (!selectedCustomer) return;
      setRefreshingJobsLocal(true);
      try {
         const customerJobsList = await getCustomerJobsList(accountID, userID, selectedCustomer.customer_id, token);
         const activeCustomerJobs = customerJobsList?.activeCustomerJobData?.activeCustomerJobs || [];
         setCustomerJobs(activeCustomerJobs);
      } finally {
         setRefreshingJobsLocal(false);
      }
   }, [selectedCustomer, accountID, userID, token]);

   useEffect(() => {
      fetchJobsForCustomer();
   }, [selectedCustomer, jobDialogOpen, externalJobBump, fetchJobsForCustomer]);

   useEffect(() => {
      const handler = () => setExternalJobBump(n => n + 1);
      window.addEventListener('jobs:updated', handler);
      return () => window.removeEventListener('jobs:updated', handler);
   }, []);

   const jobAutoCompleteProps = {
      autoCompleteLabel: 'Select Job',
      autoCompleteOptionsList: customerJobs,
      onChangeKey: 'selectedJob',
      optionLabelProperty: 'job_description',
      valueTestProperty: 'customer_job_id',
      addedOptionLabel: 'Add New Job',
      selectedOption: selectedJob,
      handleAutocompleteChange
   };

   const customerAutoCompleteProps = {
      autoCompleteLabel: 'Select Customer',
      autoCompleteOptionsList: activeCustomers,
      onChangeKey: 'selectedCustomer',
      optionLabelProperty: 'display_name',
      valueTestProperty: 'customer_id',
      addedOptionLabel: 'Add New Customer',
      selectedOption: selectedCustomer,
      handleAutocompleteChange
   };

   // Open invoices a payment may target — current chain(s) only. Older chains
   // were absorbed into the newest invoice's beginning balance; offering them
   // here is how payments used to vanish from future bills.
   const findCustomerInvoices = () => getOpenInvoicesForPayment(customerInvoiceData);

   // Logic to find jobs associated with the selected invoice
   const findInvoiceJobs = () => {
      if (!selectedInvoice) return [];
      const { customer_invoice_id, parent_invoice_id } = selectedInvoice;

      const invoiceJobIDs = customerTransactionData.reduce((prev, curr) => {
         if (parent_invoice_id && curr.customer_invoice_id === parent_invoice_id && !prev.includes(curr.customer_job_id)) {
            prev.push(curr.customer_job_id);
         } else if (!parent_invoice_id && curr.customer_invoice_id === customer_invoice_id && !prev.includes(curr.customer_job_id)) {
            prev.push(curr.customer_job_id);
         }
         return prev;
      }, []);
      return customerJobData.filter(job => invoiceJobIDs.includes(job.customer_job_id));
   };

   return (
      <>
         <LocalizationProvider dateAdapter={AdapterDayjs}>
            {/* Use local dateValue for DateTimePicker */}
            <DateTimePicker
               sx={{ width: 350 }}
               className='myDatePicker'
               required
               label='Select Transaction Date'
               value={dateValue}
               onChange={handleDateChange}
               slotProps={{ textField: { variant: 'outlined' } }}
            />

            {/* Removed customer suggestion pill per requirements */}

            <AutoCompleteWithDialog dialogTitle='New Customer' dialogOpen={customerDialogOpen} setDialogOpen={setCustomerDialogOpen} autoCompleteProps={customerAutoCompleteProps}>
               {/* NewCustomer is the child form for adding a new customer */}
               <NewCustomer customerData={customerData} setCustomerData={setCustomerData} />
            </AutoCompleteWithDialog>

            {/* Optionally show the job autocomplete if it's not certain pages */}
            {page !== 'Retainer' && page !== 'WriteOff' && page !== 'Payment' && (
               <Stack direction='row' alignItems='center' spacing={0.5} sx={{ width: 350 }}>
                  <Box sx={{ flex: 1 }}>
                     <AutoCompleteWithDialog
                        dialogTitle='New Job'
                        dialogOpen={jobDialogOpen}
                        setDialogOpen={setJobDialogOpen}
                        autoCompleteProps={jobAutoCompleteProps}
                        onAdded={newJob => {
                           // Auto-select the just-created job so the user doesn't have
                           // to re-open the dropdown and find it manually.
                           if (newJob) handleAutocompleteChange('selectedJob', newJob);
                           setExternalJobBump(n => n + 1);
                        }}
                     >
                        <NewJob
                           customerData={customerData}
                           setCustomerData={data => setCustomerData(data)}
                           defaultCustomer={selectedCustomer}
                        />
                     </AutoCompleteWithDialog>
                  </Box>
                  <Tooltip title={selectedCustomer ? 'Refresh jobs list for this customer' : 'Pick a customer first'}>
                     <span>
                        <IconButton
                           size='small'
                           onClick={fetchJobsForCustomer}
                           disabled={!selectedCustomer || refreshingJobsLocal}
                           sx={{ alignSelf: 'flex-end', mb: 0.5 }}
                           color='primary'
                        >
                           <RefreshIcon fontSize='small' />
                        </IconButton>
                     </span>
                  </Tooltip>
               </Stack>
            )}

            {/* Render children passed to this component */}
            {children}

            {/* If page === 'Payment', show invoice & job pickers for payments */}
            {page === 'Payment' && (
               <Box>
                  <Autocomplete
                     size='small'
                     sx={{ width: 350 }}
                     value={selectedInvoice}
                     onChange={(event, value) => handleAutocompleteChange('selectedInvoice', value)}
                     getOptionLabel={option => `${option.invoice_number} Remaining:$${Number(option.remaining_balance_on_invoice).toFixed(2)}`}
                     renderOption={(props, option) => (
                        <li {...props}>
                           <SplitOptionLabel alignLeft={option.invoice_number} alignRight={`Remaining:$${Number(option.remaining_balance_on_invoice).toFixed(2)}`} />
                        </li>
                     )}
                     options={findCustomerInvoices() || []}
                     noOptionsText={
                        selectedCustomer
                           ? 'No open invoice — the current statement shows $0 due. Record the funds as a retainer/prepayment, or audit the account.'
                           : 'Select a customer first'
                     }
                     renderInput={params => <TextField {...params} label='Select Invoice For Invoice Payment' variant='standard' />}
                  />

                  <Autocomplete
                     size='small'
                     sx={{ width: 350, marginTop: '15px' }}
                     value={selectedJob}
                     onChange={(event, value) => handleAutocompleteChange('selectedJob', value)}
                     getOptionLabel={option => option.job_description}
                     options={findInvoiceJobs() || []}
                     renderInput={params => (
                        <TextField
                           {...params}
                           label='(Optional) Select Job for Invoice Payment'
                           variant='standard'
                           helperText='Optionally select a job on the selected invoice to make a job-specific payment'
                        />
                     )}
                  />
               </Box>
            )}

            {/* Team Member */}
            <Box>
               <Autocomplete
                  size='small'
                  sx={{ width: 350 }}
                  value={selectedTeamMember}
                  onChange={(event, value) => handleAutocompleteChange('selectedTeamMember', value)}
                  getOptionLabel={option => option.user_name || option.display_name || ''}
                  options={activeUsers || []}
                  renderInput={params => <TextField {...params} label='Select Team Member' variant='standard' />}
               />
            </Box>
         </LocalizationProvider>
      </>
   );
}
