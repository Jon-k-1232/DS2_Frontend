import React, { useState } from 'react';
import { Stack, Alert, Button, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import usePendingPaymentList from '../usePendingPaymentList';
import { getAllPaymentColumns } from '../components/PendingPaymentColumns';
import PaymentPdfPreview from '../components/PaymentPdfPreview';

export default function AllPaymentsTab() {
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
   const [viewFileName, setViewFileName] = useState(null);

   const {rows,totalCount,loading,error,loadData}=usePendingPaymentList({status: 'all', paginationModel});

   const columns = getAllPaymentColumns({ onViewFile: fileName => setViewFileName(fileName) });

   return (
      <Stack spacing={2}>
         {error && <Alert severity='error' action={<Button onClick={loadData}>Reload payments</Button>}>{error}</Alert>}
         {!error && <DataGrid
            localeText={{noRowsLabel: 'No imported payments. Use Upload to add a payment file.', noResultsOverlayLabel: 'No payments match these filters.'}}
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
