import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, CircularProgress, Paper, Stack, Switch, Typography } from '@mui/material';
import { context } from '../../../App';
import { fetchAccountAutomations } from '../../../Services/ApiCalls/FetchCalls';
import { updateAccountAutomationSetting } from '../../../Services/ApiCalls/PutCalls';

const AccountAutomations = () => {
   const { accountID, userID } = useContext(context).loggedInUser;
   const [automations, setAutomations] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [updatingKeys, setUpdatingKeys] = useState({});

   const loadAutomations = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
         const response = await fetchAccountAutomations(accountID, userID);
         if (response.status !== 200) {
            setAutomations(response.automations || []);
            setError(response.message || 'Unable to load automation settings.');
         } else {
            setAutomations(response.automations || []);
         }
      } catch (err) {
         setAutomations([]);
         setError(err?.response?.data?.message || err.message || 'Unable to load automation settings.');
      } finally {
         setLoading(false);
      }
   }, [accountID, userID]);

   useEffect(() => {
      loadAutomations();
   }, [loadAutomations]);

   const handleToggle = async automation => {
      const { key, isEnabled } = automation;
      const nextValue = !isEnabled;

      setError('');
      setAutomations(prev =>
         prev.map(item => (item.key === key ? { ...item, isEnabled: nextValue } : item))
      );
      setUpdatingKeys(prev => ({ ...prev, [key]: true }));

      try {
         const response = await updateAccountAutomationSetting(accountID, userID, key, nextValue);
         if (response.status !== 200) {
            throw new Error(response.message || 'Unable to update automation setting.');
         }
      } catch (err) {
         setAutomations(prev =>
            prev.map(item => (item.key === key ? { ...item, isEnabled } : item))
         );
         setError(err?.response?.data?.message || err.message || 'Unable to update automation setting.');
      } finally {
         setUpdatingKeys(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
         });
      }
   };

   return (
      <Stack spacing={3}>
         <Stack direction='row' spacing={2} alignItems='center'>
            <Typography variant='h5'>Automations</Typography>
         </Stack>

         {error && (
            <Alert severity='error' onClose={() => setError('')}>
               {error}
            </Alert>
         )}

         {loading ? (
            <Stack alignItems='center' justifyContent='center' sx={{ minHeight: 160 }}>
               <CircularProgress />
            </Stack>
         ) : automations.length ? (
            <Stack spacing={2}>
               {automations.map(automation => (
                  <Paper key={automation.key} elevation={1} sx={{ p: 2 }}>
                     <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Stack spacing={0.5}>
                           <Typography variant='subtitle1'>{automation.label}</Typography>
                           <Typography variant='body2' color='text.secondary'>
                              {automation.description}
                           </Typography>
                        </Stack>
                        <Stack direction='row' spacing={1} alignItems='center'>
                           <Switch
                              color='primary'
                              checked={Boolean(automation.isEnabled)}
                              onChange={() => handleToggle(automation)}
                              disabled={Boolean(updatingKeys[automation.key])}
                              inputProps={{ 'aria-label': `${automation.label} toggle` }}
                           />
                           <Typography variant='body2' color='text.secondary'>
                              {automation.isEnabled ? 'On' : 'Off'}
                           </Typography>
                        </Stack>
                     </Stack>
                  </Paper>
               ))}
            </Stack>
         ) : (
            <Alert severity='info'>No automations are currently available for configuration.</Alert>
         )}
      </Stack>
   );
};

export default AccountAutomations;
