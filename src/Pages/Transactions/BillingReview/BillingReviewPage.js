import { useEffect, useState } from 'react';
import { Box, Tab, Tabs, Typography, Stack } from '@mui/material';
import NeedsReviewTab from './tabs/NeedsReviewTab';
import ConsolidatedTab from './tabs/ConsolidatedTab';

export default function BillingReviewPage({ setPageTitle, customerData, setCustomerData }) {
   const [tab, setTab] = useState('needsReview');
   useEffect(() => {
      if (typeof setPageTitle === 'function') setPageTitle('Billing Review');
   }, [setPageTitle]);

   return (
      <Stack spacing={2}>
         <Typography variant='h5'>Billing Review</Typography>
         <Typography variant='body2' color='text.secondary'>
            Spot-check rows the AI couldn't auto-apply, review consolidated transactions for the period, and flag anomalies before invoices go out.
         </Typography>
         <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
               <Tab label='Needs Review' value='needsReview' />
               <Tab label='Processed & not billed' value='processedUnbilled' />
            </Tabs>
         </Box>
         <Box sx={{ pt: 2 }}>
            {tab === 'needsReview' && <NeedsReviewTab customerData={customerData} setCustomerData={setCustomerData} />}
            {tab === 'processedUnbilled' && <ConsolidatedTab period='unbilled' customerData={customerData} setCustomerData={setCustomerData} />}
         </Box>
      </Stack>
   );
}
