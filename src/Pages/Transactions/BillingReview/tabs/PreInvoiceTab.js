import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { context } from '../../../../App';
import { fetchPreInvoiceReview } from '../../../../Services/ApiCalls/BillingReviewCalls';

export default function PreInvoiceTab() {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [customerId, setCustomerId] = useState('');
   const [start, setStart] = useState('');
   const [end, setEnd] = useState('');
   const [data, setData] = useState({ transactions: [], totalSum: 0, anomaly: null });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');

   const run = useCallback(async () => {
      if (!customerId || !start || !end) return;
      setLoading(true);
      setError('');
      const res = await fetchPreInvoiceReview(accountID, userID, token, { customerId, start, end });
      if (res?.error) setError(res.error);
      setData({ transactions: res?.transactions || [], totalSum: Number(res?.totalSum || 0), anomaly: res?.anomaly || null });
      setLoading(false);
   }, [accountID, userID, token, customerId, start, end]);

   useEffect(() => {
      // Don't auto-run on mount; user must pick a customer.
   }, []);

   const a = data.anomaly;

   return (
      <Stack spacing={2}>
         <Typography variant='body2' color='text.secondary'>
            Spot-check the next invoice before it goes out. Customer's spike/drop vs. the trailing 6-period average is flagged automatically.
         </Typography>
         <Stack direction='row' spacing={2}>
            <TextField label='Customer ID' size='small' value={customerId} onChange={e => setCustomerId(e.target.value)} />
            <TextField label='Period start' size='small' value={start} onChange={e => setStart(e.target.value)} />
            <TextField label='Period end' size='small' value={end} onChange={e => setEnd(e.target.value)} />
            <Button variant='contained' onClick={run} disabled={loading || !customerId || !start || !end}>Run check</Button>
         </Stack>
         {loading && <CircularProgress size={20} />}
         {error && <Alert severity='error'>{error}</Alert>}
         {a && a.flagged && (
            <Alert severity='warning'>
               This invoice ({`$${Number(a.current).toFixed(2)}`}) is {a.ratio.toFixed(2)}× the trailing average ({`$${Number(a.lookbackAvg).toFixed(2)}`}). Reason: {a.reason}.
            </Alert>
         )}
         {a && !a.flagged && (
            <Alert severity='success'>
               Invoice total looks normal: {`$${Number(a.current).toFixed(2)}`} vs. trailing average {`$${Number(a.lookbackAvg).toFixed(2)}`}.
            </Alert>
         )}
         {data.transactions.length > 0 && (
            <>
               <Typography variant='subtitle2'>{data.transactions.length} transactions · ${data.totalSum.toFixed(2)} total</Typography>
               <Table size='small'>
                  <TableHead>
                     <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Work Description</TableCell>
                        <TableCell>Employee</TableCell>
                        <TableCell align='right'>Hours</TableCell>
                        <TableCell align='right'>Total</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {data.transactions.map(r => (
                        <TableRow key={r.transaction_id}>
                           <TableCell>{r.transaction_date}</TableCell>
                           <TableCell>{r.general_work_description}</TableCell>
                           <TableCell>{r.logged_for_user_display_name || '—'}</TableCell>
                           <TableCell align='right'>{Number(r.quantity).toFixed(2)}</TableCell>
                           <TableCell align='right'>${Number(r.total_transaction).toFixed(2)}</TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </>
         )}
      </Stack>
   );
}
