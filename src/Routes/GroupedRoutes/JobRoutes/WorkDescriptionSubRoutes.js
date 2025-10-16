import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleWorkDescription } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteWorkDescription from '../../../Pages/WorkDescriptions/WorkDescriptionForms/DeleteWorkDescription/DeleteWorkDescription';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function JobTypeSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { general_work_description_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [workDescriptionData, setWorkDescriptionData] = useState({});

   useEffect(() => {
      const fetchJobData = async () => {
         if (rowData) {
            const data = await fetchSingleWorkDescription(general_work_description_id, accountID, userID, token);
            setWorkDescriptionData(...data.activeWorkDescriptionData.workDescriptionData);
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
               path='deleteWorkDescription'
               element={
                  <ErrorBoundary fallbackComponent='/jobs/workDescriptionsList'>
                     <DeleteWorkDescription customerData={customerData} setCustomerData={data => setCustomerData(data)} workDescriptionData={workDescriptionData} />
                  </ErrorBoundary>
               }
            />
            {/* <Route
          path='editWorkDescription'
          element={
            <ErrorBoundary fallbackComponent='/jobs/workDescriptionsList'>
              <EditWorkDescription
                customerData={customerData}
                setCustomerData={data => setCustomerData(data)}
                workDescriptionData={workDescriptionData}
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
      display: 'Delete Work Description',
      value: 'deleteWorkDescription',
      route: '/jobs/workDescriptionsList/deleteWorkDescription',
      onClick: () => navigate('/jobs/workDescriptionsList/deleteWorkDescription')
   }
   // {
   //   display: 'Edit Work Description',
   //   value: 'editWorkDescription',
   //   route: '/jobs/workDescriptionsList/editWorkDescription',
   //   onClick: () => navigate('/jobs/workDescriptionsList/editWorkDescription')
   // }
];
