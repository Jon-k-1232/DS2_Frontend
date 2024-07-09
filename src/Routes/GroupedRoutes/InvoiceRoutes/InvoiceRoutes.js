import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Page from '../../../Components/Page';
import InvoicesGrid from '../../../Pages/Invoices/InvoiceGrids/InvoicesGrid';
import QuotesGrid from '../../../Pages/Invoices/InvoiceGrids/QuotesGrid';
import CreateNewInvoices from '../../../Pages/Invoices/CreateNewInvoice/CreateNewInvoices';
import { Stack } from '@mui/material';
import ErrorBoundary from '../../../Components/ErrorBoundary';
import InvoiceSubRoutes from './InvoiceSubRoutes';

export default function InvoiceRoutes({ setPageTitle, customerData, setCustomerData }) {
   useEffect(() => {
      setPageTitle('Invoices');
      // eslint-disable-next-line
   }, []);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route path='invoices' element={<InvoicesGrid customerData={customerData} setCustomerData={setCustomerData} />} />
               <Route path='quotes' element={<QuotesGrid customerData={customerData} setCustomerData={setCustomerData} />} />
               <Route path='createInvoice' element={<CreateNewInvoices customerData={customerData} setCustomerData={e => setCustomerData(e)} />} />
               {/* <Route path='createQuote' element={<WriteOff customerData={customerData} setCustomerData={e => setCustomerData(e)} />} /> */}
               <Route
                  path='/invoices/invoiceDetail/*'
                  element={
                     <ErrorBoundary fallbackComponent='/invoices'>
                        <InvoiceSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />
                     </ErrorBoundary>
                  }
               />
            </Routes>
         </Stack>
      </Page>
   );
}
