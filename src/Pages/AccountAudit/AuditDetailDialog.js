import { useEffect, useState, useContext, useRef } from 'react';
import {
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Button,
   IconButton,
   Stack,
   Typography,
   CircularProgress,
   Box,
   Chip,
   Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { context } from '../../App';
import { fetchAccountAuditDetail, openAuditPdf } from '../../Services/ApiCalls/AccountAuditCalls';
import AuditPrintView from './AuditPrintView';
import { formatCurrency, severityColor } from './auditFormatters';

export default function AuditDetailDialog({ auditId, open, onClose }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;
   const [audit, setAudit] = useState(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const printRef = useRef(null);

   useEffect(() => {
      if (!open || !auditId) return;
      let cancelled = false;
      setLoading(true);
      setError(null);
      fetchAccountAuditDetail(auditId, accountID, userID, token)
         .then(d => {
            if (cancelled) return;
            setAudit(d.audit);
         })
         .catch(e => !cancelled && setError(e.message || 'Failed to load audit.'))
         .finally(() => !cancelled && setLoading(false));
      return () => {
         cancelled = true;
      };
   }, [auditId, open, accountID, userID, token]);

   const [pdfDownloading, setPdfDownloading] = useState(false);
   const handleOpenPdf = async () => {
      if (!audit?.audit_id) return;
      setPdfDownloading(true);
      try {
         await openAuditPdf(audit.audit_id, accountID, userID, token);
      } catch (e) {
         setError(e.response?.data?.message || e.message || 'Failed to load PDF.');
      } finally {
         setPdfDownloading(false);
      }
   };

   const handlePrint = () => {
      if (!audit) return;
      const node = printRef.current;
      if (!node) return;
      const w = window.open('', '_blank', 'width=1000,height=800');
      if (!w) return;
      // Write ONLY the static page chrome (no untrusted content) — audit_id is a
      // numeric DB id. The audit content is then moved across as a cloned DOM node
      // via importNode rather than serializing node.innerHTML into the string. This
      // avoids re-parsing already-rendered content as fresh HTML in a window that
      // isn't covered by the app's CSP, which would let any markup execute there.
      w.document.write(`<!doctype html><html><head><title>Audit ${Number(audit.audit_id) || ''}</title>
         <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background: #eee; }
            @media print { @page { size: letter portrait; margin: 0.4in; } }
         </style></head><body></body></html>`);
      w.document.close();
      const importedNode = w.document.importNode(node, true);
      w.document.body.appendChild(importedNode);
      w.focus();
      setTimeout(() => {
         w.print();
      }, 200);
   };

   return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
         <DialogTitle sx={{ pr: 8 }}>
            Account Audit
            {audit && (
               <Typography variant='caption' display='block' sx={{ color: 'text.secondary' }}>
                  #{audit.audit_id} — {audit.run_by_display_name}
               </Typography>
            )}
            <IconButton aria-label="Close dialog" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
               <CloseIcon />
            </IconButton>
         </DialogTitle>
         <DialogContent dividers>
            {loading && (
               <Stack alignItems='center' sx={{ py: 4 }}>
                  <CircularProgress />
               </Stack>
            )}
            {error && <Typography color='error'>{error}</Typography>}
            {audit && (
               <>
                  <Stack direction='row' spacing={1} sx={{ mb: 2 }} flexWrap='wrap'>
                     <Chip
                        label={`Audit balance: ${formatCurrency(audit.audit_balance)}`}
                        color='primary'
                     />
                     <Chip
                        label={`Strict ledger: ${formatCurrency(audit.strict_ledger_balance)}`}
                        variant='outlined'
                     />
                     <Chip
                        label={`Discrepancies: ${audit.discrepancy_count}`}
                        color={audit.discrepancy_count ? 'warning' : 'success'}
                        variant={audit.discrepancy_count ? 'filled' : 'outlined'}
                     />
                  </Stack>
                  {audit.narrative && (
                     <Paper variant='outlined' sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}>
                        <Typography variant='overline' color='text.secondary'>
                           Executive summary
                           {audit.narrative_model ? ` · ${audit.narrative_model.split('.').pop()}` : ''}
                        </Typography>
                        <Typography variant='body2' sx={{ mt: 0.5, mb: 1, whiteSpace: 'pre-wrap' }}>
                           {audit.narrative}
                        </Typography>
                        {audit.narrative_findings?.length > 0 && (
                           <Box sx={{ mb: 1 }}>
                              <Typography variant='caption' sx={{ fontWeight: 600 }}>Key findings</Typography>
                              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                 {audit.narrative_findings.map((f, i) => (
                                    <li key={i}><Typography variant='caption'>{f}</Typography></li>
                                 ))}
                              </ul>
                           </Box>
                        )}
                        {audit.narrative_actions?.length > 0 && (
                           <Box>
                              <Typography variant='caption' sx={{ fontWeight: 600 }}>Recommended actions</Typography>
                              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                 {audit.narrative_actions.map((a, i) => (
                                    <li key={i}><Typography variant='caption'>{a}</Typography></li>
                                 ))}
                              </ul>
                           </Box>
                        )}
                     </Paper>
                  )}
                  {audit.discrepancies?.length > 0 && (
                     <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle2' gutterBottom>What to fix</Typography>
                        <Stack spacing={1}>
                           {audit.discrepancies.map((d, i) => (
                              <Stack key={i} direction='row' spacing={1} alignItems='flex-start'>
                                 <Chip size='small' label={(d.severity || 'low').toUpperCase()} color={severityColor(d.severity)} />
                                 <Typography variant='body2'>
                                    <strong>{d.kind.replace(/_/g, ' ')}{d.invoice_number ? ` (${d.invoice_number})` : ''}:</strong>{' '}
                                    {d.detail}
                                 </Typography>
                              </Stack>
                           ))}
                        </Stack>
                     </Box>
                  )}
                  <Box ref={printRef}>
                     <AuditPrintView audit={audit} />
                  </Box>
               </>
            )}
         </DialogContent>
         <DialogActions>
            <Button
               startIcon={pdfDownloading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
               onClick={handleOpenPdf}
               disabled={!audit || pdfDownloading}
            >
               Open saved PDF
            </Button>
            <Button startIcon={<PrintIcon />} onClick={handlePrint} disabled={!audit}>
               Print current view
            </Button>
            <Button onClick={onClose}>Close</Button>
         </DialogActions>
      </Dialog>
   );
}
