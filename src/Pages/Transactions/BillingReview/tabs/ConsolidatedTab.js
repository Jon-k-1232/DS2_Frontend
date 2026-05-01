import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Button } from '@mui/material';
import { context } from '../../../../App';
import { fetchConsolidatedTransactions, updateFinalizedTransaction } from '../../../../Services/ApiCalls/BillingReviewCalls';
import CascadeImpactPanel from '../components/CascadeImpactPanel';

const _todayISO = (offsetDays = 0) => {
   const d = new Date();
   d.setUTCDate(d.getUTCDate() + offsetDays);
   return d.toISOString().slice(0, 10);
};

const _startOfWeek = () => {
   const d = new Date();
   const day = d.getUTCDay() || 7;
   d.setUTCDate(d.getUTCDate() - (day - 1));
   return d.toISOString().slice(0, 10);
};

const _startOfMonth = () => {
   const d = new Date();
   d.setUTCDate(1);
   return d.toISOString().slice(0, 10);
};

export default function ConsolidatedTab({ period }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [start, setStart] = useState(period === 'month' ? _startOfMonth() : _startOfWeek());
   const [end, setEnd] = useState(_todayISO());
   const [rows, setRows] = useState([]);
   const [totalSum, setTotalSum] = useState(0);
   const [loading, setLoading] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [edits, setEdits] = useState({});
   const [error, setError] = useState('');
   const [sideEffects, setSideEffects] = useState([]);

   const reload = useCallback(async () => {
      setLoading(true);
      setError('');
      const res = await fetchConsolidatedTransactions(accountID, userID, token, { start, end });
      if (res?.error) setError(res.error);
      setRows(res?.transactions || []);
      setTotalSum(Number(res?.totalSum || 0));
      setLoading(false);
   }, [accountID, userID, token, start, end]);

   useEffect(() => {
      reload();
   }, [reload]);

   const startEdit = txn => {
      setEditingId(txn.transaction_id);
      setEdits({
         total_transaction: txn.total_transaction,
         note: txn.note || '',
         general_work_description_id: txn.general_work_description_id,
         transaction_date: txn.transaction_date
      });
      setSideEffects([]);
      setError('');
   };

   const saveEdit = async transactionId => {
      try {
         const res = await updateFinalizedTransaction(accountID, userID, transactionId, { updates: edits }, token);
         setSideEffects(res.sideEffects || []);
         setEditingId(null);
         await reload();
      } catch (err) {
         setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
      }
   };

   return (
      <Stack spacing={2}>
         <Stack direction='row' spacing={2}>
            <TextField label='Start' size='small' value={start} onChange={e => setStart(e.target.value)} />
            <TextField label='End' size='small' value={end} onChange={e => setEnd(e.target.value)} />
            <Button variant='outlined' onClick={reload}>Refresh</Button>
         </Stack>
         <Typography variant='subtitle2'>{rows.length} transactions · ${totalSum.toFixed(2)} total</Typography>
         {loading && <CircularProgress size={20} />}
         {error && <Alert severity='error'>{error}</Alert>}
         <CascadeImpactPanel sideEffects={sideEffects} />
         <Table size='small'>
            <TableHead>
               <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Work Description</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell align='right'>Hours</TableCell>
                  <TableCell align='right'>Total</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell></TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {rows.map(r => {
                  const isEditing = editingId === r.transaction_id;
                  return (
                     <TableRow key={r.transaction_id} hover>
                        <TableCell>{r.transaction_date}</TableCell>
                        <TableCell>{r.customer_display_name}</TableCell>
                        <TableCell>{r.general_work_description}</TableCell>
                        <TableCell>{r.logged_for_user_display_name || '—'}</TableCell>
                        <TableCell align='right'>{Number(r.quantity).toFixed(2)}</TableCell>
                        <TableCell align='right'>
                           {isEditing ? (
                              <TextField size='small' value={edits.total_transaction} onChange={e => setEdits(p => ({ ...p, total_transaction: e.target.value }))} />
                           ) : (
                              `$${Number(r.total_transaction).toFixed(2)}`
                           )}
                        </TableCell>
                        <TableCell>{r.invoice_number || '—'}{r.is_invoice_paid_in_full ? ' (paid)' : ''}</TableCell>
                        <TableCell>
                           {isEditing ? (
                              <Stack direction='row' spacing={1}>
                                 <Button size='small' variant='contained' onClick={() => saveEdit(r.transaction_id)}>Save</Button>
                                 <Button size='small' onClick={() => setEditingId(null)}>Cancel</Button>
                              </Stack>
                           ) : (
                              <Button size='small' onClick={() => startEdit(r)} disabled={r.is_invoice_paid_in_full}>Edit</Button>
                           )}
                        </TableCell>
                     </TableRow>
                  );
               })}
            </TableBody>
         </Table>
      </Stack>
   );
}
