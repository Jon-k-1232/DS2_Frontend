import React from 'react';
import { Stack } from '@mui/material';
import CreateInvoiceGridTable from '../../../Components/DataGrids/CreateInvoiceGrid';

export default function CreateInvoiceGrid({ outstandingBalanceData, setSelectedRowsToInvoice, batchRevision, completedCustomerIds }) {
   if (!outstandingBalanceData || !outstandingBalanceData.outstandingBalanceList || !outstandingBalanceData.outstandingBalanceList.activeOutstandingBalancesData) {
      return <div>Loading...</div>;
   }

   const { outstandingBalanceList: { activeOutstandingBalancesData = {} } = {} } = outstandingBalanceData || {};

   return (
      <>
         <Stack spacing={3}>
            <CreateInvoiceGridTable
               batchRevision={batchRevision}
               completedCustomerIds={completedCustomerIds}
               passedHeight={window.innerHeight - 380}
               gridData={activeOutstandingBalancesData.grid}
               setSelectedRowsToInvoice={data => setSelectedRowsToInvoice(data)}
            />
         </Stack>
      </>
   );
}
