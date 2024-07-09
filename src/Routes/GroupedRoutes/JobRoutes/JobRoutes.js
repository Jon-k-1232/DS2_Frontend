import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import JobsGrid from '../../../Pages/Jobs/JobGrids/JobsGrid';
import JobCatagoriesGrid from '../../../Pages/Jobs/JobGrids/JobCatagoriesGrid';
import Page from '../../../Components/Page';
import { Stack } from '@mui/material';
import JobTypesGrid from '../../../Pages/Jobs/JobGrids/JobTypesGrid';
import JobSubRoutes from './JobSubRoutes';
import JobTypeSubRoutes from './JobTypeSubRoutes';
import JobCategorySubRoutes from './JobCategorySubRoutes';
import WorkDescriptionsGrid from '../../../Pages/WorkDescriptions/WorkDescriptionGrids/WorkDescriptionGrids';
import WorkDescriptionSubRoutes from './WorkDescriptionSubRoutes';

export default function JobRoutes({ setPageTitle, customerData, setCustomerData }) {
  useEffect(() => {
    setPageTitle('Jobs');
    // eslint-disable-next-line
  }, []);

  return (
    <Page style={{ paddingTop: 0 }}>
      <Stack style={{ padding: '20px' }}>
        <Routes>
          <Route path='jobsList' element={<JobsGrid customerData={customerData} setCustomerData={e => setCustomerData(e)} />} />
          <Route
            path='jobCategoriesList'
            element={<JobCatagoriesGrid customerData={customerData} setCustomerData={e => setCustomerData(e)} />}
          />
          <Route path='jobTypesList' element={<JobTypesGrid customerData={customerData} setCustomerData={e => setCustomerData(e)} />} />
          <Route
            path='workDescriptionsList'
            element={<WorkDescriptionsGrid customerData={customerData} setCustomerData={e => setCustomerData(e)} />}
          />

          <Route
            path='/jobsList/*'
            element={<JobSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />}
          />
          <Route
            path='/jobTypesList/*'
            element={<JobTypeSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />}
          />
          <Route
            path='/jobCategoriesList/*'
            element={<JobCategorySubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />}
          />
          <Route
            path='/workDescriptionsList/*'
            element={<WorkDescriptionSubRoutes customerData={customerData} setCustomerData={data => setCustomerData(data)} />}
          />
        </Routes>
      </Stack>
    </Page>
  );
}
