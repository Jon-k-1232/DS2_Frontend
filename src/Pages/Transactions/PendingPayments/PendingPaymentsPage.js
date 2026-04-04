import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Box, Tab, Badge, Stack } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { context } from '../../../App';
import { fetchPendingPaymentCounts } from '../../../Services/ApiCalls/PendingPaymentsCalls';
import NewPaymentsTab from './tabs/NewPaymentsTab';
import ProcessedPaymentsTab from './tabs/ProcessedPaymentsTab';
import AllPaymentsTab from './tabs/AllPaymentsTab';
import UploadTab from './tabs/UploadTab';

export default function PendingPaymentsPage({ customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [activeTab, setActiveTab] = useState('new');
   const [counts, setCounts] = useState({ newPayments: 0, processed: 0, all: 0 });

   const refreshCounts = useCallback(async () => {
      if (!accountID || !userID || !token) return;
      const response = await fetchPendingPaymentCounts(accountID, userID, token);
      if (response?.counts) setCounts(response.counts);
   }, [accountID, userID, token]);

   useEffect(() => {
      refreshCounts();
   }, [refreshCounts]);

   const tabLabel = (label, count) => (
      <span style={{ paddingRight: count > 0 ? 20 : 0 }}>
         {label}{count > 0 && <Badge badgeContent={count} color='primary' max={999} sx={{ ml: 2 }} />}
      </span>
   );

   return (
      <Stack spacing={2}>
         <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
               <TabList onChange={(_, value) => setActiveTab(value)} aria-label='Pending payments tabs'>
                  <Tab label={tabLabel('New Payments', counts.newPayments)} value='new' />
                  <Tab label='Processed' value='processed' />
                  <Tab label={tabLabel('All Payments', counts.all)} value='all' />
                  <Tab label='Upload' value='upload' />
               </TabList>
            </Box>

            <TabPanel value='new' sx={{ p: 0, pt: 2 }}>
               <NewPaymentsTab customerData={customerData} setCustomerData={setCustomerData} onCountsChanged={refreshCounts} />
            </TabPanel>

            <TabPanel value='processed' sx={{ p: 0, pt: 2 }}>
               <ProcessedPaymentsTab />
            </TabPanel>

            <TabPanel value='all' sx={{ p: 0, pt: 2 }}>
               <AllPaymentsTab />
            </TabPanel>

            <TabPanel value='upload' sx={{ p: 0, pt: 2 }}>
               <UploadTab onCountsChanged={refreshCounts} />
            </TabPanel>
         </TabContext>
      </Stack>
   );
}
