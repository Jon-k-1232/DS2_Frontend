import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { postGoogleAuth } from '../../Services/ApiCalls/PostCalls';
import TokenService from '../../Services/TokenService';
import { context } from '../../App';
import { getDefaultLandingRoute } from '../../utils/navigation';

export default function LoginForm() {
   const navigate = useNavigate();
   const [errorMessage, setErrorMessage] = useState(null);
   const { setLoggedInUser } = useContext(context);

   const handleGoogleSuccess = async credentialResponse => {
      const result = await postGoogleAuth(credentialResponse.credential);

      if (result?.message === 'Network Error') {
         setErrorMessage('Network error — unable to reach DS2.');
         return;
      }
      if (result?.status !== 200) {
         const serverError = result?.response?.data?.error || result?.response?.data?.message;
         setErrorMessage(serverError || 'Sign-in failed.');
         return;
      }

      const { account_id, user_id, display_name, job_title, access_level } = result.user;
      // The JWT is delivered as an httpOnly cookie by the server; we only record
      // a non-sensitive session-expiry marker and identity fields for the UI.
      TokenService.startSession();
      window.sessionStorage.setItem('userID', user_id);
      window.sessionStorage.setItem('accountID', account_id);
      if (access_level) window.sessionStorage.setItem('accessLevel', access_level);
      if (display_name) window.sessionStorage.setItem('displayName', display_name);
      if (job_title) window.sessionStorage.setItem('role', job_title);

      setLoggedInUser({
         accountID: account_id,
         userID: user_id,
         displayName: display_name,
         role: job_title,
         accessLevel: access_level,
         token: TokenService.authMarker()
      });
      setErrorMessage(null);
      navigate(getDefaultLandingRoute(access_level));
   };

   return (
      <Stack spacing={3} alignItems='center'>
         <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMessage('Google sign-in failed. Please try again.')}
            hosted_domain='jimkimmel.com'
            useOneTap
            auto_select
            theme='outline'
            size='large'
         />
         {errorMessage && (
            <Typography variant='caption' style={{ color: 'red' }}>
               {errorMessage}
            </Typography>
         )}
      </Stack>
   );
}
