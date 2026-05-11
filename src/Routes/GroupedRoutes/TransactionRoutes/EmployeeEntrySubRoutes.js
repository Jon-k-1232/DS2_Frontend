import React, { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import EmployeeTrackerDashboard from '../../../Pages/Transactions/TransactionGrids/EmployeeTrackerDashboard';

export default function EmployeeTimeTrackerSubRoutes({ setPageTitle }) {
   const [refreshKey] = useState(new Date());

   useEffect(() => {
      if (setPageTitle) {
         setPageTitle('Tracking Administration');
      }
   }, [setPageTitle]);

   return (
      <Stack spacing={3}>
         <EmployeeTrackerDashboard refreshKey={refreshKey} />
      </Stack>
   );
}
