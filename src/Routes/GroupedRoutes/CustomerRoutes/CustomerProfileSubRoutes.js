import EntityPicker from '../../../Components/BillingEntities/EntityPicker';
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Alert, Button } from '@mui/material';
import { useLocation, useNavigate, useParams, Routes, Route, Link } from 'react-router-dom';
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
import CustomerProfileAuditRecord from '../../../Pages/Customer/CustomerProfile/CustomerProfileAuditRecord';
import AuditRecordProtectedAccess, { canAccessAuditRecord } from '../../AuditRecordProtectedAccess';
import AuditorProtectedAccessRoute, { canAccessAccountAudit } from '../../AuditorProtectedAccess';
import { context } from '../../../App';

// CustomerProfileSubRoutes — customer_id lives in the URL (`/clients/:customerId/...`).
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
   const [entitySelection,setEntitySelection]=useState({});
   const entityId=entitySelection.customerId===customerId?entitySelection.entityId:null;
   const setEntityId=value=>setEntitySelection({customerId,entityId:value});
   const [profileData, setProfileData] = useState(null);
   const [callProfileData, setCallProfileData] = useState(new Date());

   const basePath = customerID ? `/clients/${customerID}` : '/clients';

   const menuOptions = useMemo(
      () => fetchMenuOptions(navigate, canAccessAccountAudit(loggedInUser), basePath, canAccessAuditRecord(loggedInUser)),
      [navigate, loggedInUser, basePath]
   );

   useEffect(() => {
      if (!customerID || Number.isNaN(customerID)) {
         navigate('/clients');
         return;
      }
      // A customerID change (or callProfileData refresh) fires a new request
      // while an older one may still be in flight — without this guard, a
      // slower stale response landing after a faster newer one would
      // overwrite it with the WRONG customer's data (or a stale error).
      let cancelled = false;
      setProfileData(null);
      const apiCall = async () => {
         const fetchCustomerInformation = await fetchCustomerProfileInformation(accountID, userID, customerID, token, entityId);
         if (!cancelled) setProfileData(fetchCustomerInformation);
      };
      apiCall();
      return () => {
         cancelled = true;
      };
   }, [customerID, callProfileData, accountID, userID, token, navigate, entityId]);

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

         <EntityPicker all value={entityId} onChange={setEntityId} customerId={customerID} />
         <Button component={Link} to={`/payments/receive?customerId=${customerID}${entityId?'&entityId='+entityId:''}`}>Receive payment for this client</Button>
         {!location.pathname.endsWith('/edit') && <CustomerProfile profileData={profileData} entityId={entityId} />}

         <Routes>
            <Route path='statements' element={<CustomerProfileInvoices profileData={profileData} />} />
            <Route path='work' element={<CustomerProfileTransactions profileData={profileData} />} />
            <Route path='jobs' element={<CustomerProfileJobs profileData={profileData} setCustomerData={setCustomerData} />} />
            <Route path='receipts' element={<CustomerProfilePayments entityId={entityId} profileData={profileData} />} />
            <Route path='credits' element={<CustomerRetainers entityId={entityId} profileData={profileData} onChanged={() => setCallProfileData(new Date())} />} />
            <Route
               path='aiAudit'
               element={
                  <AuditorProtectedAccessRoute>
                     <CustomerProfileAIAudit profileData={profileData} />
                  </AuditorProtectedAccessRoute>
               }
            />
            <Route
               path='edit'
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
            <Route path='auditRecord' element={<AuditRecordProtectedAccess><CustomerProfileAuditRecord profileData={profileData} entityId={entityId} /></AuditRecordProtectedAccess>} />
         </Routes>
      </>
   );
}

export const fetchMenuOptions = (navigate, showAudit, basePath, showAuditRecord = false) => [
   {display:'Overview',value:'overview',route:basePath},
   {
      display: 'Statements',
      value: 'statements',
      route: `${basePath}/statements`,
      onClick: () => navigate(`${basePath}/statements`)
   },
   {
      display: 'Work',
      value: 'work',
      route: `${basePath}/work`,
      onClick: () => navigate(`${basePath}/work`)
   },
   {
      display: 'Jobs',
      value: 'jobs',
      route: `${basePath}/jobs`,
      onClick: () => navigate(`${basePath}/jobs`)
   },
   {
      display: 'Receipts',
      value: 'receipts',
      route: `${basePath}/receipts`,
      onClick: () => navigate(`${basePath}/receipts`)
   },
   {
      display: 'Credits & retainers',
      value: 'credits',
      route: `${basePath}/credits`,
      onClick: () => navigate(`${basePath}/credits`)
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
   ...(showAuditRecord ? [{display:'Audit Record',value:'auditRecord',route:`${basePath}/auditRecord`,onClick:()=>navigate(`${basePath}/auditRecord`)}] : []),
   {
      display: 'Edit client',
      value: 'edit',
      route: `${basePath}/edit`,
      onClick: () => navigate(`${basePath}/edit`)
   }
];
