import { useContext, useEffect, useState } from 'react';
import { Stack, TextField, Alert, Box } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useNavigate } from 'react-router-dom';
import { putEditUserLogin } from '../../../../Services/ApiCalls/PutCalls';
import { context } from '../../../../App';

const defaultState = {
  userLoginName: '',
  isLoginActive: true,
  accountID: null,
  userID: null,
  userLoginID: null
};

export default function ResetUserPassword({ customerData, setCustomerData, userData }) {
  const navigate = useNavigate();
  const { accountID, userID } = useContext(context).loggedInUser;

  const [formState, setFormState] = useState(defaultState);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (userData) {
      setFormState({
        userLoginName: userData.user_name || '',
        isLoginActive: typeof userData.is_login_active === 'boolean' ? userData.is_login_active : true,
        accountID: userData.account_id,
        userID: userData.user_id,
        userLoginID: userData.user_login_id
      });
    }
  }, [userData]);

  const handleReset = async () => {
    setStatus(null);

    if (!newPassword || newPassword.trim().length < 8) {
      setStatus({ severity: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setStatus({ severity: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formState,
        userLoginPassword: newPassword.trim()
      };
      const response = await putEditUserLogin(payload, accountID, userID);
      setStatus({ severity: response.status === 200 ? 'success' : 'error', message: response.message });
      if (response.status === 200) {
        setCustomerData({ ...customerData, teamMembersList: response.teamMembersList });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/account/accountUsers'), 1500);
      }
    } catch (error) {
      setStatus({ severity: 'error', message: 'Unable to reset password. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ mt: 4, maxWidth: 360 }}>
      <TextField
        label='New Password'
        type='password'
        value={newPassword}
        onChange={event => setNewPassword(event.target.value)}
        required
      />
      <TextField
        label='Confirm New Password'
        type='password'
        value={confirmPassword}
        onChange={event => setConfirmPassword(event.target.value)}
        required
      />
      <Box>
        <LoadingButton variant='contained' loading={submitting} onClick={handleReset}>
          Reset Password
        </LoadingButton>
      </Box>
      {status && <Alert severity={status.severity}>{status.message}</Alert>}
    </Stack>
  );
}
