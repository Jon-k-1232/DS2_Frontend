import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import AccountUsersGrid from '../../../Pages/Account/AccountGrids/AccountUsersGrid';
import AccountSettings from '../../../Pages/Account/AccountSettings/AccountSettings';
import AccountAutomations from '../../../Pages/Account/Automations/AccountAutomations';
import UsersSubRoutes from './UsersSubRoutes';
import Page from '../../../Components/Page';
import { Stack } from '@mui/material';
import AdminProtectedAccessRoute from '../../AdminProtectedAccess';
import SuperAdminProtectedAccessRoute from '../../SuperAdminAccess';

export default function AccountRoutes({ setPageTitle, customerData, setCustomerData }) {
   useEffect(() => {
      setPageTitle('Account');
      // eslint-disable-next-line
   }, []);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route
                  path='accountUsers'
                  element={
                     <SuperAdminProtectedAccessRoute>
                        <AccountUsersGrid customerData={customerData} setCustomerData={data => setCustomerData(data)} />
                     </SuperAdminProtectedAccessRoute>
                  }
               />
               <Route
                  path='/accountUsers/*'
                  element={
                     <SuperAdminProtectedAccessRoute>
                        <UsersSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />
                     </SuperAdminProtectedAccessRoute>
                  }
               />
               <Route
                  path='accountSettings'
                  element={
                     <AdminProtectedAccessRoute>
                        <AccountSettings customerData={customerData} setCustomerData={data => setCustomerData(data)} />
                     </AdminProtectedAccessRoute>
                  }
               />
               <Route
                  path='automations'
                  element={
                     <AdminProtectedAccessRoute>
                        <AccountAutomations />
                     </AdminProtectedAccessRoute>
                  }
               />
            </Routes>
         </Stack>
      </Page>
   );
}
