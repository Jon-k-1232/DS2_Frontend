import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import { fetchSinglePayment, fetchCustomerProfileInformation } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import DeletePayment from '../../../Pages/Transactions/TransactionForms/DeleteTransaction/DeletePayment';
import EditPayment from '../../../Pages/Transactions/TransactionForms/EditTransaction/EditPayment';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function PaymentSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { customer_id, payment_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [paymentData, setPaymentData] = useState({});
   const [customerProfileData, setCustomerProfileData] = useState([]);

   useEffect(() => {
      const fetchPaymentData = async () => {
         if (rowData) {
            const fetchPayment = await fetchSinglePayment(payment_id, accountID, userID, token);
            const customerInfo = await fetchCustomerProfileInformation(accountID, userID, customer_id, token);
            setPaymentData(...fetchPayment.activePaymentData.activePayments);
            setCustomerProfileData({ ...customerInfo });
         }
      };
      fetchPaymentData();
      // eslint-disable-next-line
   }, [rowData]);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deletePayment'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerPayments'>
                     <DeletePayment customerData={customerData} setCustomerData={data => setCustomerData(data)} paymentData={paymentData} customerProfileData={customerProfileData} />
                  </ErrorBoundary>
               }
            />
            {/* 
            Edit is not implemented yet

            <Route
          path='editPayment'
          element={
            <ErrorBoundary fallbackComponent='/transactions/customerPayments'>
              <EditPayment
                customerData={customerData}
                setCustomerData={data => setCustomerData(data)}
                paymentData={paymentData}
                customerProfileData={customerProfileData}
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
      display: 'Delete Payment',
      value: 'deletePayment',
      route: '/transactions/customerPayments/deletePayment',
      onClick: () => navigate('/transactions/customerPayments/deletePayment')
   }
   // {
   //   display: 'Edit Payment',
   //   value: 'editPayment',
   //   route: '/transactions/customerPayments/editPayment',
   //   onClick: () => navigate('/transactions/customerPayments/editPayment')
   // }
];
