import { useState, useEffect, useContext } from 'react';
import { Stack, Typography } from '@mui/material';
import UpdateAccount from '../AccountForms/EditAccount/UpdateAccount';
import UpdateAccountAddress from '../AccountForms/EditAccount/UpdateAccountAddress';
import AccountLogo from '../AccountForms/AccountImage/AccountLogo';
import { fetchAccountInformation } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

export default function AccountSettings({ customerData, setCustomerData }) {
   const { accountID, userID } = useContext(context).loggedInUser;

   const [accountInformation, setAccountInformation] = useState({});

   useEffect(() => {
      const getAccountInformation = async () => {
         const accountInfo = await fetchAccountInformation(accountID, userID);
         if (accountInfo.status !== 200) {
            console.log('Error getting account information');
         } else {
            setAccountInformation(accountInfo.account.accountData);
         }
      };

      getAccountInformation();
      // eslint-disable-next-line
   }, []);

   return (
      <>
         <Stack spacing={3}>
            <Typography variant='h5'>Account Settings</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 8 }}>
               <UpdateAccount />
               <UpdateAccountAddress />
            </Stack>
            <Stack spacing={3}>
               <AccountLogo accountInformation={accountInformation} />
            </Stack>
         </Stack>
      </>
   );
}
