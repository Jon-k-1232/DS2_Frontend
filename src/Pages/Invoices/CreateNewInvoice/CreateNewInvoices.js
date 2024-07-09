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
   invoiceCreationSettings: { isFinalized: false, isRoughDraft: false, isCsvOnly: true, globalInvoiceNote: '' }
};

export default function CreateNewInvoices({ customerData, setCustomerData }) {
   const [postStatus, setPostStatus] = useState(null);
   const [selectedRowsToInvoice, setSelectedRowsToInvoice] = useState(initialState);
   const [outstandingBalanceData, setOutstandingBalanceData] = useState([]);
   const [submitError, setSubmitError] = useState(null);
   const [isLoading, setIsLoading] = useState(false);
   const [openDialog, setOpenDialog] = useState(false);

   const {
      loggedInUser: { accountID, userID, token }
   } = useContext(context);

   const { invoicesToCreate, invoiceCreationSettings } = selectedRowsToInvoice;
   const { isFinalized, isRoughDraft, isCsvOnly, globalInvoiceNote } = invoiceCreationSettings;

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

      const postedItem = await postInvoiceCreation(selectedRowsToInvoice, accountID, userID);

      setPostStatus(postedItem);

      if (postedItem.status === 200) {
         const downloadedPdfFile = await fetchFileDownload(postedItem.fileLocation, 'zipped_files.zip', accountID, userID);
         if (downloadedPdfFile.status !== 200) return setPostStatus(downloadedPdfFile);

         setIsLoading(false);
         setTimeout(() => setPostStatus(null), 2000);

         setSelectedRowsToInvoice(initialState);
         setCustomerData({ ...customerData, invoicesList: postedItem.invoicesList });
         window.location.reload();
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
                  <CreateInvoiceCheckBoxes invoiceCreationSettings={invoiceCreationSettings} setInvoiceCreationSettings={handleCreationSettings} />
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
                  <Button onClick={handleSubmit}>Submit</Button>
               </Box>
               <Box display='flex' justifyContent='flex-end'>
                  {submitError && <FormControl error={submitError !== null}>{submitError && <FormHelperText style={{ color: 'red' }}>{submitError}</FormHelperText>}</FormControl>}

                  {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
               </Box>
               {isLoading && <LinearProgress />}
            </Box>

            <Divider />

            <CreateInvoiceGrid outstandingBalanceData={outstandingBalanceData} setSelectedRowsToInvoice={handleSelectedRowsChange} />
         </Stack>

         <Dialog open={openDialog} onClose={handleCloseDialog}>
            <DialogTitle>Confirm Finalization</DialogTitle>
            <DialogContent>
               <DialogContentText>You are finalizing these invoices, please confirm.</DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button onClick={submitInvoice}>Confirm</Button>
               <Button onClick={handleCloseDialog}>Cancel</Button>
            </DialogActions>
         </Dialog>
      </>
   );
}
