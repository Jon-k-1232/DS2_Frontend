import { useState, useEffect, useContext } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import { fetchCustomerRetainerAndPrepaymentList } from '../../../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../../../App';
import SplitOptionLabel from '../../../../../Components/SplitOptionLabel';

export default function RetainerSelection({ selectedItems, setSelectedItems }) {
   const { selectedCustomer, selectedRetainer } = selectedItems;

   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [customerRetainersAndPrePayments, setCustomerRetainersAndPrePayments] = useState([]);

   // Fetch jobs based on the selected customer
   useEffect(() => {
      if (selectedCustomer) {
         const fetchJobs = async () => {
            const customerRetainersAndPrePayments = await fetchCustomerRetainerAndPrepaymentList(accountID, userID, selectedCustomer.customer_id, token);
            const activeCustomerRetainers = customerRetainersAndPrePayments?.activeRetainerData?.activeRetainers || [];
            setCustomerRetainersAndPrePayments(activeCustomerRetainers);
         };
         fetchJobs();
      }
      // eslint-disable-next-line
   }, [selectedCustomer]);

   return (
      <>
         {customerRetainersAndPrePayments.length > 0 && (
            <Autocomplete
               size='small'
               sx={{ width: 350, marginTop: '15px' }}
               value={selectedRetainer}
               onChange={(event, value) => setSelectedItems({ ...selectedItems, selectedRetainer: value })}
               getOptionLabel={option => `${option.display_name} Remaining: ${option.current_amount}`}
               renderOption={(props, option) => (
                  <li {...props}>
                     <SplitOptionLabel alignLeft={option.display_name} alignRight={`Remaining: $${option.current_amount}`} />
                  </li>
               )}
               options={customerRetainersAndPrePayments || []}
               renderInput={params => (
                  <TextField
                     {...params}
                     label='Apply Retainer or Pre-Payment'
                     variant='standard'
                     helperText='If a prepayment has been made or there is a retainer for this customers job, select the prepayment or retainer that should apply.'
                  />
               )}
            />
         )}
      </>
   );
}
