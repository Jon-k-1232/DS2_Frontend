import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Stack, Box, TextField, Autocomplete, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import { fetchPendingPayments } from '../../../../Services/ApiCalls/PendingPaymentsCalls';
import { getProcessedPaymentColumns } from '../components/PendingPaymentColumns';
import PaymentPdfPreview from '../components/PaymentPdfPreview';

const generateMonthOptions = () => {
   const options = [];
   const now = dayjs();
   for (let i = 0; i < 24; i++) {
      const date = now.subtract(i, 'month');
      options.push({
         label: date.format('MMMM YYYY'),
         month: date.month() + 1,
         year: date.year()
      });
   }
   return options;
};

export default function ProcessedPaymentsTab() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const monthOptions = generateMonthOptions();
   const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
   const [rows, setRows] = useState([]);
   const [loading, setLoading] = useState(false);
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
   const [totalCount, setTotalCount] = useState(0);
   const [viewFileName, setViewFileName] = useState(null);

   const loadData = useCallback(async () => {
      if (!accountID || !userID || !token || !selectedMonth) return;
      setLoading(true);
      try {
         const response = await fetchPendingPayments(accountID, userID, token, {
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            status: 'processed',
            month: selectedMonth.month,
            year: selectedMonth.year
         });
         setRows(response?.payments || []);
         setTotalCount(response?.pagination?.totalItems || 0);
      } catch (error) {
         console.error('Error loading processed payments:', error);
      } finally {
         setLoading(false);
      }
   }, [accountID, userID, token, paginationModel, selectedMonth]);

   useEffect(() => {
      loadData();
   }, [loadData]);

   const columns = getProcessedPaymentColumns({ onViewFile: fileName => setViewFileName(fileName) });

   return (
      <Stack spacing={2}>
         <Box sx={{ maxWidth: 300 }}>
            <Autocomplete
               size='small'
               value={selectedMonth}
               onChange={(_, value) => {
                  setSelectedMonth(value);
                  setPaginationModel(prev => ({ ...prev, page: 0 }));
               }}
               options={monthOptions}
               getOptionLabel={option => option.label}
               isOptionEqualToValue={(option, value) => option.month === value?.month && option.year === value?.year}
               renderInput={params => <TextField {...params} label='Month' variant='standard' />}
               disableClearable
            />
         </Box>

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

         {/* PDF Viewer Dialog */}
         <Dialog open={Boolean(viewFileName)} onClose={() => setViewFileName(null)} maxWidth='lg' fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               {viewFileName}
               <IconButton onClick={() => setViewFileName(null)} size='small'>
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
