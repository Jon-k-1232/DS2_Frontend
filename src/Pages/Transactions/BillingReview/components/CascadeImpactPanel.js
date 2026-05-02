import { useEffect, useState } from 'react';
import { Alert, AlertTitle, Snackbar } from '@mui/material';

const AUTO_DISMISS_MS = 5000;

export default function CascadeImpactPanel({ sideEffects = [] }) {
   const [open, setOpen] = useState(false);

   // Re-show whenever a fresh batch of side effects arrives, then auto-dismiss.
   useEffect(() => {
      if (sideEffects.length) {
         setOpen(true);
         const t = setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
         return () => clearTimeout(t);
      }
   }, [sideEffects]);

   if (!sideEffects.length) return null;
   const wroteTrainingExample = sideEffects.some(s => s.type === 'training_example_written');

   return (
      <Snackbar
         open={open}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
         onClose={() => setOpen(false)}
         autoHideDuration={AUTO_DISMISS_MS}
      >
         <Alert severity='success' onClose={() => setOpen(false)} sx={{ width: '100%' }}>
            <AlertTitle>Transaction updated</AlertTitle>
            {wroteTrainingExample && 'AI training example recorded for the learning loop.'}
         </Alert>
      </Snackbar>
   );
}
