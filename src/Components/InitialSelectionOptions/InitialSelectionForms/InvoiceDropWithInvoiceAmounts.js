import React, { useState, useEffect, useContext } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import SplitOptionLabel from '../../SplitOptionLabel';
import { context } from '../../../App';
import { fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';
import findCustomerInvoices from '../Logic/FindCustomerInvoices';

const InvoiceDropWithInvoiceAmounts = ({ customerData, selectedItems, setSelectedItems, dropDownPlaceholderText, helperText }) => {
   const [customerOutstandingInvoices, setCustomerOutstandingInvoices] = useState([]);

   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   // Destructure state variables from the props
   const combinedData = { ...customerData, ...selectedItems };
   const { selectedCustomer, selectedInvoice, selectedJob } = combinedData;

   useEffect(() => {
      if (selectedCustomer) {
         const fetchCustomerData = async () => {
            const customerInfo = await fetchCustomerProfileInformation(accountID, userID, selectedCustomer.customer_id, token);

            const customerInvoiceData = customerInfo?.customerInvoiceData?.customerInvoices || [];
            const customerInvoices = findCustomerInvoices(customerInvoiceData);
            setCustomerOutstandingInvoices(customerInvoices);

            // Reset selected invoice if customer changes
            setSelectedItems({ ...selectedItems, selectedInvoice: null });
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
      // the if condition is to only allow an invoice, or job to be selected. if invoice is selected here, the job selection will clear.
      if (selectedJob) setSelectedItems({ ...selectedItems, selectedJob: null });
      setSelectedItems(prevItems => ({ ...prevItems, [key]: value }));
   };

   return (
      <Autocomplete
         size='small'
         sx={{ width: 350 }}
         value={selectedInvoice}
         onChange={(event, value) => handleAutocompleteChange('selectedInvoice', value)}
         getOptionLabel={option => `${option.invoice_number} Remaining:$${option.remaining_balance_on_invoice}`}
         renderOption={(props, option) => (
            <li {...props}>
               <SplitOptionLabel alignLeft={option.invoice_number} alignRight={`Remaining:$${option.remaining_balance_on_invoice}`} />
            </li>
         )}
         isOptionEqualToValue={(option, value) => option?.invoice_number === value?.invoice_number || null}
         options={customerOutstandingInvoices || []}
         renderInput={params => <TextField {...params} label={dropDownPlaceholderText} variant='standard' helperText={helperText} />}
      />
   );
};

export default InvoiceDropWithInvoiceAmounts;
