import { useEffect, useState, useContext, useCallback } from 'react';
import {
   Box,
   Stack,
   Typography,
   Button,
   Table,
   TableHead,
   TableBody,
   TableRow,
   TableCell,
   Paper,
   Chip,
   CircularProgress,
   Alert
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { context } from '../../../App';
import { fetchAuditsForCustomer, openAuditPdf } from '../../../Services/ApiCalls/AccountAuditCalls';
import AuditDetailDialog from '../../AccountAudit/AuditDetailDialog';
import { canAccessAccountAudit } from '../../../Routes/AuditorProtectedAccess';
import { fmtDateTime, formatCurrency } from '../../AccountAudit/auditFormatters';

export default function CustomerProfileAIAudit({ profileData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;
   const customerId = profileData?.customerData?.customerData?.customer_id;

   const [audits, setAudits] = useState([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [openAuditId, setOpenAuditId] = useState(null);

   const isAllowed = canAccessAccountAudit(loggedInUser);

   const load = useCallback(async () => {
      if (!customerId || !isAllowed) return;
      setLoading(true);
      setError(null);
      try {
         const data = await fetchAuditsForCustomer(customerId, accountID, userID, token);
         setAudits(data.audits || []);
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to load audits.');
      } finally {
         setLoading(false);
      }
   }, [customerId, accountID, userID, token, isAllowed]);

   useEffect(() => {
      load();
   }, [load]);

   if (!isAllowed) {
      return (
         <Box sx={{ p: 2 }}>
            <Typography variant='body2' color='text.secondary'>
               This tab is restricted.
            </Typography>
         </Box>
      );
   }

   return (
      <Box sx={{ pt: 2 }}>
         <Stack spacing={2}>
            <Box>
               <Typography variant='h6'>AI Audit history</Typography>
               <Typography variant='caption' color='text.secondary'>
                  Record of audits run for this client. Run new audits from <strong>Invoices → Account Audit</strong>.
               </Typography>
            </Box>

            {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant='outlined'>
               <Table size='small'>
                  <TableHead>
                     <TableRow>
                        <TableCell>When</TableCell>
                        <TableCell>By</TableCell>
                        <TableCell align='right'>Audit balance</TableCell>
                        <TableCell align='right'>App balance</TableCell>
                        <TableCell align='right'>Difference</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {loading && (
                        <TableRow>
                           <TableCell colSpan={6} align='center' sx={{ py: 4 }}>
                              <CircularProgress size={24} />
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading && audits.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={6} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                              No audits yet for this customer.
                           </TableCell>
                        </TableRow>
                     )}
                     {!loading &&
                        audits.map(a => (
                           <TableRow key={a.audit_id} hover>
                              <TableCell>{fmtDateTime(a.created_at)}</TableCell>
                              <TableCell>{a.run_by_display_name}</TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {a.status === 'completed' ? formatCurrency(a.audit_balance) : '—'}
                              </TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {a.app_invoice_total == null ? '—' : formatCurrency(a.app_invoice_total)}
                              </TableCell>
                              <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                 {a.balance_difference == null ? (
                                    '—'
                                 ) : Math.abs(a.balance_difference) < 0.01 ? (
                                    <Chip size='small' label='Match' color='success' variant='outlined' />
                                 ) : (
                                    <Typography variant='body2' sx={{ color: 'error.main', fontWeight: 600 }}>
                                       {formatCurrency(a.balance_difference)}
                                    </Typography>
                                 )}
                              </TableCell>
                              <TableCell align='right'>
                                 <Stack direction='row' spacing={1} justifyContent='flex-end'>
                                    <Button size='small' variant='outlined' onClick={() => setOpenAuditId(a.audit_id)}>
                                       View
                                    </Button>
                                    {a.pdf_available && (
                                       <Button
                                          size='small'
                                          variant='text'
                                          startIcon={<PictureAsPdfIcon />}
                                          onClick={() => openAuditPdf(a.audit_id, accountID, userID, token).catch(e => setError(e.message))}
                                       >
                                          PDF
                                       </Button>
                                    )}
                                 </Stack>
                              </TableCell>
                           </TableRow>
                        ))}
                  </TableBody>
               </Table>
            </Paper>
         </Stack>

         <AuditDetailDialog
            auditId={openAuditId}
            open={!!openAuditId}
            onClose={() => setOpenAuditId(null)}
         />
      </Box>
   );
}
