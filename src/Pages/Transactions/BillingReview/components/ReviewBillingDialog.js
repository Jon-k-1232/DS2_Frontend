import { useContext, useMemo } from 'react';
import { Alert, Box, Chip, Dialog, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { context } from '../../../../App';
import HoldReasonBadge from './HoldReasonBadge';
import AiSuggestionChip from './AiSuggestionChip';
import Time from '../../TransactionForms/AddTransaction/Time';
import { applyHeldEntry } from '../../../../Services/ApiCalls/BillingReviewCalls';

const NA = 'Not Available';

const _formatDateMDY = d => {
   if (!d) return NA;
   const iso = typeof d === 'string' ? d.slice(0, 10) : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
   const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
   return m ? `${m[2]}-${m[3]}-${m[1]}` : NA;
};

const HOLD_EXPLANATIONS = {
   no_matching_customer: "AI couldn't find a customer in your list matching the tracker's company name (or first + last name).",
   new_customer_needs_addition: 'AI thinks this is a new customer that must be added before billing.',
   employee_not_matched: "The submitter's name didn't match any user in the system.",
   low_ai_confidence: "AI's category confidence was below the auto-insert threshold.",
   ambiguous_category: "AI couldn't pick a single work-description category from the note.",
   missing_required_field: 'A required field (customer / job / category) was missing from the AI suggestion.',
   bedrock_error: 'Bedrock returned an error while processing this row.',
   ai_cost_cap_reached: 'The per-account Bedrock cost cap was hit before this row could be processed.',
   legacy_pre_ai: 'This row pre-dates the AI pipeline and was never processed.'
};

const extractBedrockErrorMessage = aiPayload => {
   try {
      const payload = typeof aiPayload === 'string' ? JSON.parse(aiPayload) : aiPayload;
      const customerReason = payload?.customer?.reason;
      if (typeof customerReason === 'string' && customerReason.startsWith('bedrock_error:')) {
         return customerReason.replace(/^bedrock_error:\s*/, '');
      }
   } catch (_) {
      /* ignore parse failures */
   }
   return null;
};

const camelToSnake = {
   customerID: 'customer_id',
   customerJobID: 'customer_job_id',
   selectedGeneralWorkDescriptionID: 'general_work_description_id',
   transactionDate: 'transaction_date',
   loggedForUserID: 'logged_for_user_id',
   minutes: 'duration_minutes',
   unitCost: 'unit_cost',
   totalTransaction: 'total_transaction',
   isTransactionBillable: 'is_transaction_billable',
   note: 'note',
   detailedJobDescription: 'detailed_work_description',
   transactionType: 'transaction_type'
};

const buildEditsPayload = camelObj => {
   const edits = {};
   for (const [camel, snake] of Object.entries(camelToSnake)) {
      if (camelObj[camel] != null && camelObj[camel] !== '') {
         edits[snake] = camelObj[camel];
      }
   }
   return edits;
};

export default function ReviewBillingDialog({ open, entry, onClose, onApplied, customerData, setCustomerData }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const passedTransactionData = useMemo(() => {
      if (!entry) return {};
      const customers = customerData?.customersList?.activeCustomerData?.activeCustomers || [];
      const users = customerData?.teamMembersList?.activeUserData?.activeUsers || [];
      const workDescriptions = customerData?.workDescriptionsList?.activeWorkDescriptionsData?.workDescriptions || [];
      const norm = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');

      // Customer must come from company_name (business customer) OR first_name + last_name (individual).
      // entity is the EMPLOYER (which business of the multi-business owner the employee was working FOR), not a customer.
      const customerSearchString =
         entry.company_name ||
         (entry.first_name && entry.last_name ? `${entry.first_name} ${entry.last_name}` : null);
      const matchedCustomer = entry.suggested_customer_id
         ? customers.find(c => c.customer_id === entry.suggested_customer_id)
         : customerSearchString
         ? customers.find(c => norm(c.display_name) === norm(customerSearchString))
         : null;

      let resolvedUserId = entry.matched_user_id || null;
      if (!resolvedUserId && entry.employee_name) {
         const u = users.find(u => norm(u.display_name) === norm(entry.employee_name));
         if (u) resolvedUserId = u.user_id;
      }

      const wordsOf = s => norm(s).split(/\s+/).filter(w => w.length >= 4);
      const bestWorkDescriptionByWords = source => {
         const srcWords = wordsOf(source);
         if (srcWords.length === 0) return null;
         const scored = workDescriptions
            .map(w => {
               const wdWords = wordsOf(w.general_work_description);
               const overlap = srcWords.filter(s => wdWords.includes(s)).length;
               return { w, overlap, wdWordCount: wdWords.length };
            })
            .filter(s => s.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap || a.wdWordCount - b.wdWordCount);
         return scored[0]?.w || null;
      };

      let resolvedWorkDescId = entry.suggested_general_work_description_id || null;
      if (!resolvedWorkDescId && entry.category) {
         const cat = norm(entry.category);
         const exact = workDescriptions.find(w => norm(w.general_work_description) === cat);
         if (exact) resolvedWorkDescId = exact.general_work_description_id;
         else {
            const wordMatch = bestWorkDescriptionByWords(entry.category);
            if (wordMatch) resolvedWorkDescId = wordMatch.general_work_description_id;
         }
      }
      if (!resolvedWorkDescId && entry.ai_suggested_category) {
         const aiCat = norm(entry.ai_suggested_category);
         const exact = workDescriptions.find(w => norm(w.general_work_description) === aiCat);
         if (exact) resolvedWorkDescId = exact.general_work_description_id;
         else {
            const wordMatch = bestWorkDescriptionByWords(entry.ai_suggested_category);
            if (wordMatch) resolvedWorkDescId = wordMatch.general_work_description_id;
         }
      }
      if (!resolvedWorkDescId && entry.notes) {
         const wordMatch = bestWorkDescriptionByWords(entry.notes);
         if (wordMatch) resolvedWorkDescId = wordMatch.general_work_description_id;
      }

      return {
         category: entry.category || entry.ai_suggested_category || '',
         date: entry.date || '',
         duration: entry.duration || 0,
         notes: entry.notes || '',
         user_id: resolvedUserId,
         timesheet_entry_id: entry.timesheet_entry_id,
         ai_suggestion: {
            suggested_general_work_description_id: resolvedWorkDescId,
            suggested_category: entry.ai_suggested_category || null,
            ai_confidence: entry.ai_confidence || null,
            ai_reason: entry.ai_reason || null,
            source: 'ai'
         },
         // populateState looks up the customer from these. Don't fall back to entity (= employer, not customer).
         company_name: matchedCustomer?.display_name || entry.suggested_customer_display || entry.company_name || '',
         first_name: entry.first_name || '',
         last_name: entry.last_name || ''
      };
   }, [entry, customerData]);

   const summary = useMemo(() => {
      if (!entry) return '';
      return `${entry.timesheet_name || NA} · ${_formatDateMDY(entry.date)} · ${entry.duration || 0} min`;
   }, [entry]);

   const comparison = useMemo(() => {
      if (!entry) return { rows: [], unmatchedRequired: [] };
      const customers = customerData?.customersList?.activeCustomerData?.activeCustomers || [];
      const workDescriptions = customerData?.workDescriptionsList?.activeWorkDescriptionsData?.workDescriptions || [];
      const users = customerData?.teamMembersList?.activeUserData?.activeUsers || [];
      const norm = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');

      const resolveCustomer = () => {
         if (entry.suggested_customer_id) {
            const hit = customers.find(c => c.customer_id === entry.suggested_customer_id);
            if (hit) return { value: hit.display_name, source: 'ai' };
         }
         // Customer = company_name (business) OR first_name + last_name (individual). NOT entity.
         const trackerCustomer =
            entry.company_name ||
            (entry.first_name && entry.last_name ? `${entry.first_name} ${entry.last_name}` : null) ||
            entry.first_name ||
            entry.last_name ||
            null;
         if (trackerCustomer) {
            const hit = customers.find(c => norm(c.display_name) === norm(trackerCustomer));
            if (hit) return { value: hit.display_name, source: 'tracker' };
         }
         return { value: null, source: 'none' };
      };

      const wordsOfWD = s => norm(s).split(/\s+/).filter(w => w.length >= 4);
      const bestWDByWords = source => {
         const srcWords = wordsOfWD(source);
         if (srcWords.length === 0) return null;
         const scored = workDescriptions
            .map(w => {
               const wdWords = wordsOfWD(w.general_work_description);
               const overlap = srcWords.filter(s => wdWords.includes(s)).length;
               return { w, overlap, wdWordCount: wdWords.length };
            })
            .filter(s => s.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap || a.wdWordCount - b.wdWordCount);
         return scored[0]?.w || null;
      };

      const resolveWorkDesc = () => {
         if (entry.suggested_general_work_description_id) {
            const hit = workDescriptions.find(w => w.general_work_description_id === entry.suggested_general_work_description_id);
            if (hit) return { value: hit.general_work_description, source: 'ai' };
         }
         if (entry.category) {
            const cat = norm(entry.category);
            const exact = workDescriptions.find(w => norm(w.general_work_description) === cat);
            if (exact) return { value: exact.general_work_description, source: 'tracker' };
            const wordMatch = bestWDByWords(entry.category);
            if (wordMatch) return { value: wordMatch.general_work_description, source: 'tracker' };
         }
         if (entry.ai_suggested_category) {
            const hit = workDescriptions.find(w => norm(w.general_work_description) === norm(entry.ai_suggested_category));
            if (hit) return { value: hit.general_work_description, source: 'ai' };
            const wordMatch = bestWDByWords(entry.ai_suggested_category);
            if (wordMatch) return { value: wordMatch.general_work_description, source: 'ai' };
         }
         if (entry.notes) {
            const wordMatch = bestWDByWords(entry.notes);
            if (wordMatch) return { value: wordMatch.general_work_description, source: 'notes' };
         }
         return { value: null, source: 'none', trackerText: entry.category, aiText: entry.ai_suggested_category };
      };

      const resolveEmployee = () => {
         if (entry.matched_user_id) {
            const hit = users.find(u => u.user_id === entry.matched_user_id);
            if (hit) return { value: hit.display_name, source: 'ai' };
         }
         if (entry.employee_name) {
            const trackName = norm(entry.employee_name);
            const exact = users.find(u => norm(u.display_name) === trackName);
            if (exact) return { value: exact.display_name, source: 'tracker' };
            const partial = users.find(u => {
               const dn = norm(u.display_name);
               return dn && (dn.includes(trackName) || trackName.includes(dn));
            });
            if (partial) return { value: partial.display_name, source: 'tracker' };
         }
         return { value: null, source: 'none' };
      };

      const customerR = resolveCustomer();
      const workDescR = resolveWorkDesc();
      const employeeR = resolveEmployee();
      const minutes = Number(entry.duration || 0);
      const hours = minutes ? (minutes / 60).toFixed(2) : null;

      const resolveJob = () => {
         if (!customerR.value || !entry.category) return { value: null, source: 'none' };
         const matchedCustomer = customers.find(c => c.display_name === customerR.value);
         if (!matchedCustomer) return { value: null, source: 'none' };
         const allJobs = customerData?.accountJobsList?.activeJobData?.activeJobs || [];
         const customerOpenJobs = allJobs.filter(
            j => Number(j.customer_id) === Number(matchedCustomer.customer_id) && !j.is_job_complete && !j.parent_job_id
         );
         const catWords = norm(entry.category).split(/\s+/).filter(w => w.length >= 4);
         if (catWords.length === 0) return { value: null, source: 'none' };
         const scored = customerOpenJobs
            .map(j => {
               const jdWords = norm(j.job_description).split(/\s+/).filter(w => w.length >= 4);
               const overlap = catWords.filter(c => jdWords.includes(c)).length;
               return { j, overlap, age: new Date(j.created_at).getTime() || 0 };
            })
            .filter(s => s.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap || b.age - a.age);
         return scored[0] ? { value: scored[0].j.job_description, source: 'tracker' } : { value: null, source: 'none' };
      };
      const jobR = resolveJob();

      const trackerCustomerLabel =
         entry.company_name ||
         (entry.first_name && entry.last_name ? `${entry.first_name} ${entry.last_name}` : null) ||
         entry.first_name ||
         entry.last_name ||
         null;
      const rows = [
         {
            field: 'Customer',
            required: true,
            tracker: trackerCustomerLabel || NA,
            applied: customerR.value,
            source: customerR.source,
            unmatchedNote: customerR.source === 'none' && trackerCustomerLabel ? `"${trackerCustomerLabel}" is not in your active customer list — add it or pick another.` : null
         },
         {
            field: 'Work description',
            required: true,
            tracker: entry.category || NA,
            applied: workDescR.value,
            source: workDescR.source,
            unmatchedNote:
               workDescR.source === 'none'
                  ? `${
                       workDescR.trackerText || workDescR.aiText
                          ? `"${workDescR.trackerText || workDescR.aiText}"`
                          : 'No category text'
                    } has no word-overlap match in your General Work Descriptions list — semantic synonyms (e.g. "Computer Maintenance" → "IT") need Bedrock; pick one manually or add it under Customers → Work Descriptions.`
                  : null
         },
         {
            field: 'Job',
            required: true,
            tracker: entry.category || NA,
            applied: jobR.value,
            source: jobR.source,
            unmatchedNote:
               jobR.source === 'none' && customerR.value
                  ? `No open job for ${customerR.value} matches the tracker category. Pick one below or use the "Create New Job" button.`
                  : null
         },
         {
            field: 'Date',
            required: true,
            tracker: _formatDateMDY(entry.date),
            applied: entry.date ? _formatDateMDY(entry.date) : null,
            source: entry.date ? 'tracker' : 'none'
         },
         {
            field: 'Duration',
            required: true,
            tracker: hours ? `${hours} h` : NA,
            applied: hours ? `${hours} h` : null,
            source: minutes ? 'tracker' : 'none'
         },
         {
            field: 'Employee',
            required: true,
            tracker: entry.employee_name || NA,
            applied: employeeR.value,
            source: employeeR.source,
            unmatchedNote: employeeR.source === 'none' && entry.employee_name ? `"${entry.employee_name}" is not an active user.` : null
         }
      ];

      const unmatchedRequired = rows.filter(r => r.required && r.source === 'none').map(r => r.field);
      const resolvedCustomerObj = customerR.value ? customers.find(c => c.display_name === customerR.value) : null;
      const customerOpenJobs = resolvedCustomerObj
         ? (customerData?.accountJobsList?.activeJobData?.activeJobs || []).filter(
              j =>
                 Number(j.customer_id) === Number(resolvedCustomerObj.customer_id) &&
                 !j.is_job_complete &&
                 !j.parent_job_id // parents only — child rows are internal tracking
           )
         : [];
      return { rows, unmatchedRequired, resolvedCustomerObj, customerOpenJobs };
   }, [entry, customerData]);

   // Effective customer for the Quick-Add-Job UI: prefer whatever's currently
   // picked in the Time form below (manualCustomer), fall back to the AI/tracker
   // pre-fill (comparison.resolvedCustomerObj). This lets the user create a job
   // even when the entry has no auto-resolved customer.
   const passedPostCall = async (dataToPost, accountID, userID) => {
      const edits = buildEditsPayload(dataToPost);
      try {
         await applyHeldEntry(accountID, userID, entry.timesheet_entry_id, edits, token);
         if (typeof onApplied === 'function') {
            await onApplied();
         }
         setTimeout(() => onClose(), 0);
         return {
            status: 200,
            message: 'Held entry applied.',
            transactionsList: customerData?.transactionsList,
            accountRetainersList: customerData?.accountRetainersList,
            accountJobsList: customerData?.accountJobsList,
            paymentsList: customerData?.paymentsList
         };
      } catch (err) {
         return {
            status: err?.status || 500,
            message: err?.message || 'Failed to apply held entry.'
         };
      }
   };

   if (!entry) return null;

   return (
      <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
         <DialogTitle>Review held entry</DialogTitle>
         <DialogContent>
            <Stack spacing={2}>
               {/* Header strip: badges + filename · date · duration */}
               <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                  <HoldReasonBadge reason={entry.hold_reason} />
                  <AiSuggestionChip entry={entry} />
                  <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>{summary}</Typography>
               </Stack>

               {/* Single consolidated status banner */}
               {(() => {
                  const hasMissing = comparison.unmatchedRequired.length > 0;
                  const explanation = HOLD_EXPLANATIONS[entry.hold_reason] || `Held: ${entry.hold_reason || 'unknown reason'}`;
                  const bedrockMsg = entry.hold_reason === 'bedrock_error' ? extractBedrockErrorMessage(entry.ai_payload) : null;
                  const aiCustomerGuess = entry.suggested_customer_display || entry.company_name || [entry.first_name, entry.last_name].filter(Boolean).join(' ') || null;
                  return (
                     <Alert severity={hasMissing ? 'error' : 'warning'} icon={false} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                        <Typography variant='body2'>{explanation}</Typography>
                        {hasMissing && (
                           <Typography variant='body2' sx={{ mt: 0.5 }}>
                              <strong>Manual fix required:</strong> {comparison.unmatchedRequired.join(', ')} must be picked in the form below.
                           </Typography>
                        )}
                        <Stack direction='row' spacing={2} flexWrap='wrap' sx={{ mt: 1 }}>
                           {entry.ai_confidence != null && (
                              <Typography variant='caption'><strong>AI confidence:</strong> {Number(entry.ai_confidence).toFixed(2)}</Typography>
                           )}
                           {aiCustomerGuess && (
                              <Typography variant='caption'><strong>AI customer guess:</strong> {aiCustomerGuess}</Typography>
                           )}
                           {entry.entity && (
                              <Typography variant='caption' color='text.secondary'>
                                 <strong>Logged for entity:</strong> {entry.entity} <em>(employer, not the customer)</em>
                              </Typography>
                           )}
                        </Stack>
                        {entry.ai_reason && (
                           <Typography variant='caption' component='div' sx={{ mt: 0.5 }}>
                              <strong>AI reasoning:</strong> {entry.ai_reason}
                           </Typography>
                        )}
                        {bedrockMsg && (
                           <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                              Bedrock error: {bedrockMsg}
                           </Typography>
                        )}
                     </Alert>
                  );
               })()}

               {/* Side-by-side comparison — tracker note is the last row */}
               <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ px: 1.5, py: 0.75, backgroundColor: 'action.hover' }}>
                     <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        Tracker (original) vs what will be applied
                     </Typography>
                  </Box>
                  <Table size='small'>
                     <TableHead>
                        <TableRow>
                           <TableCell sx={{ width: '18%', fontWeight: 600 }}>Field</TableCell>
                           <TableCell sx={{ width: '36%', fontWeight: 600 }}>From the tracker</TableCell>
                           <TableCell sx={{ width: '46%', fontWeight: 600 }}>Will be applied</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {comparison.rows.map(row => {
                           const unmatched = row.required && row.source === 'none';
                           const sourceChip =
                              row.source === 'ai' ? <Chip size='small' label='AI' color='success' variant='outlined' sx={{ ml: 1, height: 20 }} /> :
                              row.source === 'tracker' ? <Chip size='small' label='from tracker' color='primary' variant='outlined' sx={{ ml: 1, height: 20 }} /> :
                              row.source === 'notes' ? <Chip size='small' label='from notes' color='info' variant='outlined' sx={{ ml: 1, height: 20 }} /> :
                              <Chip size='small' label='manual required' color='error' variant='outlined' sx={{ ml: 1, height: 20 }} />;
                           return (
                              <TableRow key={row.field} sx={{ backgroundColor: unmatched ? 'rgba(244, 67, 54, 0.08)' : undefined }}>
                                 <TableCell sx={{ fontWeight: 500 }}>
                                    {row.field}
                                    {row.required && <Typography component='span' color='error' sx={{ ml: 0.5 }}>*</Typography>}
                                 </TableCell>
                                 <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{row.tracker}</TableCell>
                                 <TableCell>
                                    <Stack direction='row' spacing={0} alignItems='center' flexWrap='wrap'>
                                       <Typography
                                          variant='body2'
                                          component='span'
                                          sx={{ fontWeight: unmatched ? 600 : undefined, color: unmatched ? 'error.main' : undefined }}
                                       >
                                          {row.applied || NA}
                                       </Typography>
                                       {sourceChip}
                                    </Stack>
                                    {row.unmatchedNote && (
                                       <Typography variant='caption' component='div' color='error.main' sx={{ mt: 0.25 }}>
                                          {row.unmatchedNote}
                                       </Typography>
                                    )}
                                 </TableCell>
                              </TableRow>
                           );
                        })}
                        <TableRow>
                           <TableCell sx={{ fontWeight: 500, verticalAlign: 'top' }}>Note</TableCell>
                           <TableCell colSpan={2} sx={{ whiteSpace: 'pre-line', color: 'text.secondary', fontStyle: entry.notes ? 'normal' : 'italic' }}>
                              {entry.notes || '(no note on this tracker line)'}
                              <Typography variant='caption' component='div' color='text.secondary' sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                 Edit "Work Completed On Job" in the form below to change what appears on the bill.
                              </Typography>
                           </TableCell>
                        </TableRow>
                     </TableBody>
                  </Table>
               </Box>

               {/* Form — pre-filled. Job dropdown's last item ("Add New Job") creates a new job inline. */}
               <Time
                  key={entry.timesheet_entry_id}
                  customerData={customerData}
                  setCustomerData={setCustomerData}
                  passedTransactionData={passedTransactionData}
                  passedPostCall={passedPostCall}
               />
            </Stack>
         </DialogContent>
      </Dialog>
   );
}
