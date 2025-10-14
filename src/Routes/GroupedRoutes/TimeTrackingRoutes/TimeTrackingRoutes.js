import React, { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import Page from '../../../Components/Page';
import UploadTimeTracker from '../../../Pages/TimeTracking/Upload/UploadTimeTracker';
import TimeTrackerHistory from '../../../Pages/TimeTracking/History/TimeTrackerHistory';
import UpdateTimeTrackerTemplate from '../../../Pages/TimeTracking/TemplateUpdate/UpdateTimeTrackerTemplate';
import AdminProtectedAccessRoute from '../../AdminProtectedAccess';

export default function TimeTrackingRoutes({ setPageTitle }) {
   useEffect(() => {
      setPageTitle('Time Tracking');
   }, [setPageTitle]);

   return (
      <Page style={{ paddingTop: 0 }}>
         <Stack style={{ padding: '20px' }}>
            <Routes>
               <Route path='upload' element={<UploadTimeTracker setPageTitle={setPageTitle} />} />
               <Route path='history' element={<TimeTrackerHistory setPageTitle={setPageTitle} />} />
               <Route
                  path='update-template'
                  element={
                     <AdminProtectedAccessRoute>
                        <UpdateTimeTrackerTemplate setPageTitle={setPageTitle} />
                     </AdminProtectedAccessRoute>
                  }
               />
               <Route path='*' element={<Navigate to='upload' replace />} />
            </Routes>
         </Stack>
      </Page>
   );
}
