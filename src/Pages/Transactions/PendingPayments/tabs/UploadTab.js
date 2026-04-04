import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Stack, Alert, AlertTitle, Typography, Box, Button, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { context } from '../../../../App';
import FileDropzone from '../../../../Components/FileDropzone/FileDropzone';
import { uploadPaymentFile, fetchPaymentFiles, deletePaymentFile } from '../../../../Services/ApiCalls/PendingPaymentsCalls';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function UploadTab({ onCountsChanged }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [selectedFile, setSelectedFile] = useState(null);
   const [uploading, setUploading] = useState(false);
   const [feedback, setFeedback] = useState(null);
   const [processingNotice, setProcessingNotice] = useState(false);
   const [files, setFiles] = useState([]);
   const [filesLoading, setFilesLoading] = useState(false);

   const loadFiles = useCallback(async () => {
      if (!accountID || !userID || !token) return;
      setFilesLoading(true);
      try {
         const response = await fetchPaymentFiles(accountID, userID, token);
         setFiles(response?.files || []);
      } catch (error) {
         console.error('Error loading files:', error);
      } finally {
         setFilesLoading(false);
      }
   }, [accountID, userID, token]);

   useEffect(() => {
      loadFiles();
   }, [loadFiles]);

   const handleUpload = async () => {
      if (!selectedFile) return;
      setUploading(true);
      setFeedback(null);

      try {
         const result = await uploadPaymentFile(selectedFile, accountID, userID, token);
         if (result.status === 200) {
            setFeedback({ type: 'success', message: `${result.fileName} uploaded successfully.` });
            setProcessingNotice(true);
            setSelectedFile(null);
            loadFiles();
            onCountsChanged();
         } else {
            setFeedback({ type: 'error', message: result.message });
         }
      } catch (error) {
         setFeedback({ type: 'error', message: error.response?.data?.message || 'Upload failed.' });
      } finally {
         setUploading(false);
      }
   };

   const handleDeleteFile = async sourceFile => {
      try {
         const result = await deletePaymentFile(sourceFile, accountID, userID, token);
         if (result.status === 200) {
            setFeedback({ type: 'success', message: 'File and associated pending payments deleted.' });
            setTimeout(() => setFeedback(null), 3000);
            loadFiles();
            onCountsChanged();
         } else {
            setFeedback({ type: 'error', message: result.message });
         }
      } catch (error) {
         setFeedback({ type: 'error', message: error.response?.data?.message || 'Delete failed.' });
      }
   };

   const fileColumns = [
      { field: 'source_file', headerName: 'File Name', flex: 1, minWidth: 300 },
      {
         field: 'uploaded_at', headerName: 'Uploaded', width: 170,
         valueFormatter: ({ value }) => value ? dayjs(value).format('MM/DD/YYYY h:mm A') : ''
      },
      { field: 'payment_count', headerName: 'Payments', width: 100, type: 'number' },
      { field: 'processed_count', headerName: 'Approved', width: 100, type: 'number' },
      {
         field: 'processing_status', headerName: 'Processing Status', width: 150, sortable: false,
         renderCell: ({ row }) => {
            const count = Number(row.payment_count || 0);
            const approved = Number(row.processed_count || 0);
            if (count === 0) {
               // File uploaded but no payments extracted yet — could be processing or failed
               const uploadedAt = dayjs(row.uploaded_at);
               const minutesAgo = dayjs().diff(uploadedAt, 'minute');
               if (minutesAgo > 15) return <Chip label='Error' size='small' color='error' />;
               return <Chip label='Processing' size='small' color='info' />;
            }
            if (approved === count) return <Chip label='All Approved' size='small' color='success' />;
            if (approved > 0) return <Chip label='Partial' size='small' color='warning' />;
            return <Chip label='Pending Review' size='small' color='default' />;
         }
      },
      {
         field: 'actions', headerName: '', width: 110, sortable: false, filterable: false,
         renderCell: ({ row }) => (
            <Button
               size='small'
               color='error'
               disabled={row.has_processed}
               onClick={e => {
                  e.stopPropagation();
                  handleDeleteFile(row.source_file);
               }}
            >
               {row.has_processed ? 'Locked' : 'Delete'}
            </Button>
         )
      }
   ];

   return (
      <Stack spacing={3}>
         {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}

         {processingNotice && (
            <Alert severity='info' onClose={() => setProcessingNotice(false)}>
               <AlertTitle>File Processing In Progress</AlertTitle>
               Uploaded files typically take 5-10 minutes to process. Payments will appear in the "New Payments"
               tab once extraction is complete. If a file shows an "Error" status in the table below after 15 minutes,
               the processing may have failed — please re-upload the file or contact support.
            </Alert>
         )}

         {/* Upload section */}
         <Box>
            <Typography variant='subtitle1' sx={{ mb: 1 }}>Upload Payment Documents</Typography>
            <FileDropzone
               acceptExtensions={['.pdf']}
               maxSizeBytes={MAX_FILE_SIZE_BYTES}
               label='Drag and drop payment PDFs here'
               onFileSelected={file => setSelectedFile(file)}
               onError={message => setFeedback({ type: 'error', message })}
               selectedFile={selectedFile}
               onClear={() => setSelectedFile(null)}
            />
            {selectedFile && (
               <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant='body2'>{selectedFile.name}</Typography>
                  <Button variant='contained' size='small' onClick={handleUpload} disabled={uploading}>
                     {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
               </Box>
            )}
         </Box>

         {/* Uploaded files list */}
         <Box>
            <Typography variant='subtitle1' sx={{ mb: 1 }}>Uploaded Files</Typography>
            <DataGrid
               rows={files}
               columns={fileColumns}
               getRowId={row => row.source_file}
               loading={filesLoading}
               pageSizeOptions={[10, 20]}
               initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
               autoHeight
               disableRowSelectionOnClick
            />
         </Box>
      </Stack>
   );
}
