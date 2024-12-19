import React from 'react';
import { Button, CircularProgress, Typography, Stack, Tooltip } from '@mui/material';

/**
 * A reusable button component with loading and error handling.
 *
 * Props:
 * - buttonText: The text to display on the button.
 * - loading: Boolean flag to indicate if the button is in a loading state.
 * - errorMessage: A string message displayed below the button on error.
 * - onClick: The function to call when the button is clicked.
 */
export default function ButtonWithLoader({ buttonText = 'Submit', loading = false, errorMessage = '', onClick = () => {} }) {
   return (
      <Stack spacing={1} alignItems='flex-end'>
         {' '}
         {/* Vertical alignment */}
         {/* Tooltip wraps the button for additional context */}
         <Tooltip title={errorMessage || ''} disableHoverListener={!errorMessage}>
            <Button
               variant='contained'
               color={errorMessage ? 'error' : 'primary'} // Change color if there's an error
               onClick={onClick}
               disabled={loading} // Disable button while loading
               sx={{ minWidth: '120px' }} // Ensure button doesn't shrink
            >
               {buttonText}
               {loading && <CircularProgress size={20} style={{ marginLeft: 8 }} />}
            </Button>
         </Tooltip>
         {/* Error message below the button */}
         {errorMessage && (
            <Typography variant='body2' color='error' align='right'>
               {errorMessage}
            </Typography>
         )}
      </Stack>
   );
}
