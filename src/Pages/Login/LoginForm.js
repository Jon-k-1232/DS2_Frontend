import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import eyeFill from '@iconify/icons-eva/eye-fill';
import eyeOffFill from '@iconify/icons-eva/eye-off-fill';
import { Stack, TextField, IconButton, InputAdornment, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { postLoginAuth } from '../../Services/ApiCalls/PostCalls';
import TokenService from '../../Services/TokenService';
import { useContext } from 'react';
import { context } from '../../App';

export default function LoginForm() {
   const navigate = useNavigate();
   const [showPassword, setShowPassword] = useState(false);
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [incorrectCredential, setIncorrectCredential] = useState(null);
   const { setLoggedInUser } = useContext(context);

   const handleSubmit = async () => {
      const fetchedToken = await postLoginAuth(username, password);

      if (fetchedToken.message === 'Network Error') {
         setIncorrectCredential(fetchedToken.message);
      } else if (fetchedToken.status !== 200) {
         setIncorrectCredential(fetchedToken?.response?.data);
      } else if (fetchedToken.status === 200) {
         const { account_id, user_id, display_name, job_title, access_level } = fetchedToken.user;
         TokenService.saveAuthToken(fetchedToken.authToken);
         window.sessionStorage.setItem('userID', user_id);
         window.sessionStorage.setItem('accountID', account_id);

         setLoggedInUser({
            accountID: account_id,
            userID: user_id,
            displayName: display_name,
            role: job_title,
            accessLevel: access_level,
            token: fetchedToken.authToken
         });
         navigate('/customers/customersList');
      }
   };

   return (
      <Stack>
         <Stack spacing={3}>
            <TextField fullWidth type='text' label='Username' onChange={e => setUsername(e.target.value)} />

            <TextField
               fullWidth
               type={showPassword ? 'text' : 'password'}
               label='Password'
               onChange={e => setPassword(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSubmit()}
               InputProps={{
                  endAdornment: (
                     <InputAdornment position='end'>
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge='end'>
                           <Icon icon={showPassword ? eyeFill : eyeOffFill} />
                        </IconButton>
                     </InputAdornment>
                  )
               }}
            />
         </Stack>

         <LoadingButton onClick={() => handleSubmit()} style={{ marginTop: '25px' }} fullWidth size='large' variant='contained'>
            Login
         </LoadingButton>
         {incorrectCredential && Object.keys(incorrectCredential).length && (
            <Typography variant='caption' style={{ color: 'red', marginTop: '20px' }}>
               {incorrectCredential.status} / {incorrectCredential.error}
            </Typography>
         )}
      </Stack>
   );
}
