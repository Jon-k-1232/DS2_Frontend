import React, { useState, useEffect, useContext } from 'react';
import { Divider, Stack, Typography, TextField, Box, Button, Alert, FormControl, FormHelperText, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import CreateInvoiceGrid from '../InvoiceGrids/CreateInvoiceGrid';
import { getOutstandingBalanceList, fetchFileDownload } from '../../../Services/ApiCalls/FetchCalls';
import CreateInvoiceCheckBoxes from './SubComponents/CreateInvoiceCheckBoxes';
import { postInvoiceCreation } from '../../../Services/ApiCalls/PostCalls';
import { context } from '../../../App';

const initialState = {
   invoicesToCreate: [],
   invoiceCreationSettings: { isFinalized: false, isRoughDraft: false, isCsvOnly: true, globalInvoiceNote: '', allowSameDayRebill: false }
};

// customerData (the prop) is intentionally not read — the invoicesList
// update below always applies on top of the LATEST context via the
// functional setCustomerData(prev => ...) form, never a value closed over
// from this render.
export default function CreateNewInvoices({ setCustomerData }) {
   const [postStatus, setPostStatus] = useState(null);
   const [selectedRowsToInvoice, setSelectedRowsToInvoice] = useState(initialState);
   const [outstandingBalanceData, setOutstandingBalanceData] = useState([]);
   const [submitError, setSubmitError] = useState(null);
   const [isLoading, setIsLoading] = useState(false);
   const [openDialog, setOpenDialog] = useState(false);
   // Bumped every time a batch actually commits (status 200) — used as the
   // grid's `key` below so it remounts with a clean internal selection
   // instead of the parent's cleared invoicesToCreate silently drifting out
   // of sync with whatever the grid still shows checked (R3).
   const [batchRevision, setBatchRevision] = useState(0);
   // Customers whose statement the last batch actually created: the grid drops
   // ONLY their per-row drafts (note, show-write-offs) and keeps the drafts of
   // customers the backend skipped, so a retry never loses unsaved instructions.
   const [completedCustomerIds, setCompletedCustomerIds] = useState([]);

   const {
      loggedInUser: { accountID, userID, token }
   } = useContext(context);

   const { invoicesToCreate, invoiceCreationSettings } = selectedRowsToInvoice;
   const { isFinalized, isRoughDraft, isCsvOnly, globalInvoiceNote, allowSameDayRebill } = invoiceCreationSettings;
   // Enables the "Allow same-day re-bill" checkbox — it must stay a no-op
   // (and disabled) unless the selection actually contains a row the backend
   // would otherwise skip for already being billed today.
   const hasBilledTodaySelected = invoicesToCreate.some(row => row?.billed_today);

   useEffect(() => {
      const getOutstandingInvoices = async () => {
         const outstandingBalanceList = await getOutstandingBalanceList(accountID, userID, token);
         setOutstandingBalanceData(outstandingBalanceList);
      };
      getOutstandingInvoices();
      // eslint-disable-next-line
   }, []);

   const handleSubmit = () => {
      if (invoicesToCreate.length === 0) {
         setSubmitError('Selection Error: Select Invoices');
         return;
      }

      if (!isFinalized && !isRoughDraft && !isCsvOnly) {
         setSubmitError('Selection Error: Select checkbox to create Invoices, Rough Draft, or CSV');
         return;
      }

      if (isFinalized) {
         setOpenDialog(true);
         return;
      }

      submitInvoice();
   };

   const submitInvoice = async () => {
      setIsLoading(true);
      setSubmitError(null);
      setOpenDialog(false);

      // Every exit path below — non-200 status, a failed file download, or a
      // thrown request error — used to leave isLoading stuck true forever
      // because setIsLoading(false) only ran at the very end of the success
      // path. try/finally guarantees it always clears.
      try {
         const postedItem = await postInvoiceCreation(selectedRowsToInvoice, accountID, userID);

         setPostStatus(postedItem);

         if (postedItem.status !== 200) return;

         // The commit (finalize/rough-draft/CSV creation itself) already
         // happened server-side by this point — status 200 means it's real,
         // regardless of what happens next. A failed download or balance
         // refresh must never make a committed batch look like it didn't
         // happen: that risks a re-submit issuing a duplicate statement
         // (especially dangerous with same-day rebill enabled), and it hides
         // exactly the skipped-customer/invoice-number detail an accountant
         // needs to reconcile the batch or retry only what's missing.
         setSelectedRowsToInvoice(initialState);
         // Tell the grid which customers were actually invoiced (submitted minus
         // skipped) and bump batchRevision: it clears its selection so checked rows
         // always match what was submitted, but keeps skipped customers' drafts.
         const skippedIds = new Set((postedItem.skippedCustomers || []).map(row => Number(row.customer_id)));
         setCompletedCustomerIds((selectedRowsToInvoice.invoicesToCreate || []).filter(row => !skippedIds.has(Number(row.customer_id))).map(row => row.customer_id));
         setBatchRevision(revision => revision + 1);
         if (postedItem.invoicesList) setCustomerData(prev => ({ ...prev, invoicesList: postedItem.invoicesList }));

         const warnings = [...(postedItem.warnings || [])];

         if (postedItem.fileLocation) {
            try {
               const downloadedPdfFile = await fetchFileDownload(postedItem.fileLocation, 'zipped_files.zip', accountID, userID);
               if (downloadedPdfFile.status !== 200) {
                  throw new Error(downloadedPdfFile.message || 'File download failure');
               }
            } catch (error) {
               warnings.push(`Invoices were created successfully, but the download failed: ${error?.message || 'File download failure'}. Retrieve the file from Invoices.`);
            }
         }

         // Refresh the outstanding balance data — even when the download
         // failed above, the billing itself still committed and the
         // on-screen balances need to reflect that.
         try {
            const updatedOutstandingBalanceList = await getOutstandingBalanceList(accountID, userID, token);
            // getOutstandingBalanceList swallows an HTTP/network failure and
            // resolves with [] rather than rejecting (see FetchCalls.js) — a
            // falsy `.status` on that array used to slip past this guard and
            // get set as the new balance data, which made the grid below
            // render its permanent "Loading..." fallback with no warning at
            // all. Require an actual 200 AND a real grid payload before ever
            // replacing what's currently on screen; on any other shape, keep
            // the last-known-good balance data and only add a warning.
            if (updatedOutstandingBalanceList?.status !== 200 ||
                !updatedOutstandingBalanceList?.outstandingBalanceList?.activeOutstandingBalancesData?.grid) {
               throw new Error(updatedOutstandingBalanceList?.message || 'Balance refresh failed');
            }
            setOutstandingBalanceData(updatedOutstandingBalanceList);
         } catch (error) {
            warnings.push(`Invoices were created successfully; refresh the page to see updated balances: ${error?.message || 'Balance refresh failed'}.`);
         }

         // No auto-clear: a same-day-rebill or all-skipped batch's warning/skip
         // detail (who got skipped, why, and their existing invoice number) has
         // to stay on screen until the user has actually read it and dismissed
         // it themselves — 2 seconds was not enough to reconcile a batch or to
         // read with assistive technology.
         setPostStatus({ ...postedItem, warnings });
      } catch (error) {
         setPostStatus({
            status: 500,
            message: error?.response?.data?.message || error?.message || 'An error occurred while creating invoices.'
         });
      } finally {
         setIsLoading(false);
      }
   };

   const handleSelectedRowsChange = selectedRows => {
      setSelectedRowsToInvoice({ ...selectedRowsToInvoice, invoicesToCreate: selectedRows });
      if (submitError === 'Selection Error: Select Invoices') setSubmitError(null);
   };

   const handleCreationSettings = (propertyName, propertyValue) => {
      if (submitError === 'Selection Error: Select checkbox to create Invoices, Rough Draft, or CSV') setSubmitError(null);
      setSelectedRowsToInvoice({
         ...selectedRowsToInvoice,
         invoiceCreationSettings: { ...invoiceCreationSettings, [propertyName]: propertyValue }
      });
   };

   const handleCloseDialog = () => setOpenDialog(false);

   return (
      <>
         <Stack spacing={3}>
            <Typography variant='h6'>Create New Invoices</Typography>

            <Divider />
            <Box style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', alignSelf: 'center' }}>
               <Box display='flex' alignItems='end' gap={4}>
                  <CreateInvoiceCheckBoxes
                     invoiceCreationSettings={invoiceCreationSettings}
                     setInvoiceCreationSettings={handleCreationSettings}
                     hasBilledTodaySelected={hasBilledTodaySelected}
                  />
               </Box>

               <Box>
                  <TextField
                     size='small'
                     variant='standard'
                     sx={{ width: 715 }}
                     label='(Optional) Add Note To Appear On All Invoices'
                     value={globalInvoiceNote}
                     onChange={e => handleCreationSettings('globalInvoiceNote', e.target.value)}
                  />
               </Box>

               <Box display='flex' justifyContent='flex-end'>
                  <Button onClick={handleSubmit} disabled={isLoading}>
                     Submit
                  </Button>
               </Box>
               <Box display='flex' justifyContent='flex-end'>
                  {submitError && <FormControl error={submitError !== null}>{submitError && <FormHelperText style={{ color: 'red' }}>{submitError}</FormHelperText>}</FormControl>}

                  {postStatus && (
                     <Stack spacing={1} sx={{ width: '100%', alignItems: 'flex-end' }}>
                        <Alert severity={postStatus.status === 200 ? 'success' : 'error'} onClose={() => setPostStatus(null)}>
                           {postStatus.message}
                        </Alert>
                        {Array.isArray(postStatus.skippedCustomers) && postStatus.skippedCustomers.length > 0 && (
                           <Alert severity='warning' sx={{ width: '100%' }}>
                              Skipped {postStatus.skippedCustomers.length} customer{postStatus.skippedCustomers.length === 1 ? '' : 's'}:
                              <Box component='ul' sx={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                                 {postStatus.skippedCustomers.map(skipped => (
                                    <li key={skipped.customer_id}>
                                       {skipped.display_name || `Customer #${skipped.customer_id}`}
                                       {skipped.invoice_number ? ` (${skipped.invoice_number})` : ''}
                                       {skipped.reason ? ` — ${skipped.reason}` : ''}
                                    </li>
                                 ))}
                              </Box>
                           </Alert>
                        )}
                        {Array.isArray(postStatus.warnings) && postStatus.warnings.length > 0 && (
                           <Alert severity='warning' sx={{ width: '100%' }}>
                              <Box component='ul' sx={{ margin: 0, paddingLeft: '20px' }}>
                                 {postStatus.warnings.map((warning, index) => (
                                    <li key={index}>{typeof warning === 'string' ? warning : warning?.message || JSON.stringify(warning)}</li>
                                 ))}
                              </Box>
                           </Alert>
                        )}
                     </Stack>
                  )}
               </Box>
               {isLoading && <LinearProgress />}
            </Box>

            <Divider />

            <CreateInvoiceGrid batchRevision={batchRevision} completedCustomerIds={completedCustomerIds} outstandingBalanceData={outstandingBalanceData} setSelectedRowsToInvoice={handleSelectedRowsChange} />
         </Stack>

         <Dialog open={openDialog} onClose={handleCloseDialog}>
            <DialogTitle>Confirm Finalization</DialogTitle>
            <DialogContent>
               <DialogContentText>
                  {allowSameDayRebill
                     ? "You are finalizing these invoices. This REPLACES one or more customers' statements already issued today — their earlier statement will be absorbed into this new one instead of staying outstanding on its own. Please confirm."
                     : 'You are finalizing these invoices, please confirm.'}
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button onClick={submitInvoice} disabled={isLoading}>
                  Confirm
               </Button>
               <Button onClick={handleCloseDialog} disabled={isLoading}>
                  Cancel
               </Button>
            </DialogActions>
         </Dialog>
      </>
   );
}
