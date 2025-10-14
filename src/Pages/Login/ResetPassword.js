import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, TextField, Typography, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import Page from '../../Components/Page';
import TokenService from '../../Services/TokenService';
import { context } from '../../App';
import { updatePasswordAfterReset } from '../../Services/ApiCalls/PostCalls';

const ResetPassword = () => {
   const navigate = useNavigate();
   const { loggedInUser, setLoggedInUser } = useContext(context);
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [feedback, setFeedback] = useState({ type: null, message: '' });
   const [hasCompletedReset, setHasCompletedReset] = useState(false);

   useEffect(() => {
      if (!TokenService.hasAuthToken()) {
         navigate('/login', { replace: true });
         return;
      }

      if (!loggedInUser?.requiresPasswordReset && !hasCompletedReset) {
         navigate('/customers/customersList', { replace: true });
      }
   }, [loggedInUser?.requiresPasswordReset, navigate, hasCompletedReset]);

   const handleSubmit = async event => {
      event.preventDefault();
      setFeedback({ type: null, message: '' });

      if (!newPassword.trim() || newPassword.trim().length < 8) {
         setFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
         return;
      }

      if (newPassword.trim() !== confirmPassword.trim()) {
         setFeedback({ type: 'error', message: 'Passwords do not match.' });
         return;
      }

      try {
         setSubmitting(true);
         await updatePasswordAfterReset(newPassword.trim());
         window.sessionStorage.removeItem('requiresPasswordReset');
         setLoggedInUser(prev => ({
            ...(prev || {}),
            requiresPasswordReset: false
         }));
         setHasCompletedReset(true);
         setFeedback({ type: 'success', message: 'Password updated successfully. Redirecting to your dashboard...' });
         setNewPassword('');
         setConfirmPassword('');
         setTimeout(() => navigate('/customers/customersList', { replace: true }), 1500);
      } catch (error) {
         const message = error?.response?.data?.message || 'Unable to update password. Please try again.';
         setFeedback({ type: 'error', message });
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Page title='Create New Password'>
         <Container maxWidth='sm' sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <Stack component='form' spacing={3} sx={{ width: '100%', maxWidth: 480 }} onSubmit={handleSubmit}>
               <Stack spacing={1}>
                  <Typography variant='h4'>Create a new password</Typography>
                  <Typography variant='body2' color='text.secondary'>Enter a new password to replace your temporary one.</Typography>
               </Stack>
               <TextField
                  label='New password'
                  type='password'
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  fullWidth
               />
               <TextField
                  label='Confirm new password'
                  type='password'
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  fullWidth
               />
               <LoadingButton type='submit' variant='contained' loading={submitting}>Update Password</LoadingButton>
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

export default ResetPassword;
