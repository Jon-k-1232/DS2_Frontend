import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Stack } from '@mui/material';
import Page from '../../../Components/Page';
import BillingPerformancePage from '../../../Pages/Analytics/BillingPerformancePage';
import ClientRatesPage from '../../../Pages/Analytics/ClientRatesPage';
import TimeAllocationPage from '../../../Pages/Analytics/TimeAllocationPage';
import WipAgingPage from '../../../Pages/Analytics/WipAgingPage';
import JobBudgetsPage from '../../../Pages/Analytics/JobBudgetsPage';
import TaxSeasonCapacityPage from '../../../Pages/Analytics/TaxSeasonCapacityPage';

export function BillingPerformanceRoute({ setPageTitle }) {
   useEffect(() => { setPageTitle('Billing Performance'); }, [setPageTitle]);
   return <Page style={{ paddingTop: 0 }}><Stack style={{ padding: '20px' }}><BillingPerformancePage /></Stack></Page>;
}

export default function AnalyticsRoutes({ setPageTitle }) {
   useEffect(() => {
      setPageTitle('Analytics');
      // eslint-disable-next-line
   }, []);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route path="billingPerformance" element={<BillingPerformancePage />} />
               <Route path='clientRates' element={<ClientRatesPage />} />
               <Route path='timeAllocation' element={<TimeAllocationPage />} />
               <Route path='wipAging' element={<WipAgingPage />} />
               <Route path='jobBudgets' element={<JobBudgetsPage />} />
               <Route path='taxSeasonCapacity' element={<TaxSeasonCapacityPage />} />
            </Routes>
         </Stack>
      </Page>
   );
}
