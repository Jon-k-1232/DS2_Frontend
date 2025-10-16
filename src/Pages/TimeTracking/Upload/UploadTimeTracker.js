import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { context } from '../../../App';
import { uploadTimeTrackerFile, downloadLatestTimeTrackerTemplate, fetchTimeTrackingUsers } from '../../../Services/ApiCalls/TimeTrackingCalls';
import FileDropzone from '../../../Components/FileDropzone/FileDropzone';

const acceptedExtensions = ['.csv', '.xls', '.xlsx', '.xlsm'];
const MAX_FILE_SIZE_BYTES = 1024 * 1024;

const UploadTimeTracker = ({ setPageTitle }) => {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token, accessLevel, displayName } = loggedInUser;

   const navigate = useNavigate();
   const [selectedFile, setSelectedFile] = useState(null);
   const [uploading, setUploading] = useState(false);
   const [downloadingTemplate, setDownloadingTemplate] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });
   const [validationErrors, setValidationErrors] = useState([]);
   const [validationMetadata, setValidationMetadata] = useState(null);
   const policyNote =
      'Managers and admins can submit on behalf of team members; all other users may only submit their own time tracker files.';
   const [validationNote, setValidationNote] = useState(policyNote);

   const lowercaseAccessLevel = accessLevel?.toLowerCase?.() || '';
   const isAdmin = lowercaseAccessLevel === 'admin';
   const isManager = lowercaseAccessLevel === 'manager';
   const canSubmitForOthers = isAdmin || isManager;
   const [submissionUserId, setSubmissionUserId] = useState(userID?.toString() || '');
   const [submissionUsers, setSubmissionUsers] = useState([]);
   const [loadingSubmissionUsers, setLoadingSubmissionUsers] = useState(canSubmitForOthers);

   useEffect(() => {
      setPageTitle('Upload Time Tracker');
   }, [setPageTitle]);

   useEffect(() => {
      let isCancelled = false;

      if (!canSubmitForOthers) {
         const selfUserId = userID?.toString() || '';
         setSubmissionUsers([
            {
               userId: Number(userID),
               displayName: displayName || 'You',
               email: ''
            }
         ]);
         setSubmissionUserId(selfUserId);
         setLoadingSubmissionUsers(false);
         return () => {
            isCancelled = true;
         };
      }

      const loadUsers = async () => {
         setLoadingSubmissionUsers(true);
         try {
            const users = await fetchTimeTrackingUsers(accountID, userID, token);
            if (isCancelled) return;

            const sortedUsers = [...(users || [])].sort((a, b) => {
               const nameA = (a.displayName || '').toLowerCase();
               const nameB = (b.displayName || '').toLowerCase();
               if (nameA < nameB) return -1;
               if (nameA > nameB) return 1;
               return 0;
            });

            setSubmissionUsers(sortedUsers);

            const currentSelection = submissionUserId || '';
            const selectionExists = sortedUsers.some(
               user => user.userId?.toString() === currentSelection
            );
            const fallbackSelection = userID?.toString() || '';
            setSubmissionUserId(selectionExists ? currentSelection : fallbackSelection);
         } catch (error) {
            if (!isCancelled) {
               setFeedback({
                  type: 'error',
                  message: error?.response?.data?.message || 'Unable to load team members for submission.'
               });
               setSubmissionUsers([]);
            }
         } finally {
            if (!isCancelled) {
               setLoadingSubmissionUsers(false);
            }
         }
      };

      loadUsers();

      return () => {
         isCancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [accountID, userID, token, canSubmitForOthers, displayName]);

   const resetFeedback = () => setFeedback({ type: null, message: '' });

   const handleFileSelected = file => {
      setSelectedFile(file);
      resetFeedback();
      setValidationErrors([]);
      setValidationMetadata(null);
      setValidationNote(policyNote);
   };

   const handleUpload = async () => {
      if (!selectedFile) {
         setFeedback({ type: 'error', message: 'Select a time tracker file before uploading.' });
         return;
      }

      if (canSubmitForOthers && !submissionUserId) {
         setFeedback({ type: 'error', message: 'Select the team member you are submitting for.' });
         return;
      }

      if (!accountID || !userID) {
         setFeedback({ type: 'error', message: 'Missing account details. Please log in again.' });
         return;
      }

      try {
         setUploading(true);
         setValidationErrors([]);
         setValidationMetadata(null);
         const fileName = selectedFile.name;
         const response = await uploadTimeTrackerFile(
            selectedFile,
            accountID,
            userID,
            token,
            submissionUserId || userID
         );
         const responseMetadata = response?.metadata || null;
         const successMessage = (() => {
            const base = response?.message || `${fileName} validated and uploaded successfully.`;
            if (
               responseMetadata?.submittedForDisplayName &&
               responseMetadata?.submittedForUserId !== responseMetadata?.submittedByUserId
            ) {
               return `${base} Submitted for ${responseMetadata.submittedForDisplayName}.`;
            }
            return base;
         })();
         setFeedback({ type: 'success', message: successMessage });
         setValidationMetadata(responseMetadata);
         setValidationNote(response?.note || policyNote);
         setSelectedFile(null);
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to upload the time tracker. Please try again.';
         const errors = error?.response?.data?.errors || [];
         const note = error?.response?.data?.note || policyNote;
         setValidationErrors(errors);
         setValidationNote(note);
         setValidationMetadata(null);
         setFeedback({ type: 'error', message });
      } finally {
         setUploading(false);
      }
   };

   const triggerFileDownload = (blob, fileName) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
   };

   const handleTemplateDownload = async () => {
      if (!accountID || !userID) {
         setFeedback({ type: 'error', message: 'Missing account details. Please log in again.' });
         return;
      }

      try {
         setDownloadingTemplate(true);
         const { blob, fileName } = await downloadLatestTimeTrackerTemplate(accountID, userID, token);
         triggerFileDownload(blob, fileName);
         setFeedback({ type: 'success', message: `Downloading template ${fileName}.` });
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to download the latest tracker template.';
         setFeedback({ type: 'error', message });
      } finally {
         setDownloadingTemplate(false);
      }
   };

   const errorColumns = useMemo(
      () => [
         { field: 'order', headerName: '#', width: 80, sortable: false },
         { field: 'message', headerName: 'Validation Error', flex: 1, sortable: false }
      ],
      []
   );

   const errorRows = useMemo(
      () =>
         validationErrors.map((message, index) => ({
            id: index + 1,
            order: index + 1,
            message
         })),
      [validationErrors]
   );

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
            <Stack
               direction={{ xs: 'column', md: 'row' }}
               alignItems={{ xs: 'flex-start', md: 'center' }}
               justifyContent='space-between'
               spacing={2}
            >
               <Typography variant='h5'>Upload Time Tracker</Typography>
               <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'center' }}
               >
                  {canSubmitForOthers && (
                     <FormControl size='small' sx={{ minWidth: 220 }}>
                        <InputLabel id='submission-user-select-label'>Submitting For</InputLabel>
                        <Select
                           labelId='submission-user-select-label'
                           id='submission-user-select'
                           value={submissionUserId}
                           label='Submitting For'
                           onChange={event => setSubmissionUserId(event.target.value)}
                           disabled={loadingSubmissionUsers || uploading}
                        >
                           {loadingSubmissionUsers ? (
                              <MenuItem value='' disabled>
                                 Loading team members...
                              </MenuItem>
                           ) : submissionUsers.length ? (
                              submissionUsers.map(user => (
                                 <MenuItem key={user.userId} value={user.userId?.toString()}>
                                    {user.displayName}
                                    {Number(user.userId) === Number(userID) ? ' (You)' : ''}
                                 </MenuItem>
                              ))
                           ) : (
                              <MenuItem value='' disabled>
                                 No active team members found.
                              </MenuItem>
                           )}
                        </Select>
                     </FormControl>
                  )}
                  {isAdmin && (
                     <Button variant='contained' color='primary' startIcon={<UpgradeIcon />} onClick={() => navigate('/time-tracking/update-template')}>
                        Upload New Template For Everyone
                     </Button>
                  )}
                  <Button
                     variant='contained'
                     color='primary'
                     startIcon={downloadingTemplate ? <CircularProgress size={18} color='inherit' /> : <DownloadIcon />}
                     onClick={handleTemplateDownload}
                     disabled={downloadingTemplate}
                  >
                     Download Latest Template
                  </Button>
               </Stack>
            </Stack>

            <FileDropzone
               acceptExtensions={acceptedExtensions}
               maxSizeBytes={MAX_FILE_SIZE_BYTES}
               label='Drag and drop your completed time tracker here'
               helperText='Accepted formats: CSV, XLS, XLSX, XLSM • Max size 1MB'
               onFileSelected={handleFileSelected}
               onError={message => {
                  setFeedback({ type: 'error', message });
                  setSelectedFile(null);
                  setValidationErrors([]);
                  setValidationMetadata(null);
               }}
               selectedFile={selectedFile}
               onClear={() => {
                  setSelectedFile(null);
                  setValidationErrors([]);
                  setValidationMetadata(null);
                  setValidationNote(policyNote);
               }}
            />

            <Typography variant='body2' color='text.secondary'>
               {validationNote}
            </Typography>

            <Stack direction='row' justifyContent='flex-end' spacing={2}>
               <Button
                  variant='contained'
                  color='primary'
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || (canSubmitForOthers && loadingSubmissionUsers)}
               >
                  {uploading ? <CircularProgress size={20} color='inherit' /> : 'Upload'}
               </Button>
            </Stack>

            {validationMetadata && (
               <Stack spacing={0.5}>
                  <Typography variant='subtitle1'>Tracker Details</Typography>
                  <Typography variant='body2' color='text.secondary'>
                     Start Date: {validationMetadata?.startDate || 'N/A'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                     End Date: {validationMetadata?.endDate || 'N/A'}
                  </Typography>
                  {validationMetadata?.submittedForDisplayName && (
                     <Typography variant='body2' color='text.secondary'>
                        Submitted For: {validationMetadata.submittedForDisplayName}
                     </Typography>
                  )}
                  {validationMetadata?.submittedByDisplayName &&
                     validationMetadata?.submittedByUserId !== validationMetadata?.submittedForUserId && (
                        <Typography variant='body2' color='text.secondary'>
                           Submitted By: {validationMetadata.submittedByDisplayName}
                        </Typography>
                     )}
               </Stack>
            )}

            {validationErrors.length > 0 && (
               <Stack spacing={1}>
                  <Typography variant='subtitle1'>Validation Errors</Typography>
                  <DataGrid
                     rows={errorRows}
                     columns={errorColumns}
                     autoHeight
                     disableColumnMenu
                     disableRowSelectionOnClick
                     hideFooter
                  />
               </Stack>
            )}

            {feedback.message && (
               <Alert severity={feedback.type || 'info'} onClose={resetFeedback}>
                  {feedback.message}
               </Alert>
            )}
         </Paper>
      </Stack>
   );
};

export default UploadTimeTracker;
