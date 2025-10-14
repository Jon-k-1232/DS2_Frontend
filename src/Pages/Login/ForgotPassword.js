import { useState } from 'react';
import { Container, Stack, TextField, Typography, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../Components/Page';
import { requestPasswordReset } from '../../Services/ApiCalls/PostCalls';

const ForgotPassword = () => {
   const [identifier, setIdentifier] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });

   const handleSubmit = async event => {
      event.preventDefault();
      setFeedback({ type: null, message: '' });
      if (!identifier.trim()) {
         setFeedback({ type: 'error', message: 'Enter your username or email to continue.' });
         return;
      }

      try {
         setSubmitting(true);
         await requestPasswordReset(identifier.trim());
         setFeedback({ type: 'success', message: 'If an account matches, a temporary password has been emailed.' });
         setIdentifier('');
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to process your request. Please try again.';
         setFeedback({ type: 'error', message });
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Page title='Forgot Password'>
         <Container maxWidth='sm' sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <Stack component='form' spacing={3} sx={{ width: '100%', maxWidth: 480 }} onSubmit={handleSubmit}>
               <Stack spacing={1}>
                  <Typography variant='h4'>Reset your password</Typography>
                  <Typography variant='body2' color='text.secondary'>Enter the username or email associated with your account.</Typography>
               </Stack>
               <TextField
                  label='Username or Email'
                  value={identifier}
                  onChange={event => setIdentifier(event.target.value)}
                  fullWidth
               />
               <LoadingButton type='submit' variant='contained' loading={submitting}>Send Temporary Password</LoadingButton>
               <Typography variant='body2'>
                  Remembered your password? <RouterLink to='/login'>Return to sign in</RouterLink>
               </Typography>
               {feedback.message && (
                  <Alert severity={feedback.type || 'info'} onClose={() => setFeedback({ type: null, message: '' })}>
                     {feedback.message}
                  </Alert>
               )}
            </Stack>
         </Container>
      </Page>
   );
};

export default ForgotPassword;
