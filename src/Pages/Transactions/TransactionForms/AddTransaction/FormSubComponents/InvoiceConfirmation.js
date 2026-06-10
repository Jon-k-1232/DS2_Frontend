import { useState, useEffect, useMemo } from 'react';
import { Stack, TextField } from '@mui/material';

export default function InvoiceConfirmation({ selectedItems, setSelectedItems, customerProfileData, invoiceConfirmationOverride }) {
  const [invoiceConfirmation, setInvoiceConfirmation] = useState('');
  // The profile API returns the array under `customerInvoices`; alias it so the
  // existence check below has the real list (previously always empty, which made
  // every invoice payment show "Invoice number not found in records").
  const { customerInvoices: customerInvoiceData = [] } = customerProfileData?.customerInvoiceData || {};
  const { selectedInvoice } = selectedItems;
  const invoiceNumber = selectedInvoice?.invoice_number || '';

  // Auto-fill the confirmation field whenever a new invoice is selected.
  useEffect(() => {
    setInvoiceConfirmation(invoiceNumber.toLowerCase());
  }, [invoiceNumber]);

  const invoicesMatch = invoiceNumber.toLowerCase() === (invoiceConfirmation || '').toLowerCase();

  const foundInvoice = useMemo(
    () => customerInvoiceData.find(item => (item.invoice_number || '').toLowerCase() === invoiceNumber.toLowerCase()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoiceNumber, customerInvoiceData]
  );
  const invoiceExists = !invoiceNumber || Boolean(foundInvoice);

  // Publish the matched id only when it actually changes. The previous version
  // set state unconditionally with a non-functional spread on every render —
  // an endless render loop that could clobber a just-made dropdown selection.
  const foundInvoiceID = foundInvoice?.customer_invoice_id ?? null;
  useEffect(() => {
    setSelectedItems(prev => (prev.foundInvoiceID === foundInvoiceID ? prev : { ...prev, foundInvoiceID }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundInvoiceID]);

  return (
    <>
      <Stack spacing={2}>
        <Stack>
          <TextField
            sx={{ width: '100%', maxWidth: 350 }}
            variant='standard'
            label='Invoice Number'
            value={invoiceNumber}
            InputProps={{ readOnly: true }}
            error={!invoicesMatch || !invoiceExists}
            helperText={!invoicesMatch ? 'Invoice numbers do not match' : !invoiceExists ? 'Invoice number not found in records' : ''}
          />
        </Stack>
        <Stack>
          <TextField
            sx={{ width: '100%', maxWidth: 350 }}
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
