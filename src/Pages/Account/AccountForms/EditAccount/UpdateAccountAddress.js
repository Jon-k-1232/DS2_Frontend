import { useState, useEffect } from 'react';
import { Stack, Button, Alert, Box } from '@mui/material';
import { putUpdateAccountAddress } from '../../../../Services/ApiCalls/PutCalls';
import { fetchAccountInformation } from '../../../../Services/ApiCalls/FetchCalls';
import { formObjectForAccountAddressUpdate } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import AddressTypeSelections from '../../../Customer/CustomerForms/AddCustomer/FormSubComponents/AddressTypeSelections';
import AddressForm from '../../../Customer/CustomerForms/AddCustomer/FormSubComponents/AddressForm';
import { useContext } from 'react';
import { context } from '../../../../App';

const initialState = {
   accountInfoID: null,
   customerStreet: '',
   customerCity: '',
   customerState: '',
   customerZip: '',
   customerPhone: '',
   customerEmail: '',
   isThisAddressActive: true,
   isCustomerAddressActive: true,
   isCustomerPhysicalAddress: true,
   isCustomerBillingAddress: true,
   isCustomerMailingAddress: true
};

export default function UpdateAccountAddress() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   // account_information rows are matched by account_info_id AND account_id on
   // update (account-service.js updateAccountInformation) — without the
   // existing row's id the update matches nothing and silently no-ops, so the
   // current address is loaded (and prefilled) before the form can submit.
   useEffect(() => {
      if (!accountID || !userID) return;
      let cancelled = false;
      const loadCurrentAddress = async () => {
         const response = await fetchAccountInformation(accountID, userID, token);
         const accountData = response?.account?.accountData;
         if (cancelled || !accountData) return;
         setSelectedItems(prev => ({
            ...prev,
            accountInfoID: accountData.account_info_id,
            customerStreet: accountData.account_street || '',
            customerCity: accountData.account_city || '',
            customerState: accountData.account_state || '',
            customerZip: accountData.account_zip || '',
            customerPhone: accountData.account_phone || '',
            customerEmail: accountData.account_email || '',
            isThisAddressActive: accountData.is_this_address_active ?? true,
            isCustomerPhysicalAddress: accountData.is_account_physical_address ?? true,
            isCustomerBillingAddress: accountData.is_account_billing_address ?? true,
            isCustomerMailingAddress: accountData.is_account_mailing_address ?? true
         }));
      };
      loadCurrentAddress();
      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [accountID, userID, token]);

   const handleSubmit = async () => {
      if (!selectedItems.accountInfoID) {
         setPostStatus({ status: 400, message: 'Current account address is still loading — please try again in a moment.' });
         return;
      }
      const dataToPost = formObjectForAccountAddressUpdate({ ...selectedItems, accountID }, loggedInUser);
      const postedItem = await putUpdateAccountAddress(dataToPost, accountID, userID);

      setPostStatus(postedItem);
      if (postedItem.status === 200) resetState(postedItem);
   };

   const resetState = () => {
      setSelectedItems(prev => ({ ...initialState, accountInfoID: prev.accountInfoID }));
      setTimeout(() => setPostStatus(null), 4000);
   };

   return (
      <>
         <Stack spacing={3}>
            <Stack>
               <AddressForm selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
            </Stack>
            <Stack>
               <AddressTypeSelections selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
            </Stack>
            <Box style={{ textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Stack>
      </>
   );
}
