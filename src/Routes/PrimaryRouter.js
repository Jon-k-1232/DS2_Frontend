import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import TokenService from '../Services/TokenService';
import DashboardLayout from '../Layouts/Drawer';
import LogoOnlyLayout from '../Layouts/LogoOnlyLayout';
import Login from '../Pages/Login/Login';
import NotFound from '../Pages/Page404/Page404';
import RouteLoading from './RouteLoading';
import { context } from '../App';
import { fetchAppVersion } from '../Services/ApiCalls/FetchCalls';
import useWorkspaceData from './useWorkspaceData';
import workspaceRoutes from './WorkspaceRoutes';
const DashboardRoutes=lazy(()=>import('./GroupedRoutes/DashboardRoutes'));
// loaders
// https://awesome-loaders.netlify.app/docs/loaders/wifiloader/

export default function Router() {
   const navigate = useNavigate();
   const location = useLocation();

   const { loggedInUser, setLoggedInUser } = useContext(context);
   const { token } = loggedInUser;

   const [pageTitle, setPageTitle] = useState('');
   const {customerData,setCustomerData,loading,error,retry}=useWorkspaceData(loggedInUser,setLoggedInUser);
   const [appVersion, setAppVersion] = useState('Loading...');

   useEffect(() => {
      const fetchVersion = async () => {
         const fetchedAppVersion = await fetchAppVersion();
         setAppVersion(fetchedAppVersion);
      };
      fetchVersion();
   }, []);

   useEffect(() => {
      // With every route check if the session marker is still good or not.
      const checkedToken = token && TokenService.isTokenExpired();
      if (token && checkedToken.isExpired) {
         setLoggedInUser(checkedToken.resetContext);
         setCustomerData({});
         navigate('/login',{replace:true,state:{from:location.pathname+location.search+location.hash}});
      }
      // eslint-disable-next-line
   }, [location]);

   useEffect(()=>{
      if(!token || loading || error || customerData?.status!==200 || !['admin','manager','super admin'].includes((loggedInUser.accessLevel||'').toLowerCase()))return;
      const idle=window.requestIdleCallback || (fn=>setTimeout(fn,2000));
      const cancel=window.cancelIdleCallback || clearTimeout;
      const handle=idle(()=>{Promise.allSettled([import('../Pages/Transactions/TransactionGrids/TransactionsGrid'),import('../Pages/Invoices/CreateNewInvoice/CreateNewInvoices')]);});
      return()=>cancel(handle);
   },[token,loggedInUser.accessLevel,loading,error,customerData?.status]);
   return (
      <Routes>
         <Route element={<LogoOnlyLayout />}>
            <Route exact path='/login' element={<Login appVersion={appVersion} />} />
            <Route path='/' element={<Navigate to='/login' />} />
            <Route path='404' element={<NotFound />} />
            <Route path='*' element={<Navigate to='/404' />} />
         </Route>

         <Route element={<DashboardLayout pageTitle={pageTitle} referenceLoading={loading} referenceError={error} retryReference={retry} />}>
            {workspaceRoutes({setPageTitle, customerData, setCustomerData})}
            <Route path='dashboard/*' element={<Suspense fallback={<RouteLoading/>}><DashboardRoutes setPageTitle={setPageTitle}/></Suspense>} />
         </Route>
      </Routes>
   );
}
