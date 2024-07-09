import { useState } from 'react';
import { Stack, Button, Alert, Box } from '@mui/material';
import { putUpdateAccountAddress } from '../../../../Services/ApiCalls/PutCalls';
import { formObjectForAccountAddressUpdate } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import AddressTypeSelections from '../../../Customer/CustomerForms/AddCustomer/FormSubComponents/AddressTypeSelections';
import AddressForm from '../../../Customer/CustomerForms/AddCustomer/FormSubComponents/AddressForm';
import { useContext } from 'react';
import { context } from '../../../../App';

const initialState = {
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
   const { accountID, userID } = useContext(context).loggedInUser;

   const [postStatus, setPostStatus] = useState(null);
   const [selectedItems, setSelectedItems] = useState(initialState);

   const handleSubmit = async () => {
      const dataToPost = formObjectForAccountAddressUpdate(selectedItems, loggedInUser);
      const postedItem = await putUpdateAccountAddress(dataToPost, accountID, userID);

      setPostStatus(postedItem);
      if (postedItem.status === 200) resetState(postedItem);
   };

   const resetState = () => {
      setSelectedItems(initialState);
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
