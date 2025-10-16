import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleRetainer } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteRetainer from '../../../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteRetainer';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function RetainerSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { retainer_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [retainerData, setRetainerData] = useState({});

   useEffect(() => {
      const fetchRetainerData = async () => {
         if (rowData) {
            const fetchPayment = await fetchSingleRetainer(retainer_id, accountID, userID, token);
            setRetainerData(...fetchPayment.activeRetainerData.activeRetainer);
         }
      };
      fetchRetainerData();
      // eslint-disable-next-line
   }, []);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteRetainer'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerRetainers'>
                     <DeleteRetainer customerData={customerData} setCustomerData={data => setCustomerData(data)} retainerData={retainerData} />
                  </ErrorBoundary>
               }
            />
            {/* 
            Edit Retainer is not implemented yet
            
            <Route
          path='editRetainer'
          element={
            <ErrorBoundary fallbackComponent='/transactions/customerRetainers'>
              <EditRetainer customerData={customerData} setCustomerData={data => setCustomerData(data)} retainerData={retainerData} />
            </ErrorBoundary>
          }
        /> */}
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete Retainer',
      value: 'deleteRetainer',
      route: '/transactions/customerRetainers/deleteRetainer',
      onClick: () => navigate('/transactions/customerRetainers/deleteRetainer')
   }
   // {
   //   display: 'Edit Retainer',
   //   value: 'editRetainer',
   //   route: '/transactions/customerRetainers/editRetainer',
   //   onClick: () => navigate('/transactions/customerRetainers/editRetainer')
   // }
];
