import useJobSearch from '../../../../../Components/Lookups/useJobSearch';
import useJobChoices from '../../../../../Components/Lookups/useJobChoices';
import {useCustomerChoices} from '../../../../../Components/Lookups/CustomerPicker';
import EntityPicker, {sameEntity} from '../../../../../Components/BillingEntities/EntityPicker';
import React, { useState, useEffect } from 'react';
import { Box, Stack, Tooltip, IconButton, TextField, Autocomplete } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import AutoCompleteWithDialog from '../../../../../Components/Dialogs/AutoCompleteWithDialog';
import NewJob from '../../../../Jobs/JobForms/AddJob/NewJob';
import NewCustomer from '../../../../Customer/CustomerForms/AddCustomer/NewCustomer';
import { getOpenInvoicesForPayment } from '../../../../../Services/SharedFunctions';
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

   const activeUsers = combinedData.teamMembersList?.activeUserData?.activeUsers || [];
   const customerInvoiceData = (combinedData?.customerInvoiceData?.customerInvoices || []).filter(r=>sameEntity(r,selectedItems.entityId));


   const [jobSearch,setJobSearch,jobScope]=useJobSearch(selectedCustomer?.customer_id,selectedItems.entityId);
   const [customerSearch,setCustomerSearch]=useState('');
   const clients=useCustomerChoices(customerData,customerSearch,selectedCustomer?.customer_id);
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
            entityId:prev.entityLocked?prev.entityId:null,
            customerInvoicesID:null,
            selectedJob: null,
            // An invoice belongs to one customer — carrying the selection across
            // a customer switch posted payments against the wrong customer's invoice.
            selectedInvoice: null,
            selectedRetainer: null,
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

   const [externalJobBump,setExternalJobBump]=useState(0);
   const jobChoices=useJobChoices(page==='Retainer'||page==='WriteOff'?undefined:selectedCustomer?.customer_id,selectedItems.entityId,jobSearch,externalJobBump,selectedJob?.customer_job_id);
   const customerJobs=jobChoices.rows,refreshingJobsLocal=jobChoices.loading;
   const fetchJobsForCustomer=()=>setExternalJobBump(n=>n+1);
   useEffect(()=>{const refresh=()=>setExternalJobBump(n=>n+1);window.addEventListener('jobs:updated',refresh);return()=>window.removeEventListener('jobs:updated',refresh);},[]);

   const jobAutoCompleteProps = {
      autoCompleteLabel: 'Select Job',
      autoCompleteOptionsList: customerJobs,
      onSearch:setJobSearch,loading:jobChoices.loading,error:jobChoices.error,remote:true,
      onChangeKey: 'selectedJob',
      optionLabelProperty: 'job_description',
      valueTestProperty: 'customer_job_id',
      addedOptionLabel: 'Add New Job',
      selectedOption: selectedJob,
      handleAutocompleteChange
   };

   const customerAutoCompleteProps = {
      autoCompleteLabel: 'Select Customer',
      autoCompleteOptionsList: clients.rows,
      onSearch:setCustomerSearch,loading:clients.loading,error:clients.error,remote:clients.remote,
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

   return (
      <>
         <EntityPicker disabled={selectedItems.entityLocked} value={selectedItems.entityId} preferredId={selectedItems.selectedJob?.billing_entity_id} customerId={selectedItems.selectedCustomer?.customer_id} onChange={entityId=>setSelectedItems(prev=>({...prev,entityId,...(prev.entityId && prev.entityId!==entityId?{selectedJob:null,selectedInvoice:null,selectedRetainer:null,foundInvoiceID:null,customerInvoicesID:null}:{})}))} />
         <LocalizationProvider dateAdapter={AdapterDayjs}>
            {/* Use local dateValue for DateTimePicker */}
            <DateTimePicker
               sx={{ width: '100%', maxWidth: 350 }}
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
               <Stack direction='row' alignItems='center' spacing={0.5} sx={{ width: '100%', maxWidth: 350 }}>
                  <Box sx={{ flex: 1 }}>
                     <AutoCompleteWithDialog
                        key={jobScope}
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
                     sx={{ width: '100%', maxWidth: 350 }}
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
                     sx={{ width: '100%', maxWidth: 350, marginTop: '15px' }}
                     key={jobScope}
                     value={selectedJob}
                     onChange={(event, value) => handleAutocompleteChange('selectedJob', value)}
                     getOptionLabel={option => option.job_description}
                     // Jobs for the selected customer (same source as the "Select Job"
                     // dropdown above) — this used to derive options from the selected
                     // invoice's transaction history, which relied on customerTransactionData
                     // / customerJobData that aren't populated on the Payment form, so the
                     // dropdown was always empty.
                     options={customerJobs || []}
                     onInputChange={(_,v,reason)=>{if(reason==='input'||reason==='clear')setJobSearch(v);}}
                     filterOptions={x=>x}
                     noOptionsText={selectedCustomer ? 'No jobs found for this customer' : 'Select a customer first'}
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
                  sx={{ width: '100%', maxWidth: 350 }}
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
