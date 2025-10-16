import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { context } from '../../../App';
import { downloadTimeTrackerHistoryFile, fetchTimeTrackerHistory } from '../../../Services/ApiCalls/TimeTrackingCalls';

const formatFileSize = size => {
   if (!size || Number.isNaN(size)) return '—';
   if (size < 1024) return `${size} B`;
   if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
   return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const TimeTrackerHistory = ({ setPageTitle }) => {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;

   const [rows, setRows] = useState([]);
   const [loading, setLoading] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });
   const [downloading, setDownloading] = useState(false);
   const [activeDownloadKey, setActiveDownloadKey] = useState(null);

   useEffect(() => {
      setPageTitle('Time Tracker History');
   }, [setPageTitle]);

   const resetFeedback = () => setFeedback({ type: null, message: '' });

   useEffect(() => {
      const loadHistory = async () => {
         if (!accountID || !userID) return;

         try {
            setLoading(true);
            const history = await fetchTimeTrackerHistory(accountID, userID, token);
            setRows(Array.isArray(history) ? history : []);
         } catch (error) {
            const message = error?.response?.data?.message || 'Unable to load your time tracker history.';
            setFeedback({ type: 'error', message });
         } finally {
            setLoading(false);
         }
      };

      loadHistory();
   }, [accountID, userID, token]);

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

   const handleDownload = useCallback(
      async row => {
         if (!row) return;
         try {
            setActiveDownloadKey(row.key);
            setDownloading(true);
            const { blob, fileName } = await downloadTimeTrackerHistoryFile(accountID, userID, row.key, token);
            triggerFileDownload(blob, fileName);
            setFeedback({ type: 'success', message: `Downloading ${fileName}.` });
         } catch (error) {
            const message = error?.response?.data?.message || 'Unable to download the requested tracker.';
            setFeedback({ type: 'error', message });
         } finally {
            setActiveDownloadKey(null);
            setDownloading(false);
         }
      },
      [accountID, token, userID]
   );

   const columns = useMemo(
      () => [
         {
            field: 'fileName',
            headerName: 'File Name',
            flex: 1,
            minWidth: 220
         },
         {
            field: 'uploadedAt',
            headerName: 'Uploaded',
            flex: 1,
            minWidth: 180,
            valueFormatter: params => {
               if (!params.value) return '—';
               return dayjs(params.value).format('MMMM D, YYYY h:mm A');
            }
         },
         {
            field: 'size',
            headerName: 'Size',
            width: 120,
            valueFormatter: params => formatFileSize(params.value)
         },
         {
            field: 'actions',
            headerName: 'Actions',
            width: 140,
            sortable: false,
            filterable: false,
            renderCell: params => (
               <Button
                  variant='contained'
                  color='primary'
                  size='small'
                  startIcon={activeDownloadKey === params.row.key && downloading ? <CircularProgress size={16} color='inherit' /> : <DownloadIcon />}
                  disabled={downloading && activeDownloadKey === params.row.key}
                  onClick={event => {
                     event.stopPropagation();
                     handleDownload(params.row);
                  }}
               >
                  Download
               </Button>
            )
         }
      ],
      [activeDownloadKey, downloading, handleDownload]
   );

   return (
      <Stack spacing={3}>
         <Paper sx={{ p: 4 }}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
               <Typography variant='h5'>Time Tracker History</Typography>
            </Stack>

            <DataGrid
               autoHeight
               rows={rows}
               columns={columns}
               disableRowSelectionOnClick
               loading={loading}
               pageSizeOptions={[5, 10, 25]}
               initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } }
               }}
            />
         </Paper>

         {feedback.message && (
            <Alert severity={feedback.type || 'info'} onClose={resetFeedback}>
               {feedback.message}
            </Alert>
         )}
      </Stack>
   );
};

export default TimeTrackerHistory;
