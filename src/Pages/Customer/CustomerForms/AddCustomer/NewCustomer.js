import React, { useState, useContext, useRef } from 'react';
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
   const [submitting, setSubmitting] = useState(false);
   const submittingRef = useRef(false);

   const { isCustomerRecurring } = selectedItems;

   const createForm = Component => (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
         <Component selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
      </Stack>
   );

   const handleSubmit = async () => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setPostStatus(null);
      try {
         const dataToPost = formObjectForCustomerPost(selectedItems, { accountID, userID });
         const postedItem = await postNewCustomer(dataToPost, accountID, userID);
         setPostStatus(postedItem);
         if (postedItem.status === 200) {
            setTimeout(() => setPostStatus(null), 2000);
            setSelectedItems(initialState);
            setCustomerData({
               ...customerData,
               customersList: postedItem.customersList,
               recurringCustomersList: postedItem.recurringCustomersList
            });
         }
      } catch (error) {
         const message = error?.response?.data?.message || error?.message || 'Unable to save customer.';
         setPostStatus({
            status: error?.response?.status || 500,
            message: error?.response ? message : `${message} Check the client list before submitting again.`
         });
      } finally {
         submittingRef.current = false;
         setSubmitting(false);
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
               <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Submit'}</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Stack>
      </>
   );
}
