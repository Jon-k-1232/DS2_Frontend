import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { context } from '../../../../App';
import { TextField, Typography, Autocomplete, Box, Alert, Button } from '@mui/material';
import InitialSelectionOptions from '../AddTransaction/FormSubComponents/InitialSelectionOptions';
import ChargeOptions from '../AddTransaction/FormSubComponents/ChargeOptions';
import TimeOptions from '../AddTransaction/FormSubComponents/TimeOptions';
import RetainerSelection from '../AddTransaction/FormSubComponents/RetainerSelection';
import { putEditTransaction } from '../../../../Services/ApiCalls/PutCalls';
import { formObjectForTransactionPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';
import { formatTotal } from '../../../../Services/SharedFunctions';

import dayjs from 'dayjs';

const initialState = {
   transactionID: null,
   selectedDate: dayjs(),
   selectedCustomer: null,
   selectedGeneralWorkDescription: null,
   selectedJob: null,
   selectedTeamMember: null,
   detailedJobDescription: '',
   isTransactionBillable: null,
   isInAdditionToMonthlyCharge: null,
   unitCost: '',
   quantity: 1,
   transactionType: '',
   selectedRetainer: null
};

export default function EditTransaction({ customerData, setCustomerData, transactionData }) {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [selectedItems, setSelectedItems] = useState(initialState);
   const [postStatus, setPostStatus] = useState(null);

   const { quantity, unitCost, transactionType } = selectedItems;

   const {
      customersList: { activeCustomerData: { activeCustomers } = [] } = [],
      teamMembersList: { activeUserData: { activeUsers } = [] } = [],
      accountJobsList: { activeJobData: { activeJobs } = [] } = [],
      workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions } = [] } = [],
      accountRetainersList: { activeRetainerData: { activeRetainers } = [] } = []
   } = { ...customerData };

   const {
      transaction_id,
      customer_id,
      customer_job_id,
      detailed_work_description,
      is_excess_to_subscription,
      is_transaction_billable,
      logged_for_user_id,
      unit_cost,
      transaction_date,
      transaction_type,
      general_work_description_id,
      retainer_id
   } = transactionData || {};

   useEffect(() => {
      if (transactionData && Object.keys(transactionData).length) {
         setSelectedItems({
            ...selectedItems,
            transactionID: transaction_id,
            selectedCustomer: activeCustomers.find(customer => customer.customer_id === customer_id),
            selectedJob: activeJobs.find(job => job.customer_job_id === customer_job_id),
            selectedTeamMember: activeUsers.find(user => user.user_id === logged_for_user_id),
            isTransactionBillable: is_transaction_billable,
            detailedJobDescription: detailed_work_description,
            isInAdditionToMonthlyCharge: is_excess_to_subscription,
            unitCost: unit_cost,
            selectedDate: dayjs(transaction_date),
            transactionType: transaction_type,
            selectedGeneralWorkDescription: workDescriptions.find(workDescription => workDescription.general_work_description_id === general_work_description_id),
            selectedRetainer: activeRetainers.find(retainer => retainer.retainer_id === retainer_id) || null
         });
      }
      // eslint-disable-next-line
   }, [transactionData]);

   const handleSubmit = async () => {
      const dataToPost = formObjectForTransactionPost(selectedItems, loggedInUser);
      const postedItem = await putEditTransaction(dataToPost, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         setTimeout(() => setPostStatus(null), 2000);
         setSelectedItems(initialState);
         setCustomerData({ ...customerData, transactionsList: postedItem.transactionsList, accountRetainersList: postedItem.accountRetainersList, accountJobsList: postedItem.accountJobsList });
         navigate('/transactions/customerTransactions');
      }
   };

   return (
      <>
         <Box style={{ width: 'fit-content' }}>
            <InitialSelectionOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

            <Autocomplete
               size='small'
               sx={{ width: 350, marginTop: '10px' }}
               options={['Time', 'Charge']}
               getOptionLabel={option => option || ''}
               value={transactionType}
               isOptionEqualToValue={(option, value) => option === value || true}
               onChange={(e, value) => setSelectedItems({ ...selectedItems, transactionType: value })}
               renderInput={params => <TextField {...params} label='Transaction Type' variant='standard' />}
            />

            <RetainerSelection selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />

            {transactionType.toUpperCase() === 'CHARGE' && <ChargeOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />}

            {transactionType.toUpperCase() === 'TIME' && <TimeOptions customerData={customerData} selectedItems={selectedItems} setSelectedItems={data => setSelectedItems(data)} />}

            <Typography style={{ marginTop: '10px', fontSize: '18px' }} variant='body1'>
               Total: {formatTotal(quantity * unitCost)}
            </Typography>

            <Box style={{ margin: '10px', textAlign: 'center' }}>
               <Button onClick={handleSubmit}>Submit</Button>
               {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
            </Box>
         </Box>
      </>
   );
}
