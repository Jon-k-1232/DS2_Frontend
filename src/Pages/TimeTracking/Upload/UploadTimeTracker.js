import React, { useContext, useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import { useNavigate } from 'react-router-dom';
import { context } from '../../../App';
import { uploadTimeTrackerFile, downloadLatestTimeTrackerTemplate } from '../../../Services/ApiCalls/TimeTrackingCalls';
import FileDropzone from '../../../Components/FileDropzone/FileDropzone';

const acceptedExtensions = ['.csv', '.xls', '.xlsx', '.xlsm'];
const MAX_FILE_SIZE_BYTES = 1024 * 1024;

const UploadTimeTracker = ({ setPageTitle }) => {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token, accessLevel } = loggedInUser;

   const navigate = useNavigate();
   const [selectedFile, setSelectedFile] = useState(null);
   const [uploading, setUploading] = useState(false);
   const [downloadingTemplate, setDownloadingTemplate] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });

   const isAdmin = accessLevel?.toLowerCase() === 'admin';

   useEffect(() => {
      setPageTitle('Upload Time Tracker');
   }, [setPageTitle]);

   const resetFeedback = () => setFeedback({ type: null, message: '' });

   const handleFileSelected = file => {
      setSelectedFile(file);
      resetFeedback();
   };

   const handleUpload = async () => {
      if (!selectedFile) {
         setFeedback({ type: 'error', message: 'Select a time tracker file before uploading.' });
         return;
      }

      if (!accountID || !userID) {
         setFeedback({ type: 'error', message: 'Missing account details. Please log in again.' });
         return;
      }

      try {
         setUploading(true);
         const fileName = selectedFile.name;
         await uploadTimeTrackerFile(selectedFile, accountID, userID, token);
         setFeedback({ type: 'success', message: `${fileName} uploaded successfully.` });
         setSelectedFile(null);
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to upload the time tracker. Please try again.';
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
            <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
               <Typography variant='h5'>Upload Time Tracker</Typography>
               <Stack direction='row' spacing={2}>
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
               }}
               selectedFile={selectedFile}
               onClear={() => setSelectedFile(null)}
            />

            <Stack direction='row' justifyContent='flex-end' spacing={2}>
               <Button variant='contained' color='primary' onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading ? <CircularProgress size={20} color='inherit' /> : 'Upload'}
               </Button>
            </Stack>

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
