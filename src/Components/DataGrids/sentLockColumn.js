import { Chip } from '@mui/material';
// Preserve lock visibility even when a feature filters its ordinary columns.
export const withSentLockColumn = (columns = [], rows = []) => {
   if (rows.some(r => r.possible_duplicate)) columns = [{field:'possible_duplicate',headerName:'Duplicate review',width:190,
      renderCell: params => params.row.possible_duplicate ? <Chip color='warning' size='small' label='Possible duplicate' component='a' clickable href={`/transactions/possibleDuplicates?duplicateId=${params.row.duplicate_ids?.[0] || ''}`} onClick={e => e.stopPropagation()} /> : null
   },...columns.filter(c => !['possible_duplicate','duplicate_ids'].includes(c.field))];
   if (!rows.some(r => r.sent_locked)) return columns;
   return [{ field: 'sent_lock_status', headerName: 'Statement status', width: 230,
      valueGetter: params => params.row.sent_locked ? `Sent — locked · ${params.row.locked_invoice_number || ''}` : '' },
      ...columns.filter(c => !['sent_locked', 'locked_invoice_number', 'sent_lock_status'].includes(c.field))];
};
