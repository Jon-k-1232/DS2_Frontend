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
import { useNavigate, useLocation } from 'react-router-dom';

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
   const location = useLocation();
   const {
      loggedInUser,
      loggedInUser: { accountID, userID }
   } = useContext(context);

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const { isCustomerRecurring } = selectedItems;

   useEffect(() => {
      // profileData is only ever a real customer to edit when it's a
      // successful load carrying the actual contact record — a body-shaped
      // error ({status: 404, message: '...'}, no customerData at all) is a
      // non-empty object too, so the old `Object.keys(profileData).length`
      // check let it through into setInitialState()'s unguarded
      // `profileData.customerData.customerData` destructure, throwing a
      // TypeError instead of just navigating away like the "no profile at
      // all" case already did.
      if (profileData?.status === 200 && profileData?.customerData?.customerData) {
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

      // Prefer separately-stored first/last name fields if the profile ever
      // provides them directly (customers only stores a single combined
      // customer_name today, so this branch is currently always skipped —
      // but it's the correct, lossless source the moment it exists).
      let firstName;
      let lastName;
      if (customerContactInformation.customer_first_name != null || customerContactInformation.customer_last_name != null) {
         firstName = customerContactInformation.customer_first_name || '';
         lastName = customerContactInformation.customer_last_name || '';
      } else {
         const customerName = customerContactInformation.customer_name || '';
         // Split on the LAST space instead of the first — a multi-word FIRST
         // name ("Mary Ann Smith" -> first "Mary Ann", last "Smith")
         // round-trips intact instead of being truncated to its first word.
         // This is the mirror image of a multi-word LAST name (single-word
         // first, multi-word last), which splitting on the first space
         // already handles correctly. A name that is multi-word on BOTH
         // sides can't be split unambiguously either way without a stored
         // first/last field (see the branch above).
         const lastSpaceIndex = customerName.lastIndexOf(' ');
         if (lastSpaceIndex === -1) {
            firstName = customerName;
            lastName = '';
         } else {
            firstName = customerName.slice(0, lastSpaceIndex);
            lastName = customerName.slice(lastSpaceIndex + 1);
         }
      }

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
         // Causes the parent useEffect to run and update the profile data object
         setCallProfileData(new Date());
         setCustomerData({ ...customerData, customersList: postedItem.customersList });

         const goToNextPage = () => {
            if (selectedItems.isCustomerActive && !deleteCustomer) {
               // Stay on the same customer's profile — pull the customerId out of the
               // current URL so we don't depend on context/state to reconstruct it.
               const customerIdFromPath = location.pathname.match(/customerProfile\/(\d+)/)?.[1];
               if (customerIdFromPath) {
                  navigate(`/customers/customersList/customerProfile/${customerIdFromPath}/customerInvoices`);
               } else {
                  navigate('/customers/customersList');
               }
            } else {
               navigate('/customers/customersList');
            }
         };

         // Deactivation warnings (open balance / unbilled work) need to
         // actually be readable — navigating away in the same tick they
         // appear, as the code below used to for every successful save, meant
         // they were never seen.
         const hasWarnings = Array.isArray(postedItem.warnings) && postedItem.warnings.length > 0;
         if (hasWarnings) {
            setTimeout(() => {
               setPostStatus(null);
               goToNextPage();
            }, 4000);
         } else {
            setTimeout(() => setPostStatus(null), 2000);
            goToNextPage();
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
            {Array.isArray(postStatus?.warnings) && postStatus.warnings.length > 0 && (
               <Box>
                  <Alert severity='info'>
                     {postStatus.warnings.map((warning, index) => (
                        <div key={index}>{warning}</div>
                     ))}
                  </Alert>
               </Box>
            )}
         </Stack>
      </>
   );
}
