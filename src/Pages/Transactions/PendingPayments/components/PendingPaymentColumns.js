import { Button, Chip } from '@mui/material';
import dayjs from 'dayjs';

const formatCurrency = value => {
   if (value == null || value === '') return '';
   return `$${Math.abs(Number(value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = value => {
   if (!value) return '';
   return dayjs(value).format('MM/DD/YYYY');
};

export const getNewPaymentColumns = ({ onDelete }) => [
   { field: 'customer_name', headerName: 'OCR Name', flex: 1.2, minWidth: 150 },
   { field: 'matched_customer_name', headerName: 'Matched Customer', flex: 1.5, minWidth: 170 },
   { field: 'payment_amount', headerName: 'Amount', width: 110, valueFormatter: ({ value }) => formatCurrency(value) },
   { field: 'payment_date', headerName: 'Date', width: 105, valueFormatter: ({ value }) => formatDate(value) },
   { field: 'form_of_payment', headerName: 'Type', width: 90 },
   { field: 'payment_reference_number', headerName: 'Ref #', width: 110 },
   { field: 'source_file', headerName: 'Source File', flex: 1, minWidth: 140 },
   {
      field: 'actions',
      headerName: '',
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
         <Button
            size='small'
            color='error'
            onClick={e => {
               e.stopPropagation();
               onDelete(row.payment_id);
            }}
         >
            Delete
         </Button>
      )
   }
];

export const getProcessedPaymentColumns = ({ onViewFile }) => [
   { field: 'customer_name', headerName: 'OCR Name', flex: 1, minWidth: 140 },
   { field: 'matched_customer_name', headerName: 'Matched Customer', flex: 1.3, minWidth: 160 },
   { field: 'payment_amount', headerName: 'Amount', width: 110, valueFormatter: ({ value }) => formatCurrency(value) },
   { field: 'payment_date', headerName: 'Date', width: 105, valueFormatter: ({ value }) => formatDate(value) },
   { field: 'form_of_payment', headerName: 'Type', width: 90 },
   { field: 'payment_reference_number', headerName: 'Ref #', width: 110 },
   { field: 'date_processed', headerName: 'Processed', width: 130, valueFormatter: ({ value }) => value ? dayjs(value).format('MM/DD/YY h:mm A') : '' },
   {
      field: 'view_file',
      headerName: '',
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
         <Button size='small' onClick={e => { e.stopPropagation(); onViewFile(row.source_file); }}>
            View
         </Button>
      )
   }
];

export const getAllPaymentColumns = ({ onViewFile }) => [
   { field: 'customer_name', headerName: 'OCR Name', flex: 1, minWidth: 140 },
   { field: 'matched_customer_name', headerName: 'Matched Customer', flex: 1.3, minWidth: 160 },
   { field: 'payment_amount', headerName: 'Amount', width: 110, valueFormatter: ({ value }) => formatCurrency(value) },
   { field: 'payment_date', headerName: 'Date', width: 105, valueFormatter: ({ value }) => formatDate(value) },
   { field: 'form_of_payment', headerName: 'Type', width: 90 },
   { field: 'payment_reference_number', headerName: 'Ref #', width: 110 },
   {
      field: 'status',
      headerName: 'Status',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => {
         if (row.is_payment_processed) return <Chip label='Processed' size='small' color='success' />;
         return <Chip label='Pending' size='small' color='warning' />;
      }
   },
   {
      field: 'view_file',
      headerName: '',
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
         <Button size='small' onClick={e => { e.stopPropagation(); onViewFile(row.source_file); }}>
            View
         </Button>
      )
   }
];
