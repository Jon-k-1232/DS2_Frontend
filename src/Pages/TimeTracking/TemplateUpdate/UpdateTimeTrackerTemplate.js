import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { context } from '../../../App';
import FileDropzone from '../../../Components/FileDropzone/FileDropzone';
import { deleteTimeTrackerTemplate, fetchTimeTrackerTemplates, uploadTimeTrackerTemplate } from '../../../Services/ApiCalls/TimeTrackingCalls';

const acceptedExtensions = ['.xls', '.xlsx', '.xlsm', '.csv'];
const MAX_FILE_SIZE_BYTES = 1024 * 1024;

const UpdateTimeTrackerTemplate = ({ setPageTitle }) => {
   const navigate = useNavigate();
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [selectedFile, setSelectedFile] = useState(null);
   const [uploading, setUploading] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });
   const [templates, setTemplates] = useState([]);
   const [loadingTemplates, setLoadingTemplates] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [templateToDelete, setTemplateToDelete] = useState(null);
   const [deleting, setDeleting] = useState(false);

   useEffect(() => {
      setPageTitle('Update Tracker Template');
   }, [setPageTitle]);

   useEffect(() => {
      const loadTemplates = async () => {
         if (!accountID || !userID) return;

         try {
            setLoadingTemplates(true);
            const list = await fetchTimeTrackerTemplates(accountID, userID, token);
            setTemplates(list);
         } catch (error) {
            const message = error?.response?.data?.message || 'Unable to load tracker templates.';
            setFeedback({ type: 'error', message });
         } finally {
            setLoadingTemplates(false);
         }
      };

      loadTemplates();
   }, [accountID, userID, token]);

   const resetFeedback = () => setFeedback({ type: null, message: '' });

   const handleFileSelected = file => {
      setSelectedFile(file);
      resetFeedback();
   };

   const handleUpload = async () => {
      if (!selectedFile) {
         setFeedback({ type: 'error', message: 'Select a tracker template before uploading.' });
         return;
      }

      if (!accountID || !userID) {
         setFeedback({ type: 'error', message: 'Missing account details. Please log in again.' });
         return;
      }

      try {
         setUploading(true);
         await uploadTimeTrackerTemplate(selectedFile, accountID, userID, token);
         setFeedback({ type: 'success', message: 'Template updated successfully.' });
         setSelectedFile(null);
         const list = await fetchTimeTrackerTemplates(accountID, userID, token);
         setTemplates(list);
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to update the tracker template.';
         setFeedback({ type: 'error', message });
      } finally {
         setUploading(false);
      }
   };

   return (
      <Stack spacing={3}>
         <Paper
            sx={{
               p: 4,
               display: 'flex',
               flexDirection: 'column',
               gap: 3
            }}
         >
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
               <Typography variant='h5'>Upload New Tracker Template</Typography>
               <Button variant='outlined' color='primary' startIcon={<ArrowBackIcon />} onClick={() => navigate('/time-tracking/upload')}>
                  Back to Uploads
               </Button>
            </Stack>
            <Typography variant='body2' color='text.secondary'>
               Upload the latest time tracker template. Uploads are stored in S3 under the tracker versions directory and made available for download to your team.
            </Typography>

            <FileDropzone
               acceptExtensions={acceptedExtensions}
               maxSizeBytes={MAX_FILE_SIZE_BYTES}
               label='Drag and drop the updated time tracker template'
               helperText='Accepted formats: CSV, XLS, XLSX, XLSM • Max size 1MB'
               onFileSelected={handleFileSelected}
               onError={message => {
                  setFeedback({ type: 'error', message });
                  setSelectedFile(null);
               }}
               selectedFile={selectedFile}
               onClear={() => setSelectedFile(null)}
            />

            <Stack direction='row' justifyContent='flex-end'>
               <Button variant='contained' color='primary' startIcon={uploading ? <CircularProgress size={20} color='inherit' /> : <SaveIcon />} onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading ? 'Saving...' : 'Upload Template'}
               </Button>
            </Stack>

            {feedback.message && (
               <Alert severity={feedback.type || 'info'} onClose={resetFeedback}>
                  {feedback.message}
               </Alert>
            )}
         </Paper>

         <Paper
            sx={{
               p: 4,
               display: 'flex',
               flexDirection: 'column',
               gap: 2
            }}
         >
            <Typography variant='h6'>Existing Tracker Templates</Typography>
            <Typography variant='body2' color='text.secondary'>
               Older templates can be removed once they are no longer needed. Deleting a template permanently removes it from S3.
            </Typography>
            <DataGrid
               autoHeight
               rows={templates}
               columns={useMemo(
                  () => [
                     {
                        field: 'fileName',
                        headerName: 'File Name',
                        flex: 1,
                        minWidth: 250
                     },
                     {
                        field: 'uploadedAt',
                        headerName: 'Uploaded',
                        flex: 1,
                        minWidth: 200,
                        valueFormatter: params => {
                           if (!params.value) return '—';
                           return dayjs(params.value).format('MMMM D, YYYY h:mm:ss A');
                        }
                     },
                     {
                        field: 'size',
                        headerName: 'Size',
                        width: 130,
                        valueFormatter: params => {
                           const size = params.value;
                           if (!size && size !== 0) return '—';
                           if (size < 1024) return `${size} B`;
                           if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                           return `${(size / (1024 * 1024)).toFixed(1)} MB`;
                        }
                     },
                     {
                        field: 'actions',
                        headerName: 'Actions',
                        width: 120,
                        sortable: false,
                        filterable: false,
                        renderCell: params => (
                           <Button
                              color='error'
                              startIcon={<DeleteIcon />}
                              onClick={event => {
                                 event.stopPropagation();
                                 setTemplateToDelete(params.row);
                                 setDeleteDialogOpen(true);
                              }}
                           >
                              Delete
                           </Button>
                        )
                     }
                  ],
                  []
               )}
               disableRowSelectionOnClick
               loading={loadingTemplates}
               pageSizeOptions={[5, 10, 25]}
               initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } }
               }}
            />
         </Paper>

         <Dialog
            open={deleteDialogOpen}
            onClose={() => {
               if (deleting) return;
               setDeleteDialogOpen(false);
               setTemplateToDelete(null);
            }}
         >
            <DialogTitle>Delete Template</DialogTitle>
            <DialogContent>
               <DialogContentText>
                  {templateToDelete ? `Delete ${templateToDelete.fileName}? This cannot be undone.` : 'Delete this template?'}
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button
                  onClick={() => {
                     if (deleting) return;
                     setDeleteDialogOpen(false);
                     setTemplateToDelete(null);
                  }}
                  disabled={deleting}
               >
                  Cancel
               </Button>
               <Button
                  color='error'
                  variant='contained'
                  startIcon={deleting ? <CircularProgress size={18} color='inherit' /> : <DeleteIcon />}
                  onClick={async () => {
                     if (!templateToDelete) return;
                     try {
                        setDeleting(true);
                        await deleteTimeTrackerTemplate(accountID, userID, templateToDelete.key, token);
                        setFeedback({ type: 'success', message: `${templateToDelete.fileName} deleted.` });
                        const list = await fetchTimeTrackerTemplates(accountID, userID, token);
                        setTemplates(list);
                     } catch (error) {
                        const message = error?.response?.data?.message || 'Unable to delete the tracker template.';
                        setFeedback({ type: 'error', message });
                     } finally {
                        setDeleting(false);
                        setDeleteDialogOpen(false);
                        setTemplateToDelete(null);
                     }
                  }}
                  disabled={deleting}
               >
                  Delete
               </Button>
            </DialogActions>
         </Dialog>
      </Stack>
   );
};

export default UpdateTimeTrackerTemplate;
