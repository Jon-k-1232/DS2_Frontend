import React, { useState } from 'react';
import { Stack, Alert, Button, Box, TextField, Autocomplete, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import usePendingPaymentList from '../usePendingPaymentList';
import dayjs from 'dayjs';
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
   const monthOptions = generateMonthOptions();
   const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
   const [viewFileName, setViewFileName] = useState(null);

   const {rows,totalCount,loading,error,loadData}=usePendingPaymentList({status: 'processed', paginationModel, month: selectedMonth?.month, year: selectedMonth?.year});

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

         {error && <Alert severity='error' action={<Button onClick={loadData}>Reload payments</Button>}>{error}</Alert>}
         {!error && <DataGrid
            localeText={{noRowsLabel: 'No processed payments for this month. Choose another month to see earlier payments.', noResultsOverlayLabel: 'No payments match these filters.'}}
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
         />}

         {/* PDF Viewer Dialog */}
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
