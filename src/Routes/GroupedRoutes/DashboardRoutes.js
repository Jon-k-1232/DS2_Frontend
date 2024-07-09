import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
// import PageNavigationHeader from '../../Components/PageNavigationHeader/PageNavigationHeader';
import Dashboard from '../../Pages/Dashboard/Dashboard';
import Page from '../../Components/Page';
import { Stack } from '@mui/material';

export default function DashboardRoutes({ setPageTitle }) {
  useEffect(() => {
    setPageTitle('Dashboard');
    // eslint-disable-next-line
  }, []);

  return (
    <Page style={{ paddingTop: 0 }}>
      <Stack style={{ padding: '20px' }}>
        <Routes>
          <Route path='/' element={<Dashboard />} />
        </Routes>
      </Stack>
    </Page>
  );
}
