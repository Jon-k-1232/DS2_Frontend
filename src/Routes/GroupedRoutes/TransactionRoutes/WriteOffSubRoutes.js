import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSingleWriteOff } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeleteWriteOff from '../../../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteWriteOff';
import EditWriteOff from '../../../Pages/Transactions/TransactionForms/EditTransaction/EditWriteOff';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function WriteOffSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { writeoff_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [writeOffData, setWriteOffData] = useState({});

   useEffect(() => {
      const fetchWriteOffData = async () => {
         if (rowData) {
            const fetchPayment = await fetchSingleWriteOff(writeoff_id, accountID, userID, token);
            setWriteOffData(...fetchPayment.activeWriteOffsData.activeWriteOffs);
         }
      };
      fetchWriteOffData();
      // eslint-disable-next-line
   }, [rowData]);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteWriteOff'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerWriteOffs'>
                     <DeleteWriteOff customerData={customerData} setCustomerData={data => setCustomerData(data)} writeOffData={writeOffData} />
                  </ErrorBoundary>
               }
            />
            {/* <Route
          path='editWriteOff'
          element={
            <ErrorBoundary fallbackComponent='/transactions/customerWriteOffs'>
              <EditWriteOff customerData={customerData} setCustomerData={data => setCustomerData(data)} writeOffData={writeOffData} />
            </ErrorBoundary>
          }
        /> */}
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete Write Off',
      value: 'deleteWriteOff',
      route: '/transactions/customerWriteOffs/deleteWriteOff',
      onClick: () => navigate('/transactions/customerWriteOffs/deleteWriteOff')
   }
   // {
   //   display: 'Edit Write Off',
   //   value: 'editWriteOff',
   //   route: '/transactions/customerWriteOffs/editWriteOff',
   //   onClick: () => navigate('/transactions/customerWriteOffs/editWriteOff')
   // }
];
