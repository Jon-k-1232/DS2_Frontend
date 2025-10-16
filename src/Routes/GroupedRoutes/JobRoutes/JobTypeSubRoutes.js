import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleJobType } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteJobTypes from '../../../Pages/Jobs/JobForms/DeleteJob/DeleteJobTypes';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function JobTypeSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { job_type_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [jobTypeData, setJobTypeData] = useState({});

   useEffect(() => {
      const fetchJobData = async () => {
         if (rowData) {
            const data = await fetchSingleJobType(job_type_id, accountID, userID, token);
            setJobTypeData(...data.activeJobData.activeJobs);
         }
      };
      fetchJobData();
      // eslint-disable-next-line
   }, [rowData]);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteJobType'
               element={
                  <ErrorBoundary fallbackComponent='/jobs/jobTypesList'>
                     <DeleteJobTypes customerData={customerData} setCustomerData={data => setCustomerData(data)} jobTypeData={jobTypeData} />
                  </ErrorBoundary>
               }
            />
            {/* <Route
          path='editJobType'
          element={
            <ErrorBoundary fallbackComponent='/jobs/jobTypesList'>
              <EditJobTypes customerData={customerData} setCustomerData={data => setCustomerData(data)} jobTypeData={jobTypeData} />
            </ErrorBoundary>
          }
        /> */}
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete Job Type',
      value: 'deleteJobType',
      route: '/jobs/jobTypesList/deleteJobType',
      onClick: () => navigate('/jobs/jobTypesList/deleteJobType')
   }
   // {
   //   display: 'Edit Job Type',
   //   value: 'editJobType',
   //   route: '/jobs/jobTypesList/editJobType',
   //   onClick: () => navigate('/jobs/jobTypesList/editJobType')
   // }
];
