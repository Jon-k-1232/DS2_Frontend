import { Stack } from '@mui/material';
// import { useEffect } from 'react';
// import { fetchAllEmployeeTransactionsBetweenDates } from '../../Services/EmployeeService';

export default function EmployeeTimeWidget() {
   //    useEffect(() => {
   //       fetchAllEmployeeTransactionsBetweenDates();
   //    }, []);

   return (
      <>
         {/* Dashboard.js already renders the page's single "Welcome" <h1> above
             this widget — this component used to render its own second copy,
             which doubled the heading in the DOM. This widget's real content
             (the commented-out fetch above) was never finished; render nothing
             extra until it is. */}
         <Stack style={{ display: 'contents' }} />
      </>
   );
}
