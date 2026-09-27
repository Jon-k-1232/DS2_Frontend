import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import PageNavigationHeader from '../../../Components/PageNavigationHeader/PageNavigationHeader';
import DeleteTimeOrCharge from '../../../Pages/Transactions/TransactionForms/DeleteTransaction/DeleteTimeOrCharge';
import EditTransaction from '../../../Pages/Transactions/TransactionForms/EditTransaction/EditTransaction';
import { Alert, Link } from '@mui/material';
import { fetchSingleTransaction } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';
import ErrorBoundary from '../../../Components/ErrorBoundary';

export default function TransactionSubRoutes({ customerData, setCustomerData }) {
   const navigate = useNavigate();
   const location = useLocation();
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const { rowData } = location?.state ?? {};
   const { customer_id, transaction_id } = rowData ?? {};
   const [transactionData, setTransactionData] = useState({});
   const menuOptions = fetchMenuOptions(navigate, location.state).filter(option => option.value !== 'editTransaction' || (!transactionData.sent_locked && !transactionData.recurring_plan_id));
   const [error,setError] = useState('');

   useEffect(() => {
      let live = true;
      const fetchTransactionData = async () => {
         if (rowData) {
            try {
               const fetchTransaction = await fetchSingleTransaction(customer_id, transaction_id, accountID, userID, token);
               if(live) setTransactionData(fetchTransaction.activeTransactionsData?.transactionData?.[0] || {});
            } catch(e) { if(live) setError(e.response?.data?.message || 'Unable to load this transaction.'); }
         }
      };
      fetchTransactionData();
      return () => { live = false; };
      // eslint-disable-next-line
   }, [rowData]);

   if(error || (!rowData && !transactionData.transaction_id)) return <Alert severity='info'>{error || 'Select a transaction to view its details.'} <Link href='/transactions/customerTransactions'>Open transactions</Link></Alert>;
   if(!transactionData.transaction_id) return <Alert severity='info'>Loading transaction…</Alert>;
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
            <Route
               path='editTransaction'
               element={
                  <ErrorBoundary fallbackComponent='/transactions/customerTransactions'>
                     <EditTransaction customerData={customerData} setCustomerData={data => setCustomerData(data)} transactionData={transactionData} />
                  </ErrorBoundary>
               }
            />
         </Routes>
      </>
   );
}

const fetchMenuOptions = (navigate,state) => [
   {
      display: 'Delete Transaction',
      value: 'deleteTimeOrCharge',
      route: '/transactions/customerTransactions/deleteTimeOrCharge',
      onClick: () => navigate('/transactions/customerTransactions/deleteTimeOrCharge',{state})
   },
   {
      display: 'Edit Transaction',
      value: 'editTransaction',
      route: '/transactions/customerTransactions/editTransaction',
      onClick: () => navigate('/transactions/customerTransactions/editTransaction',{state})
   }
];
