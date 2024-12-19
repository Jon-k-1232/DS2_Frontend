import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import TransactionsGrid from '../../../Pages/Transactions/TransactionGrids/TransactionsGrid';
import PaymentsGrid from '../../../Pages/Transactions/TransactionGrids/PaymentsGrid';
import WriteOffsGrid from '../../../Pages/Transactions/TransactionGrids/WriteOffsGrid';
import Page from '../../../Components/Page';
import { Stack } from '@mui/material';
import TransactionSubRoutes from './TransactionSubRoutes';
import PaymentSubRoutes from './PaymentSubRoutes';
import WriteOffSubRoutes from './WriteOffSubRoutes';
import RetainersGrid from '../../../Pages/Transactions/TransactionGrids/RetainersGrid';
import RetainerSubRoutes from './RetainerSubRoutes';
import EmployeeTimeTrackerSubRoutes from './EmployeeEntrySubRoutes';

export default function TransactionsRoutes({ setPageTitle, customerData, setCustomerData }) {
   useEffect(() => {
      setPageTitle('Transactions');
      // eslint-disable-next-line
   }, []);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route path='customerTransactions' element={<TransactionsGrid customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='customerPayments' element={<PaymentsGrid customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='customerWriteOffs' element={<WriteOffsGrid customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='customerRetainers' element={<RetainersGrid customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='/employeeTimeTrackerTransactions/*' element={<EmployeeTimeTrackerSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='/customerTransactions/*' element={<TransactionSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='/customerRetainers/*' element={<RetainerSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='/customerPayments/*' element={<PaymentSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
               <Route path='/customerWriteOffs/*' element={<WriteOffSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />} />
            </Routes>
         </Stack>
      </Page>
   );
}
