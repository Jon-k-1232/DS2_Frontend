import React from 'react';
import { Alert, Typography } from '@mui/material';

export default function FieldSuggestion({ label, suggestion, confidence }) {
   if (!suggestion) return null;

   const confidenceLabel = typeof confidence === 'number' ? ` (confidence ${(confidence * 100).toFixed(0)}%)` : '';

   return (
      <Alert severity='info' sx={{ width: 350 }}>
         <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            Suggested {label}
            {confidenceLabel}
         </Typography>
         <Typography variant='body2'>{suggestion}</Typography>
      </Alert>
   );
}
