import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useParams, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchCustomerInvoiceInformation } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import SelectionRecovery from '../../../Components/Workspace/SelectionRecovery';
import {validId} from '../../routePaths';
import { Alert, Button, Stack } from '@mui/material';
import InvoiceTransactions from '../../../Pages/Invoices/InvoiceDetails/InvoiceTransactions';
import InvoicePayments from '../../../Pages/Invoices/InvoiceDetails/InvoicePayments';
import InvoiceWriteOffs from '../../../Pages/Invoices/InvoiceDetails/InvoiceWriteOffs';
import InvoiceOutstandingInvoices from '../../../Pages/Invoices/InvoiceDetails/InvoiceOutstandingInvoices';
import InvoiceRetainers from '../../../Pages/Invoices/InvoiceDetails/InvoiceRetainers';
import InvoiceDetails from '../../../Pages/Invoices/InvoiceDetails/InvoiceDetails';

export default function InvoiceRoutes({ customerData, setCustomerData }) {
   const {invoiceId} = useParams();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const selectedInvoiceID=validId(invoiceId)?Number(invoiceId):null;
   const basePath=`/billing/invoices/${invoiceId}`;
   const menuOptions=fetchMenuOptions(basePath);
   const [invoiceData,setInvoiceData]=useState(null);
   const [postStatus,setPostStatus]=useState(null);
   const [loadError,setLoadError]=useState(null);
   const [retry,setRetry]=useState(0);

   useEffect(() => {
      let live = true;
      if (selectedInvoiceID) {
         setInvoiceData(null);
         setPostStatus(null);
         setLoadError(null);
         const apiCall = async () => {
            const fetchInvoiceInformation = await fetchCustomerInvoiceInformation(accountID, userID, selectedInvoiceID, token);
            if (!live) return;
            if (fetchInvoiceInformation.status !== 200 || Number(fetchInvoiceInformation.invoiceDetails?.customer_invoice_id) !== selectedInvoiceID) {
               setLoadError(fetchInvoiceInformation.message || 'Unable to load invoice. It may be missing or outside your account.');
               return;
            }
            setInvoiceData({ ...fetchInvoiceInformation });

         };
         apiCall();
      }
   return () => { live = false; };
   }, [accountID, userID, token, selectedInvoiceID, retry]);

   if(!selectedInvoiceID)return <SelectionRecovery/>;
   if(loadError)return <Stack spacing={2}><Alert severity='error'>{loadError}</Alert><Button onClick={()=>setRetry(n=>n+1)}>Try again</Button></Stack>;
   if(!invoiceData)return <div role='status'>Loading invoice…</div>;

   return (
      <>
         <Stack>
            <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />
            <InvoiceDetails key={selectedInvoiceID} invoiceData={invoiceData} postStatus={postStatus} setPostStatus={data => setPostStatus(data)} />

            <Routes>
               <Route index element={<InvoiceTransactions invoiceData={invoiceData}/>} />
               <Route path='work' element={<InvoiceTransactions invoiceData={invoiceData} />} />
               <Route path='payments' element={<InvoicePayments invoiceData={invoiceData} />} />
               <Route path='write-offs' element={<InvoiceWriteOffs invoiceData={invoiceData} />} />
               <Route path='balance-forward' element={<InvoiceOutstandingInvoices invoiceData={invoiceData} />} />
               <Route path='retainers' element={<InvoiceRetainers invoiceData={invoiceData} />} />
            </Routes>
         </Stack>
      </>
   );
}

const fetchMenuOptions = basePath => [
   {
      display: 'Transactions',
      value: 'work',
      route: `${basePath}/work`
   },
   {
      display: 'Payments',
      value: 'payments',
      route: `${basePath}/payments`
   },
   {
      display: 'Write Offs',
      value: 'write-offs',
      route: `${basePath}/write-offs`
   },
   {
      display: 'Outstanding Invoices',
      value: 'balance-forward',
      route: `${basePath}/balance-forward`
   },
   {
      display: 'Retainers',
      value: 'retainers',
      route: `${basePath}/retainers`
   }
];
