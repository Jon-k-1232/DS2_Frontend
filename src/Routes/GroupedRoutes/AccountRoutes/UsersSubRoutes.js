import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleUser } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteUser from '../../../Pages/Account/AccountForms/DeleteUser/DeleteUser';
import EditUser from '../../../Pages/Account/AccountForms/EditAccount/EditUser';
import EditUserCredentials from '../../../Pages/Account/AccountForms/EditAccount/EditUserCredentials';
import ResetUserPassword from '../../../Pages/Account/AccountForms/EditAccount/ResetUserPassword';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function UsersSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { user_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [userData, setUserData] = useState({});

   useEffect(() => {
      const fetchUserData = async () => {
         if (rowData) {
            const userData = await fetchSingleUser(accountID, user_id);
            setUserData(userData.activeUserData.activeUser);
         }
      };
      fetchUserData();
      // eslint-disable-next-line
   }, [rowData]);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteUser'
               element={
                  <ErrorBoundary fallbackComponent='/account/accountUsers'>
                     <DeleteUser customerData={customerData} setCustomerData={data => setCustomerData(data)} userData={userData} />
                  </ErrorBoundary>
               }
            />
            <Route
               path='editUser'
               element={
                  <ErrorBoundary fallbackComponent='/account/accountUsers'>
                     <EditUser customerData={customerData} setCustomerData={data => setCustomerData(data)} userData={userData} />
                  </ErrorBoundary>
               }
            />
            <Route
               path='editUserCredentials'
               element={
                  <ErrorBoundary fallbackComponent='/account/accountUsers'>
                     <EditUserCredentials customerData={customerData} setCustomerData={data => setCustomerData(data)} userData={userData} />
                  </ErrorBoundary>
               }
            />
            <Route
               path='resetUserPassword'
               element={
                  <ErrorBoundary fallbackComponent='/account/accountUsers'>
                     <ResetUserPassword customerData={customerData} setCustomerData={data => setCustomerData(data)} userData={userData} />
                  </ErrorBoundary>
               }
            />
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete User',
      value: 'deleteUser',
      route: '/account/accountUsers/deleteUser',
      onClick: () => navigate('/account/accountUsers/deleteUser')
   },
   {
      display: 'Edit User',
      value: 'editUser',
      route: '/account/accountUsers/editUser',
      onClick: () => navigate('/account/accountUsers/editUser')
   },
   {
      display: 'Edit User Credentials',
      value: 'editUserCredentials',
      route: '/account/accountUsers/editUserCredentials',
      onClick: () => navigate('/account/accountUsers/editUserCredentials')
   },
   {
      display: 'Reset User Password',
      value: 'resetUserPassword',
      route: '/account/accountUsers/resetUserPassword',
      onClick: () => navigate('/account/accountUsers/resetUserPassword')
   }
];
