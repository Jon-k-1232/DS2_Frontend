import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
export default function SentInvoiceNotice({ row }) {
   const navigate = useNavigate();
   return <Alert severity='info'>
      Sent — locked · {row.locked_invoice_number}. Changes require an audited invoice exception.
      <Button onClick={() => navigate('/invoices/invoices/invoiceDetail/invoicePayments', {
         state: { rowData: { customer_invoice_id: row.locked_invoice_id || row.customer_invoice_id } }
      })}>Open invoice history</Button>
   </Alert>;
}
