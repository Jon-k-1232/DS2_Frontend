import React, { useState, useEffect, useContext } from 'react';
import { Stack, Button, Alert, Box } from '@mui/material';
import NameForm from '../CustomerForms/AddCustomer/FormSubComponents/NameForm';
import AddressForm from '../CustomerForms/AddCustomer/FormSubComponents/AddressForm';
import CustomerSettings from '../CustomerForms/AddCustomer/FormSubComponents/CustomerSettings';
import CustomerEntityType from '../CustomerForms/AddCustomer/FormSubComponents/CustomerEntityType';
import { formObjectForCustomerPost } from '../../.././Services/SharedPostObjects/SharedPostObjects';
import { putEditCustomer } from '../../.././Services/ApiCalls/PutCalls';
import { deleteCustomer } from '../../../Services/ApiCalls/DeleteCalls';
import AddressTypeSelections from '../CustomerForms/AddCustomer/FormSubComponents/AddressTypeSelections';
import RecurringCustomerForm from '../CustomerForms/AddCustomer/FormSubComponents/RecurringCustomerForm';
import { context } from '../../../App';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const initialState = {
   recurringCustomerID: '',
   customerID: '',
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
   subscriptionFrequency: 'Monthly',
   selectedStartDate: dayjs(),
   isCustomerAddressActive: true,
   isCustomerPhysicalAddress: true,
   isCustomerBillingAddress: true,
   isCustomerMailingAddress: true,
   isCustomerActive: true,
   isCustomerBillable: true,
   isCustomerRecurring: false,
   isRecurringCustomerActive: false
};

export default function EditCustomerProfile({ profileData, setCallProfileData, customerData, setCustomerData }) {
   const navigate = useNavigate();
   const {
      loggedInUser,
      loggedInUser: { accountID, userID }
   } = useContext(context);

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const { isCustomerRecurring } = selectedItems;

   useEffect(() => {
      if (profileData && Object.keys(profileData).length) {
         setInitialState();
      } else {
         navigate('/customers/customersList');
      }
      // eslint-disable-next-line
   }, [profileData]);

   const setInitialState = () => {
      const {
         customerData: { customerData: customerContactInformation }
      } = profileData;

      const names = customerContactInformation.customer_name.split(' ');

      // Assign the first name and last name to separate variables
      const firstName = names[0];
      const lastName = names[1];

      setSelectedItems({
         ...selectedItems,
         accountID: customerContactInformation.account_id,
         billOnDate: customerContactInformation.bill_on_date,
         customerBusinessName: customerContactInformation.business_name,
         createdAt: customerContactInformation.created_at,
         createdByUserID: customerContactInformation.created_by_user_id,
         customerCity: customerContactInformation.customer_city,
         customerEmail: customerContactInformation.customer_email,
         customerID: customerContactInformation.customer_id,
         customerInfoID: customerContactInformation.customer_info_id,
         customerFirstName: firstName,
         customerLastName: lastName,
         customerPhone: customerContactInformation.customer_phone,
         customerState: customerContactInformation.customer_state,
         customerStreet: customerContactInformation.customer_street,
         customerZip: customerContactInformation.customer_zip,
         displayName: customerContactInformation.display_name,
         endDate: customerContactInformation.end_date,
         isBillable: customerContactInformation.is_billable,
         isCommercialCustomer: customerContactInformation.is_commercial_customer,
         isCustomerActive: customerContactInformation.is_customer_active,
         isCustomerBillingAddress: customerContactInformation.is_customer_billing_address,
         isCustomerMailingAddress: customerContactInformation.is_customer_mailing_address,
         isCustomerPhysicalAddress: customerContactInformation.is_customer_physical_address,
         isCustomerRecurring: customerContactInformation.is_recurring || false,
         isThisAddressActive: customerContactInformation.is_this_address_active,
         recurringAmount: customerContactInformation.recurring_bill_amount || '',
         startDate: customerContactInformation.start_date,
         subscriptionFrequency: customerContactInformation.subscription_frequency || 'Monthly',
         selectedStartDate: dayjs(customerContactInformation.start_date),
         billingCycle: customerContactInformation.bill_on_date,
         recurringCustomerID: customerContactInformation.recurring_customer_id,
         isRecurringCustomerActive: customerContactInformation.is_recurring_customer_active
      });
   };

   const createForm = Component => (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
         <Component selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
      </Stack>
   );

   const handleSubmit = async () => {
      const dataToPost = formObjectForCustomerPost(selectedItems, loggedInUser);
      const postedItem = await putEditCustomer(dataToPost, accountID, userID);
      handleApiResponse(postedItem);
   };
   const handleDeletionSubmit = async () => {
      const postedItem = await deleteCustomer(selectedItems.customerID, accountID, userID);
      handleApiResponse(postedItem, true);
   };

   const handleApiResponse = async (postedItem, deleteCustomer) => {
      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         // Causes the parent useEffect to run and update the profile data object
         setCallProfileData(new Date());
         setCustomerData({ ...customerData, customersList: postedItem.customersList });

         if (selectedItems.isCustomerActive && !deleteCustomer) {
            navigate('/customers/customersList/customerProfile/customerInvoices');
         } else {
            navigate('/customers/customersList');
         }
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
            <Box style={{ display: 'flex', justifyContent: 'center' }}>
               <Box style={{ marginRight: '10px' }}>
                  <Button onClick={handleDeletionSubmit}>Delete Customer</Button>
               </Box>
               <Box>
                  <Button style={{ marginLeft: '10px' }} onClick={handleSubmit}>
                     Submit Edit
                  </Button>
               </Box>
            </Box>
            <Box>{postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}</Box>
         </Stack>
      </>
   );
}
