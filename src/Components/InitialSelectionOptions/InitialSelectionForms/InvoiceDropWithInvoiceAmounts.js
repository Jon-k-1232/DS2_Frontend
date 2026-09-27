import React, { useState, useEffect, useContext } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import SplitOptionLabel from '../../SplitOptionLabel';
import { context } from '../../../App';
import { fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';
import findCustomerInvoices from '../Logic/FindCustomerInvoices';

const InvoiceDropWithInvoiceAmounts = ({ customerData, selectedItems, setSelectedItems, dropDownPlaceholderText, helperText }) => {
   const [loaded, setLoaded] = useState({key:null,rows:[],error:''});

   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   // Destructure state variables from the props
   const combinedData = { ...customerData, ...selectedItems };
   const { selectedCustomer, selectedInvoice, entityId } = combinedData;
   const customerId=selectedCustomer?.customer_id;
   const key=`${accountID}:${userID}:${customerId}:${entityId}`;
   const current=loaded.key===key?loaded:{rows:[],error:''};

   useEffect(() => {
      let active=true;
      if(customerId){
         fetchCustomerProfileInformation(accountID,userID,customerId,token,entityId,'invoices').then(data=>{
            if(active)setLoaded({key,rows:findCustomerInvoices(data?.customerInvoiceData?.customerInvoices || []),error:data.status===200?'':data.message || 'Unable to load invoices.'});
         });
      }
      return()=>{active=false;};
   },[accountID,userID,customerId,token,entityId,key]);

   return (
      <Autocomplete
         size='small'
         sx={{ width: 350 }}
         value={selectedInvoice || null}
         onChange={(_, value) => setSelectedItems(previous=>({...previous,selectedInvoice:value,selectedJob:null}))}
         getOptionLabel={option => `${option.invoice_number} Remaining:$${option.remaining_balance_on_invoice}`}
         renderOption={(props, option) => (
            <li {...props}>
               <SplitOptionLabel alignLeft={option.invoice_number} alignRight={`Remaining:$${option.remaining_balance_on_invoice}`} />
            </li>
         )}
         isOptionEqualToValue={(option, value) => Number(option.customer_invoice_id) === Number(value.customer_invoice_id)}
         options={current.rows}
         loading={Boolean(customerId) && loaded.key!==key}
         renderInput={params => <TextField {...params} label={dropDownPlaceholderText} variant='standard' error={Boolean(current.error)} helperText={current.error || helperText} />}
      />
   );
};

export default InvoiceDropWithInvoiceAmounts;
