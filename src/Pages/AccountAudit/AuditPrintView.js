import { Box, Typography, Stack, Divider } from '@mui/material';
import { formatCurrency, fmtDate, fmtDateTime } from './auditFormatters';

const SectionHeader = ({ children }) => (
   <Typography variant='h6' sx={{ mt: 3, mb: 1, borderBottom: '2px solid #333', pb: 0.5 }}>
      {children}
   </Typography>
);

const Row = ({ label, value, strong = false }) => (
   <Stack direction='row' justifyContent='space-between' sx={{ py: 0.25 }}>
      <Typography variant='body2' sx={{ fontWeight: strong ? 700 : 400 }}>{label}</Typography>
      <Typography variant='body2' sx={{ fontWeight: strong ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
   </Stack>
);

const severityColor = sev => {
   if (sev === 'high') return '#c62828';
   if (sev === 'medium') return '#ef6c00';
   return '#616161';
};

export default function AuditPrintView({ audit }) {
   if (!audit) return null;
   const summary = audit.summary || {};
   const customer = summary.customer || {};
   const totals = summary.totals || audit;
   const methodology = summary.methodology || {};
   const breakdown = summary.invoice_breakdown || [];
   const discrepancies = audit.discrepancies || [];
   const ledger = audit.ledger || [];

   return (
      <Box sx={{ p: 4, color: '#000', backgroundColor: '#fff', '@media print': { p: 2 } }} className='audit-print-root'>
         <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Box>
               <Typography variant='h4' sx={{ fontWeight: 700 }}>Account Audit Report</Typography>
               <Typography variant='body1' sx={{ mt: 0.5 }}>
                  {customer.display_name} {customer.customer_id ? `(ID ${customer.customer_id})` : ''}
               </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
               <Typography variant='body2'>Audit #{audit.audit_id}</Typography>
               <Typography variant='body2'>Run by: {audit.run_by_display_name}</Typography>
               <Typography variant='body2'>Generated: {fmtDateTime(audit.created_at)}</Typography>
            </Box>
         </Stack>

         {audit.narrative && (
            <>
               <SectionHeader>Executive summary</SectionHeader>
               <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{audit.narrative}</Typography>
               {audit.narrative_findings?.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                     <Typography variant='caption' sx={{ fontWeight: 700 }}>Key findings</Typography>
                     <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {audit.narrative_findings.map((f, i) => (
                           <li key={i}><Typography variant='caption'>{f}</Typography></li>
                        ))}
                     </ul>
                  </Box>
               )}
               {audit.narrative_actions?.length > 0 && (
                  <Box>
                     <Typography variant='caption' sx={{ fontWeight: 700 }}>Recommended actions</Typography>
                     <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {audit.narrative_actions.map((a, i) => (
                           <li key={i}><Typography variant='caption'>{a}</Typography></li>
                        ))}
                     </ul>
                  </Box>
               )}
            </>
         )}

         <SectionHeader>Lifetime totals</SectionHeader>
         <Row label='Total invoiced (parent invoices)' value={formatCurrency(totals.total_invoiced)} />
         <Row label='Total paid (lifetime |payments|)' value={formatCurrency(totals.total_paid)} />
         <Row label='Total transactions' value={formatCurrency(totals.total_transactions)} />
         <Row label='Total write-offs (lifetime)' value={formatCurrency(totals.total_writeoffs)} />

         <SectionHeader>Audit balance breakdown</SectionHeader>
         <Row label='Outstanding on invoices (latest snapshot per chain)' value={formatCurrency(totals.outstanding_invoices)} />
         <Row label='Unbilled billable transactions' value={`+ ${formatCurrency(totals.unbilled_billable)}`} />
         <Row label='Unbilled payments' value={`− ${formatCurrency(totals.unbilled_payments)}`} />
         <Divider sx={{ my: 1, borderColor: '#000' }} />
         <Row label='Audit balance (matches app)' value={formatCurrency(totals.audit_balance)} strong />
         <Row label='Unbilled write-offs (pending adjustment)' value={`− ${formatCurrency(totals.unbilled_writeoffs)}`} />
         <Divider sx={{ my: 1, borderColor: '#000' }} />
         <Row label='Strict ledger balance (after pending writeoffs applied)' value={formatCurrency(totals.strict_ledger_balance)} strong />

         {summary.retainers && summary.retainers.total_chains > 0 && (
            <>
               <SectionHeader>Retainers & deposits</SectionHeader>
               <Row label='Total prepaid (lifetime)' value={formatCurrency(totals.retainer_total_prepaid_lifetime)} />
               <Row label='Drawn down to date' value={formatCurrency(totals.retainer_drawn)} />
               <Row label='Currently available (active retainers)' value={formatCurrency(totals.retainer_available)} strong />
               <Row label='Audit balance' value={formatCurrency(totals.audit_balance)} />
               <Row label='Net position after applying available retainer' value={formatCurrency(totals.net_position_after_retainer)} strong />
               <Box component='table' sx={{ width: '100%', mt: 1, borderCollapse: 'collapse', fontSize: 11, '& th, & td': { border: '1px solid #999', p: '3px 5px', verticalAlign: 'top' }, '& th': { backgroundColor: '#eee', textAlign: 'left' } }}>
                  <thead>
                     <tr>
                        <th>Established</th>
                        <th>Name / Type</th>
                        <th>Form</th>
                        <th align='right'>Starting</th>
                        <th align='right'>Drawn</th>
                        <th align='right'>Current</th>
                        <th>Active?</th>
                     </tr>
                  </thead>
                  <tbody>
                     {summary.retainers.breakdown.map(r => (
                        <tr key={r.retainer_id}>
                           <td>{r.created_at ? r.created_at.slice(0, 10) : ''}</td>
                           <td>{r.display_name || r.type_of_hold || 'Retainer'}</td>
                           <td>{r.form_of_payment || ''}</td>
                           <td align='right'>{formatCurrency(r.starting_amount)}</td>
                           <td align='right'>{formatCurrency(r.drawn_to_date)}</td>
                           <td align='right'>{formatCurrency(r.current_amount)}</td>
                           <td>{r.is_active ? 'Yes' : 'No'}</td>
                        </tr>
                     ))}
                  </tbody>
               </Box>
            </>
         )}

         <SectionHeader>Methodology</SectionHeader>
         <Typography variant='body2' paragraph>{methodology.description}</Typography>
         <Typography variant='caption' display='block'><strong>Audit balance:</strong> {methodology.audit_balance_formula}</Typography>
         <Typography variant='caption' display='block'><strong>Strict ledger:</strong> {methodology.strict_ledger_formula}</Typography>
         <Typography variant='caption' display='block'><strong>Net position:</strong> {methodology.net_position_formula}</Typography>
         {methodology.ledger_basis && (
            <Typography variant='caption' display='block' sx={{ mt: 0.5 }}><strong>Ledger basis:</strong> {methodology.ledger_basis}</Typography>
         )}

         <SectionHeader>Per-invoice breakdown ({breakdown.length})</SectionHeader>
         <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, '& th, & td': { border: '1px solid #999', p: '4px 6px', verticalAlign: 'top' }, '& th': { backgroundColor: '#eee', textAlign: 'left' } }}>
            <thead>
               <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th align='right'>Total</th>
                  <th align='right'>Paid against</th>
                  <th align='right'>Writeoffs against</th>
                  <th align='right'>Expected rem.</th>
                  <th align='right'>Actual rem.</th>
                  <th align='right'>Drift</th>
                  <th>Paid?</th>
               </tr>
            </thead>
            <tbody>
               {breakdown.map(b => {
                  const drift = Number(b.expected_remaining) - Number(b.actual_remaining_used);
                  return (
                     <tr key={b.parent_invoice_id}>
                        <td>{b.invoice_number}</td>
                        <td>{b.invoice_date}</td>
                        <td align='right'>{formatCurrency(b.parent_total_amount_due)}</td>
                        <td align='right'>{formatCurrency(b.paid_against_invoice)}</td>
                        <td align='right'>{formatCurrency(b.writeoffs_against_invoice)}</td>
                        <td align='right'>{formatCurrency(b.expected_remaining)}</td>
                        <td align='right'>{formatCurrency(b.actual_remaining_used)}</td>
                        <td align='right' style={{ color: Math.abs(drift) >= 0.01 ? '#c62828' : 'inherit', fontWeight: Math.abs(drift) >= 0.01 ? 700 : 400 }}>
                           {formatCurrency(drift)}
                        </td>
                        <td>{b.is_paid_in_full_db ? 'Yes' : 'No'}</td>
                     </tr>
                  );
               })}
            </tbody>
         </Box>

         <SectionHeader>Discrepancies ({discrepancies.length})</SectionHeader>
         {discrepancies.length === 0 ? (
            <Typography variant='body2'>None detected. Customer ledger is internally consistent.</Typography>
         ) : (
            discrepancies.map((d, i) => (
               <Box key={i} sx={{ borderLeft: `4px solid ${severityColor(d.severity)}`, pl: 1.5, mb: 1.5 }}>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: severityColor(d.severity) }}>
                     [{(d.severity || 'low').toUpperCase()}] {d.kind.replace(/_/g, ' ')}
                     {d.invoice_number ? ` — ${d.invoice_number}` : ''}
                     {typeof d.diff_amount === 'number' ? ` (${formatCurrency(d.diff_amount)})` : ''}
                  </Typography>
                  <Typography variant='caption' display='block'>{d.detail}</Typography>
               </Box>
            ))
         )}

         <SectionHeader>Full ledger ({ledger.length} entries)</SectionHeader>
         <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, '& th, & td': { border: '1px solid #ccc', p: '3px 5px', verticalAlign: 'top' }, '& th': { backgroundColor: '#eee', textAlign: 'left' } }}>
            <thead>
               <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th align='right'>Charge</th>
                  <th align='right'>Credit</th>
                  <th align='right'>Running</th>
               </tr>
            </thead>
            <tbody>
               {ledger.map((e, i) => (
                  <tr key={`${e.type}-${e.reference_id}-${i}`}>
                     <td>{e.date}</td>
                     <td>{e.type.replace(/_/g, ' ')}</td>
                     <td>{e.description}</td>
                     <td align='right'>{e.charge ? formatCurrency(e.charge) : ''}</td>
                     <td align='right'>{e.credit ? formatCurrency(e.credit) : ''}</td>
                     <td align='right'>{formatCurrency(e.running_balance)}</td>
                  </tr>
               ))}
            </tbody>
         </Box>

         <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ccc' }}>
            <Typography variant='caption' display='block'>
               Independent audit — recomputed from raw rows in customer_invoices, customer_payments, customer_writeoffs, customer_transactions.
               Does not share code with the in-app balance engine.
            </Typography>
            <Typography variant='caption' display='block'>
               Last bill date used for "unbilled" scoping: {totals.last_bill_date || '—'}
            </Typography>
         </Box>
      </Box>
   );
}
