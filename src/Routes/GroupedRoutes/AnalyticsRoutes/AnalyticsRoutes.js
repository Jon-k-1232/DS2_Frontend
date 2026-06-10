import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Stack } from '@mui/material';
import Page from '../../../Components/Page';
import ClientRatesPage from '../../../Pages/Analytics/ClientRatesPage';
import TimeAllocationPage from '../../../Pages/Analytics/TimeAllocationPage';

export default function AnalyticsRoutes({ setPageTitle }) {
   useEffect(() => {
      setPageTitle('Analytics');
      // eslint-disable-next-line
   }, []);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route path='clientRates' element={<ClientRatesPage />} />
               <Route path='timeAllocation' element={<TimeAllocationPage />} />
            </Routes>
         </Stack>
      </Page>
   );
}
