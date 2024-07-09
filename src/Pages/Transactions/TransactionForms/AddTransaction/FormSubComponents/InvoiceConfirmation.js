import { useState, useEffect } from 'react';
import { Stack, TextField } from '@mui/material';

export default function InvoiceConfirmation({ selectedItems, setSelectedItems, customerProfileData, invoiceConfirmationOverride }) {
  const [invoiceConfirmation, setInvoiceConfirmation] = useState('');
  const [invoicesMatch, setInvoicesMatch] = useState(true);
  const [invoiceExists, setInvoiceExists] = useState(true);
  const { customerInvoiceData = [] } = customerProfileData?.customerInvoiceData || {};
  const { selectedInvoice } = selectedItems;
  const invoiceNumber = selectedInvoice?.invoice_number || '';

  useEffect(() => {
    if (customerInvoiceData) setInvoiceConfirmation(invoiceNumber?.toLowerCase());
    const match = invoiceNumber?.toLowerCase() === invoiceConfirmation?.toLowerCase();
    setInvoicesMatch(match);

    const foundInvoice = customerInvoiceData.find(item => item.invoice_number.toLowerCase() === invoiceNumber.toLowerCase());

    setSelectedItems({ ...selectedItems, foundInvoiceID: foundInvoice?.customer_invoice_id });
    setInvoiceExists(foundInvoice);
    // eslint-disable-next-line
  }, [invoiceNumber, invoiceConfirmation, customerInvoiceData]);

  return (
    <>
      <Stack spacing={2}>
        <Stack>
          <TextField
            sx={{ width: 350 }}
            variant='standard'
            label='Invoice Number'
            value={invoiceNumber}
            onChange={e => setSelectedItems(otherItems => ({ ...otherItems, invoiceNumber: e.target.value }))}
            error={!invoicesMatch || !invoiceExists}
            helperText={!invoicesMatch ? 'Invoice numbers do not match' : !invoiceExists ? 'Invoice number not found in records' : ''}
          />
        </Stack>
        <Stack>
          <TextField
            sx={{ width: 350 }}
            variant='standard'
            label='Confirm Invoice Number'
            value={invoiceConfirmationOverride ? invoiceNumber : invoiceConfirmation}
            onChange={e => setInvoiceConfirmation(e.target.value)}
            error={!invoicesMatch}
            helperText={!invoicesMatch ? 'Invoice numbers do not match' : ''}
          />
        </Stack>
      </Stack>
    </>
  );
}
