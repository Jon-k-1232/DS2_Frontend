import React, { useState, useEffect, useContext } from 'react';
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import TokenService from '../Services/TokenService';
import DashboardLayout from '../Layouts/Drawer';
import LogoOnlyLayout from '../Layouts/LogoOnlyLayout';
import Login from '../Pages/Login/Login';
import ForgotPassword from '../Pages/Login/ForgotPassword';
import ResetPassword from '../Pages/Login/ResetPassword';
import NotFound from '../Pages/Page404/Page404';
import DashboardRoutes from './GroupedRoutes/DashboardRoutes';
import CustomerRoutes from './GroupedRoutes/CustomerRoutes/CustomerRoutes';
import TransactionsRoutes from './GroupedRoutes/TransactionRoutes/TransactionsRoutes';
import InvoiceRoutes from './GroupedRoutes/InvoiceRoutes/InvoiceRoutes';
import AccountRoutes from './GroupedRoutes/AccountRoutes/AccountRoutes';
import JobRoutes from './GroupedRoutes/JobRoutes/JobRoutes';
import TimeTrackingRoutes from './GroupedRoutes/TimeTrackingRoutes/TimeTrackingRoutes';
import EmployeeTimeTrackerSubRoutes from './GroupedRoutes/TransactionRoutes/EmployeeEntrySubRoutes';
import { context } from '../App';
import { getInitialAppData, fetchSingleUser, fetchAppVersion } from '../Services/ApiCalls/FetchCalls';
import ManagerAndAdminProtectedAccessRoute from './ManagerAndAdminProtectedAccess';

// loaders
// https://awesome-loaders.netlify.app/docs/loaders/wifiloader/

export default function Router() {
   const navigate = useNavigate();
   const location = useLocation();

   const { loggedInUser, setLoggedInUser } = useContext(context);
   const { accountID, userID, displayName, token } = loggedInUser;

   const [pageTitle, setPageTitle] = useState('');
   const [customerData, setCustomerData] = useState({});
   const [appVersion, setAppVersion] = useState('Loading...');

   useEffect(() => {
      const fetchVersion = async () => {
         const fetchedAppVersion = await fetchAppVersion();
         setAppVersion(fetchedAppVersion);
      };
      fetchVersion();
   }, []);

   useEffect(() => {
      // With every route check if token is still good or not.
      const checkedToken = token && TokenService.isTokenExpired(token);
      if (token && checkedToken.isExpired) {
         setLoggedInUser(checkedToken.resetContext);
         setCustomerData({});
         navigate('/login');
      }
      // eslint-disable-next-line
   }, [location]);

   // Gets all customer data on page load
   useEffect(() => {
      if (accountID && userID && token) apiCall();
      // eslint-disable-next-line
   }, [loggedInUser]);

   const apiCall = async () => {
      const initialData = await getInitialAppData(accountID, userID, token);
      setCustomerData({ ...customerData, ...initialData });

      // Need this condition for reloads. DisplayName on reload is null, so we need to catch it along with others.
      // Additionally when this re runs since token will be pulled again, server will re authenticate jwt.
      if (!displayName) {
         const userData = await fetchSingleUser(accountID, userID, token);
         const { account_id, user_id, display_name, job_title, access_level } = userData.activeUserData.activeUser;
         setLoggedInUser({
            accountID: account_id,
            userID: user_id,
            displayName: display_name,
            role: job_title,
            accessLevel: access_level,
            token: token
         });
      }
   };

   const handleSetCustomerData = updatedData => setCustomerData(updatedData);

   const TrackingAdministration = () => {
      useEffect(() => {
         setPageTitle('Tracking Administration');
      }, [setPageTitle]);

      return <EmployeeTimeTrackerSubRoutes customerData={customerData} setCustomerData={handleSetCustomerData} />;
   };

   return (
      <Routes>
         <Route element={<LogoOnlyLayout />}>
            <Route exact path='/login' element={<Login appVersion={appVersion} />} />
            <Route exact path='/forgot-password' element={<ForgotPassword />} />
            <Route exact path='/reset-password' element={<ResetPassword />} />
            <Route path='/' element={<Navigate to='/login' />} />
            <Route path='404' element={<NotFound />} />
            <Route path='*' element={<Navigate to='/404' />} />
         </Route>

         <Route element={<DashboardLayout pageTitle={pageTitle} />}>
            <Route path='dashboard/*' element={<DashboardRoutes setPageTitle={pageTitle => setPageTitle(pageTitle)} />} />

            <Route
               path='customers/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <CustomerRoutes setPageTitle={setPageTitle} customerData={customerData} setCustomerData={handleSetCustomerData} />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />

            <Route
               path='transactions/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <TransactionsRoutes setPageTitle={setPageTitle} customerData={customerData} setCustomerData={handleSetCustomerData} />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />

            <Route
               path='invoices/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <InvoiceRoutes setPageTitle={setPageTitle} customerData={customerData} setCustomerData={handleSetCustomerData} />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />

            <Route
               path='jobs/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <JobRoutes setPageTitle={setPageTitle} customerData={customerData} setCustomerData={handleSetCustomerData} />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />
            <Route
               path='time-tracking/trackingAdministration/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <TrackingAdministration />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />
            <Route path='time-tracking/*' element={<TimeTrackingRoutes setPageTitle={setPageTitle} />} />

            <Route
               path='account/*'
               element={
                  <ManagerAndAdminProtectedAccessRoute>
                     <AccountRoutes setPageTitle={setPageTitle} customerData={customerData} setCustomerData={handleSetCustomerData} />
                  </ManagerAndAdminProtectedAccessRoute>
               }
            />
         </Route>
      </Routes>
   );
}
