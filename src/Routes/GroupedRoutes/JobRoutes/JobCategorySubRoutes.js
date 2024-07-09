import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleJobCategory } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteJobCategory from '../../../Pages/Jobs/JobForms/DeleteJob/DeleteJobCategory';
import EditJobCategory from '../../../Pages/Jobs/JobForms/EditJob/EditJobCategory';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function JobCategorySubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { customer_job_category_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [jobCategoryData, setJobCategoryData] = useState({});

   useEffect(() => {
      const fetchJobData = async () => {
         if (rowData) {
            const data = await fetchSingleJobCategory(customer_job_category_id, accountID, userID, token);
            setJobCategoryData(...data.activeJobCategoriesData.activeJobCategory);
         }
      };
      fetchJobData();
      // eslint-disable-next-line
   }, []);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteJobCategory'
               element={
                  <ErrorBoundary fallbackComponent='/jobs/jobCategoriesList'>
                     <DeleteJobCategory customerData={customerData} setCustomerData={data => setCustomerData(data)} jobCategoryData={jobCategoryData} />
                  </ErrorBoundary>
               }
            />
            {/* <Route
          path='editJobCategory'
          element={
            <ErrorBoundary fallbackComponent='/jobs/jobCategoriesList'>
              <EditJobCategory
                customerData={customerData}
                setCustomerData={data => setCustomerData(data)}
                jobCategoryData={jobCategoryData}
              />
            </ErrorBoundary>
          }
        /> */}
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete Job Category',
      value: 'deleteJobCategory',
      route: '/jobs/jobCategoriesList/deleteJobCategory',
      onClick: () => navigate('/jobs/jobCategoriesList/deleteJobCategory')
   }
   //  {
   //     display: 'Edit Job Category',
   //     value: 'editJobCategory',
   //     route: '/jobs/jobCategoriesList/editJobCategory',
   //     onClick: () => navigate('/jobs/jobCategoriesList/editJobCategory')
   //  }
];
