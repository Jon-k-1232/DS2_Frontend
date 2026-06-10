import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Stack, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import { context } from '../../../../App';
import { fetchPendingPayments } from '../../../../Services/ApiCalls/PendingPaymentsCalls';
import { getAllPaymentColumns } from '../components/PendingPaymentColumns';
import PaymentPdfPreview from '../components/PaymentPdfPreview';

export default function AllPaymentsTab() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [rows, setRows] = useState([]);
   const [loading, setLoading] = useState(false);
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
   const [totalCount, setTotalCount] = useState(0);
   const [viewFileName, setViewFileName] = useState(null);

   const loadData = useCallback(async () => {
      if (!accountID || !userID || !token) return;
      setLoading(true);
      try {
         const response = await fetchPendingPayments(accountID, userID, token, {
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            status: 'all'
         });
         setRows(response?.payments || []);
         setTotalCount(response?.pagination?.totalItems || 0);
      } catch (error) {
         console.error('Error loading all payments:', error);
      } finally {
         setLoading(false);
      }
   }, [accountID, userID, token, paginationModel]);

   useEffect(() => {
      loadData();
   }, [loadData]);

   const columns = getAllPaymentColumns({ onViewFile: fileName => setViewFileName(fileName) });

   return (
      <Stack spacing={2}>
         <DataGrid
            rows={rows}
            columns={columns}
            getRowId={row => row.payment_id}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            rowCount={totalCount}
            paginationMode='server'
            loading={loading}
            autoHeight
         />

         <Dialog open={Boolean(viewFileName)} onClose={() => setViewFileName(null)} maxWidth='lg' fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               {viewFileName}
               <IconButton aria-label='Close preview' onClick={() => setViewFileName(null)} size='small'>
                  <CloseIcon />
               </IconButton>
            </DialogTitle>
            <DialogContent sx={{ minHeight: 650, p: 2 }}>
               {viewFileName && <PaymentPdfPreview fileName={viewFileName} />}
            </DialogContent>
         </Dialog>
      </Stack>
   );
}
