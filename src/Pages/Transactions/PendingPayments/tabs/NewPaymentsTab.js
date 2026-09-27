import React, { useState, useContext } from 'react';
import { Stack, Alert, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import usePendingPaymentList from '../usePendingPaymentList';
import { context } from '../../../../App';
import { softDeletePendingPayment } from '../../../../Services/ApiCalls/PendingPaymentsCalls';
import { getNewPaymentColumns } from '../components/PendingPaymentColumns';
import ReviewPaymentDialog from '../components/ReviewPaymentDialog';

export default function NewPaymentsTab({ customerData, setCustomerData, onCountsChanged }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
   const [feedback, setFeedback] = useState(null);
   const [selectedPayment, setSelectedPayment] = useState(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const {rows,totalCount,loading,error,loadData}=usePendingPaymentList({status: 'new', paginationModel});

   const handleDelete = async paymentId => {
      try {
         const result = await softDeletePendingPayment(paymentId, accountID, userID, token);
         if (result.status === 200) {
            setFeedback({ type: 'success', message: 'Payment deleted.' });
            setTimeout(() => setFeedback(null), 2000);
            loadData();
            onCountsChanged();
         } else {
            setFeedback({ type: 'error', message: result.message });
         }
      } catch (error) {
         setFeedback({ type: 'error', message: error.message || 'Delete failed.' });
      }
   };

   const handleRowClick = params => {
      setSelectedPayment(params.row);
      setDialogOpen(true);
   };

   const handleApproved = () => {
      loadData();
      onCountsChanged();
   };

   const columns = getNewPaymentColumns({ onDelete: handleDelete });

   return (
      <Stack spacing={2}>
         {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}

         {error && <Alert severity='error' action={<Button onClick={loadData}>Reload payments</Button>}>{error}</Alert>}
         {!error && <DataGrid
            localeText={{noRowsLabel: 'No new payments to review. Use Upload to add a payment file.', noResultsOverlayLabel: 'No payments match these filters.'}}
            rows={rows}
            columns={columns}
            getRowId={row => row.payment_id}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            rowCount={totalCount}
            paginationMode='server'
            loading={loading}
            onRowClick={handleRowClick}
            autoHeight
            sx={{
               cursor: 'pointer',
               '& .MuiDataGrid-row:hover': { backgroundColor: 'action.hover' }
            }}
         />}

         <ReviewPaymentDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            pendingPayment={selectedPayment}
            customerData={customerData}
            setCustomerData={setCustomerData}
            onApproved={handleApproved}
         />
      </Stack>
   );
}
