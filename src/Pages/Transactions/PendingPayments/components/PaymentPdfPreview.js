import React, { useState, useEffect, useContext, useRef } from 'react';
import { Box, Typography, CircularProgress, Button, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { context } from '../../../../App';
import { fetchPaymentFilePreview } from '../../../../Services/ApiCalls/PendingPaymentsCalls';

export default function PaymentPdfPreview({ fileName }) {
   const { loggedInUser } = useContext(context);
   const { accountID, userID, token } = loggedInUser;
   const [pdfUrl, setPdfUrl] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const objectUrlRef = useRef(null);

   useEffect(() => {
      if (!fileName) return;

      const loadPdf = async () => {
         setLoading(true);
         setError(null);
         setPdfUrl(null);

         // Revoke previous URL
         if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
         }

         try {
            const blob = await fetchPaymentFilePreview(fileName, accountID, userID, token);
            // Force the correct MIME type so the browser renders inline
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);
            objectUrlRef.current = url;
            setPdfUrl(url);
         } catch (err) {
            setError('Unable to load PDF preview.');
            console.error('PDF preview error:', err);
         } finally {
            setLoading(false);
         }
      };

      loadPdf();

      return () => {
         if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
         }
      };
   }, [fileName, accountID, userID, token]);

   if (loading) {
      return (
         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
            <CircularProgress />
         </Box>
      );
   }

   if (error) {
      return (
         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
            <Typography color='error'>{error}</Typography>
         </Box>
      );
   }

   const handleDownload = () => {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
   };

   return (
      <Stack spacing={1} sx={{ height: '100%', minHeight: 600 }}>
         <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size='small' startIcon={<DownloadIcon />} onClick={handleDownload}>
               Download
            </Button>
         </Box>
         <Box sx={{ flex: 1, minHeight: 560 }}>
            <iframe
               src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
               title='Payment document preview'
               width='100%'
               height='100%'
               style={{ minHeight: 560, border: 'none' }}
            />
         </Box>
      </Stack>
   );
}
