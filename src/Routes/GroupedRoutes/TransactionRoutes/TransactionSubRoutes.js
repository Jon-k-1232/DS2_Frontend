import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import DeleteTimeOrCharge from '../../../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteTimeOrCharge';
import EditTransaction from '../../../Pages/Transactions/TransactionForms/EditTransaction/EditTransaction';
import { fetchSingleTransaction } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function TransactionSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { customer_id, transaction_id } = rowData ?? {};
   const menuOptions = fetchMenuOptions(navigate);

   const [transactionData, setTransactionData] = useState({});

   useEffect(() => {
      const fetchTransactionData = async () => {
         if (rowData) {
            const fetchTransaction = await fetchSingleTransaction(customer_id, transaction_id, accountID, userID, token);
            setTransactionData(...fetchTransaction.activeTransactionsData.transactionData);
         }
      };
      fetchTransactionData();
      // eslint-disable-next-line
   }, [rowData]);

   return (
      <>
         <PageNavigationHeader menuOptions={menuOptions} onClickNavigation={() => {}} currentLocation={location} />

         <Routes>
            <Route
               path='deleteTimeOrCharge'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerTransactions'>
                     <DeleteTimeOrCharge customerData={customerData} setCustomerData={data => setCustomerData(data)} transactionData={transactionData} />
                  </ErrorBoundary>
               }
            />
            {/* <Route
               path='editTransaction'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerTransactions'>
                     <EditTransaction customerData={customerData} setCustomerData={data => setCustomerData(data)} transactionData={transactionData} />
                  </ErrorBoundary>
               }
            /> */}
         </Routes>
      </>
   );
}

const fetchMenuOptions = navigate => [
   {
      display: 'Delete Transaction',
      value: 'deleteTimeOrCharge',
      route: '/transactions/customerTransactions/deleteTimeOrCharge',
      onClick: () => navigate('/transactions/customerTransactions/deleteTimeOrCharge')
   }
   // {
   //    display: 'Edit Transaction',
   //    value: 'editTransaction',
   //    route: '/transactions/customerTransactions/editTransaction',
   //    onClick: () => navigate('/transactions/customerTransactions/editTransaction')
   // }
];
