import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Alert } from '@mui/material';
import { useLocation, useNavigate, useParams, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';
import CustomerProfile from '../../../Pages/Customer/CustomerProfile/CustomerProfile';
import CustomerProfileInvoices from '../../../Pages/Customer/CustomerProfile/CustomerProfileInvoices';
import CustomerProfileTransactions from '../../../Pages/Customer/CustomerProfile/CustomerProfileTransactions';
import CustomerProfileJobs from '../../../Pages/Customer/CustomerProfile/CustomerProfileJobs';
import EditCustomerProfile from '../../../Pages/Customer/CustomerProfile/EditCustomerProfile';
import CustomerRetainers from '../../../Pages/Customer/CustomerProfile/CustomerRetainers';
import CustomerProfilePayments from '../../../Pages/Customer/CustomerProfile/CustomerProfilePayments';
import CustomerProfileAIAudit from '../../../Pages/Customer/CustomerProfile/CustomerProfileAIAudit';
import AuditorProtectedAccessRoute, { canAccessAccountAudit } from '../../AuditorProtectedAccess';
import { context } from '../../../App';

// CustomerProfileSubRoutes — customer_id lives in the URL (`/customers/customersList/customerProfile/:customerId/...`).
// This means Back/Forward navigation works "for free": the URL is the source of truth,
// not location.state, sessionStorage, or context. Reloading or sharing a profile URL
// also works without any extra plumbing.
export default function CustomerProfileSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { customerId } = useParams();
   const customerID = customerId ? Number(customerId) : null;
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   // null means "no successful load yet" (either still loading, or the last
   // attempt failed) — distinct from {} which used to mean both "loading" and
   // "loaded an empty/failed response" at once, so nothing could ever gate on it.
   const [profileData, setProfileData] = useState(null);
   const [callProfileData, setCallProfileData] = useState(new Date());

   const basePath = customerID ? `/customers/customersList/customerProfile/${customerID}` : '/customers/customersList/customerProfile';

   const menuOptions = useMemo(
      () => fetchMenuOptions(navigate, canAccessAccountAudit(loggedInUser), basePath),
      [navigate, loggedInUser, basePath]
   );

   useEffect(() => {
      if (!customerID || Number.isNaN(customerID)) {
         navigate('/customers/customersList');
         return;
      }
      // A customerID change (or callProfileData refresh) fires a new request
      // while an older one may still be in flight — without this guard, a
      // slower stale response landing after a faster newer one would
      // overwrite it with the WRONG customer's data (or a stale error).
      let cancelled = false;
      setProfileData(null);
      const apiCall = async () => {
         const fetchCustomerInformation = await fetchCustomerProfileInformation(accountID, userID, customerID, token);
         if (!cancelled) setProfileData(fetchCustomerInformation);
      };
      apiCall();
      return () => {
         cancelled = true;
      };
   }, [customerID, callProfileData, accountID, userID, token, navigate]);

   if (!profileData) {
      return (
         <>
            <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />
            <div role='status'>Loading...</div>
         </>
      );
   }

   // Successful load contract: status 200 AND the real contact record
   // (customerByID's actual shape, customerData.customerData). Anything else —
   // a real HTTP 404, a body-shaped {status:404,...} error, a 500 — is not a
   // customer to render tabs/an edit form for.
   if (profileData.status !== 200 || !profileData.customerData?.customerData) {
      return (
         <>
            <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />
            <Alert severity='error'>{profileData.message || 'Customer not found.'}</Alert>
         </>
      );
   }

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         {!location.pathname.endsWith('/editCustomerProfile') && <CustomerProfile profileData={profileData} />}

         <Routes>
            <Route path='customerInvoices' element={<CustomerProfileInvoices profileData={profileData} />} />
            <Route path='customerTransactions' element={<CustomerProfileTransactions profileData={profileData} />} />
            <Route path='customerJobs' element={<CustomerProfileJobs profileData={profileData} setCustomerData={setCustomerData} />} />
            <Route path='customerPayments' element={<CustomerProfilePayments profileData={profileData} />} />
            <Route path='retainersAndPrePayments' element={<CustomerRetainers profileData={profileData} />} />
            <Route
               path='aiAudit'
               element={
                  <AuditorProtectedAccessRoute>
                     <CustomerProfileAIAudit profileData={profileData} />
                  </AuditorProtectedAccessRoute>
               }
            />
            <Route
               path='editCustomerProfile'
               element={
                  <EditCustomerProfile
                     profileData={profileData}
                     setProfileData={data => setProfileData({ ...profileData, data })}
                     customerData={customerData}
                     setCustomerData={data => setCustomerData(data)}
                     setCallProfileData={data => setCallProfileData(data)}
                  />
               }
            />
         </Routes>
      </>
   );
}

const fetchMenuOptions = (navigate, showAudit, basePath) => [
   {
      display: 'Invoices',
      value: 'customerInvoices',
      route: `${basePath}/customerInvoices`,
      onClick: () => navigate(`${basePath}/customerInvoices`)
   },
   {
      display: 'Transactions',
      value: 'customerTransactions',
      route: `${basePath}/customerTransactions`,
      onClick: () => navigate(`${basePath}/customerTransactions`)
   },
   {
      display: 'Jobs',
      value: 'customerJobs',
      route: `${basePath}/customerJobs`,
      onClick: () => navigate(`${basePath}/customerJobs`)
   },
   {
      display: 'Payments',
      value: 'customerPayments',
      route: `${basePath}/customerPayments`,
      onClick: () => navigate(`${basePath}/customerPayments`)
   },
   {
      display: 'Retainers and PrePayments',
      value: 'retainersAndPrePayments',
      route: `${basePath}/retainersAndPrePayments`,
      onClick: () => navigate(`${basePath}/retainersAndPrePayments`)
   },
   ...(showAudit
      ? [
           {
              display: 'AI Audit',
              value: 'aiAudit',
              route: `${basePath}/aiAudit`,
              onClick: () => navigate(`${basePath}/aiAudit`)
           }
        ]
      : []),
   {
      display: 'Edit Customer Profile',
      value: 'editCustomerProfile',
      route: `${basePath}/editCustomerProfile`,
      onClick: () => navigate(`${basePath}/editCustomerProfile`)
   }
];
