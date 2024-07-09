import React, { useState, useEffect, useContext } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import SplitOptionLabel from '../../SplitOptionLabel';
import { context } from '../../../App';
import { fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';
import findCurrentCycleJobAmounts from '../Logic/FindCurrentCycleJobAmounts';

const JobDropWithCurrentCycleJobAmount = ({ customerData, selectedItems, setSelectedItems, dropDownPlaceholderText, helperText }) => {
   const [customerCurrentCycleJobs, setCustomerCurrentCycleJobs] = useState([]);

   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   // Destructure state variables from the props
   const combinedData = { ...customerData, ...selectedItems };
   const { selectedCustomer, selectedJob, selectedInvoice } = combinedData;

   useEffect(() => {
      if (selectedCustomer) {
         const fetchCustomerData = async () => {
            const customerInfo = await fetchCustomerProfileInformation(accountID, userID, selectedCustomer.customer_id, token);

            const customerTransactionData = customerInfo?.customerTransactionData?.customerTransactions || [];
            const customerJobs = findCurrentCycleJobAmounts(customerTransactionData);

            setCustomerCurrentCycleJobs(customerJobs);

            // Reset selected invoice if customer changes
            setSelectedItems({ ...selectedItems, selectedJob: null });
         };
         fetchCustomerData();
      }
      // eslint-disable-next-line
   }, [selectedCustomer]);

   /**
    * Set State for selected invoice
    * @param {*} key
    * @param {*} value
    */
   const handleAutocompleteChange = (key, value) => {
      // The if condition is to only allow an job, or invoice to be selected. If job is selected here, the invoice selection will clear.
      if (selectedInvoice) setSelectedItems({ ...selectedItems, selectedInvoice: null });
      setSelectedItems(prevItems => ({ ...prevItems, [key]: value }));
   };

   return (
      <Autocomplete
         size='small'
         sx={{ width: 350 }}
         value={selectedJob}
         onChange={(event, value) => handleAutocompleteChange('selectedJob', value)}
         getOptionLabel={option => `${option.job_description} Current Cycle:$${option.total_transaction}`}
         isOptionEqualToValue={(option, value) => option.job_description === value.job_description}
         renderOption={(props, option) => (
            <li {...props}>
               <SplitOptionLabel alignLeft={option.job_description} alignRight={`Current Cycle:$${option.total_transaction}`} />
            </li>
         )}
         options={customerCurrentCycleJobs || []}
         renderInput={params => <TextField {...params} label={dropDownPlaceholderText} variant='standard' helperText={helperText} />}
      />
   );
};

export default JobDropWithCurrentCycleJobAmount;
