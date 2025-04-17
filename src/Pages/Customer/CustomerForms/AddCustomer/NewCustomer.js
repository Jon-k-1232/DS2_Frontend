import React, { useState, useContext } from 'react';
import { Stack, Button, Alert, Box } from '@mui/material';
import NameForm from './FormSubComponents/NameForm';
import AddressForm from './FormSubComponents/AddressForm';
import CustomerSettings from './FormSubComponents/CustomerSettings';
import CustomerEntityType from './FormSubComponents/CustomerEntityType';
import { formObjectForCustomerPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { postNewCustomer } from '../../../../Services/ApiCalls/PostCalls';
import AddressTypeSelections from './FormSubComponents/AddressTypeSelections';
import RecurringCustomerForm from './FormSubComponents/RecurringCustomerForm';
import { context } from '../../../../App';
import dayjs from 'dayjs';

const initialState = {
   isCommercialCustomer: false,
   recurringAmount: '',
   billingCycle: '',
   customerBusinessName: '',
   customerFirstName: '',
   customerLastName: '',
   customerStreet: '',
   customerCity: '',
   customerState: '',
   customerZip: '',
   customerPhone: '',
   customerEmail: '',
   subscriptionFrequency: null,
   selectedStartDate: dayjs(),
   isCustomerAddressActive: true,
   isCustomerPhysicalAddress: true,
   isCustomerBillingAddress: true,
   isCustomerMailingAddress: true,
   isCustomerActive: true,
   isCustomerBillable: true,
   isCustomerRecurring: false
};

export default function NewCustomer({ customerData, setCustomerData }) {
   const {
      loggedInUser: { accountID, userID }
   } = useContext(context);

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const { isCustomerRecurring } = selectedItems;

   const createForm = Component => (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
         <Component selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
      </Stack>
   );

   const handleSubmit = async () => {
      // Build the object for a new customer
      const dataToPost = formObjectForCustomerPost(selectedItems, { accountID, userID });
      const postedItem = await postNewCustomer(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         // Reset the form
         setSelectedItems(initialState);
         // Update parent data so newly added customers appear in the list
         setCustomerData({
            ...customerData,
            customersList: postedItem.customersList,
            recurringCustomersList: postedItem.recurringCustomersList
         });
      }
   };

   return (
      <>
         <Stack spacing={3}>
            {createForm(CustomerEntityType)}
            {createForm(NameForm)}
            {createForm(AddressTypeSelections)}
            {createForm(AddressForm)}
            {createForm(CustomerSettings)}
            {isCustomerRecurring && createForm(RecurringCustomerForm)}

            <Box style={{ textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Stack>
      </>
   );
}
