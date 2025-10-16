import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
   Alert,
   CircularProgress,
   FormControlLabel,
   Paper,
   Stack,
   Switch,
   TextField,
   Typography
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import { context } from '../../../App';
import { fetchAccountAutomations } from '../../../Services/ApiCalls/FetchCalls';
import { updateAccountAutomationSetting } from '../../../Services/ApiCalls/PutCalls';

const AccountAutomations = () => {
   const { accountID, userID, token } = useContext(context).loggedInUser;
   const [automations, setAutomations] = useState([]);
   const [availableUsers, setAvailableUsers] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [updatingKeys, setUpdatingKeys] = useState({});
   const previousRecipientsRef = useRef({});

   const loadAutomations = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
         const response = await fetchAccountAutomations(accountID, userID, token);
         if (response.status !== 200) {
            setAutomations(response.automations || []);
            setAvailableUsers(response.availableUsers || []);
            setError(response.message || 'Unable to load automation settings.');
         } else {
            const normalizedAutomations = (response.automations || []).map(automation => {
               const recipientUserIds = Array.isArray(automation.recipientUserIds) ? automation.recipientUserIds : [];
               return {
                  ...automation,
                  recipientUserIds,
                  sendToAll: recipientUserIds.length === 0
               };
            });
            setAutomations(normalizedAutomations);
            setAvailableUsers(response.availableUsers || []);
            previousRecipientsRef.current = {};
         }
      } catch (err) {
         setAutomations([]);
         setAvailableUsers([]);
         setError(err?.response?.data?.message || err.message || 'Unable to load automation settings.');
      } finally {
         setLoading(false);
      }
   }, [accountID, token, userID]);

   useEffect(() => {
      loadAutomations();
   }, [loadAutomations]);

   const handleToggle = async automation => {
      const { key, isEnabled } = automation;
      const nextValue = !isEnabled;
      const previousState = {
         ...automation,
         recipientUserIds: [...automation.recipientUserIds],
         sendToAll: automation.sendToAll
      };

      setError('');
      setAutomations(prev =>
         prev.map(item => (item.key === key ? { ...item, isEnabled: nextValue } : item))
      );
      setUpdatingKeys(prev => ({ ...prev, [key]: true }));

      try {
         const response = await updateAccountAutomationSetting(
            accountID,
            userID,
            { automationKey: key, isEnabled: nextValue },
            token
         );
         if (response.status !== 200) {
            throw new Error(response.message || 'Unable to update automation setting.');
         }

         const updatedAutomation = response.automation || {};
         setAutomations(prev =>
            prev.map(item =>
               item.key === key
                  ? {
                       ...item,
                       isEnabled: updatedAutomation.isEnabled ?? nextValue,
                       recipientUserIds: Array.isArray(updatedAutomation.recipientUserIds)
                          ? updatedAutomation.recipientUserIds
                          : [...item.recipientUserIds],
                       sendToAll: !(updatedAutomation.recipientUserIds && updatedAutomation.recipientUserIds.length)
                    }
                  : item
            )
         );
      } catch (err) {
         setAutomations(prev =>
            prev.map(item => (item.key === key ? previousState : item))
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

   const updateRecipients = async (automationKey, nextRecipientUserIds, previousState) => {
      setUpdatingKeys(prev => ({ ...prev, [automationKey]: true }));

      try {
         const response = await updateAccountAutomationSetting(
            accountID,
            userID,
            { automationKey, recipientUserIds: nextRecipientUserIds },
            token
         );
         if (response.status !== 200) {
            throw new Error(response.message || 'Unable to update automation recipients.');
         }

         const updatedAutomation = response.automation || {};
         setAutomations(prev =>
            prev.map(item =>
               item.key === automationKey
                  ? {
                       ...item,
                       recipientUserIds: Array.isArray(updatedAutomation.recipientUserIds)
                          ? updatedAutomation.recipientUserIds
                          : [...nextRecipientUserIds],
                       sendToAll: !(updatedAutomation.recipientUserIds && updatedAutomation.recipientUserIds.length)
                    }
                 : item
            )
         );
      } catch (err) {
         setAutomations(prev =>
            prev.map(item => (item.key === automationKey ? previousState : item))
         );
         setError(err?.response?.data?.message || err.message || 'Unable to update automation recipients.');
      } finally {
         setUpdatingKeys(prev => {
            const next = { ...prev };
            delete next[automationKey];
            return next;
         });
      }
   };

   const handleRecipientsChange = async (automation, selectedOptions) => {
      const key = automation.key;
      const previousState = {
         ...automation,
         recipientUserIds: [...automation.recipientUserIds],
         sendToAll: automation.sendToAll
      };
      const nextRecipientUserIds = selectedOptions.map(option => option.userId);

      setError('');
      setAutomations(prev =>
         prev.map(item =>
            item.key === key
               ? {
                    ...item,
                    recipientUserIds: nextRecipientUserIds,
                    sendToAll: nextRecipientUserIds.length === 0
                 }
               : item
         )
      );

      await updateRecipients(key, nextRecipientUserIds, previousState);
   };

   const handleSendToAllToggle = async automation => {
      const key = automation.key;
      const currentlySendingToAll = automation.recipientUserIds.length === 0;
      const previousState = {
         ...automation,
         recipientUserIds: [...automation.recipientUserIds],
         sendToAll: automation.sendToAll
      };

      setError('');

      if (!currentlySendingToAll) {
         previousRecipientsRef.current[key] = [...automation.recipientUserIds];
         setAutomations(prev =>
            prev.map(item =>
               item.key === key
                  ? {
                       ...item,
                       recipientUserIds: [],
                       sendToAll: true
                    }
                  : item
            )
         );
         await updateRecipients(key, [], previousState);
         return;
      }

      const restored = previousRecipientsRef.current[key] || [];
      setAutomations(prev =>
         prev.map(item =>
            item.key === key
               ? {
                    ...item,
                    recipientUserIds: restored,
                    sendToAll: false
                 }
               : item
         )
      );

      await updateRecipients(key, restored, previousState);
   };

   const userOptions = useMemo(
      () =>
         (availableUsers || []).map(user => ({
            ...user,
            label: user.displayName || 'Unnamed User'
         })),
      [availableUsers]
   );

   return (
      <Stack spacing={3}>
         <Typography variant='h5'>Automations</Typography>

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
               {automations.map(automation => {
                  const recipientsDisabled = automation.sendToAll;
                  const selectedOptions = userOptions.filter(option => automation.recipientUserIds.includes(option.userId));
                  return (
                     <Paper key={automation.key} elevation={1} sx={{ p: 2 }}>
                        <Stack spacing={2}>
                           <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={2}
                              justifyContent='space-between'
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                           >
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
                                    inputProps={{ 'aria-label': `${automation.label} automation toggle` }}
                                 />
                                 <Typography variant='body2' color='text.secondary'>
                                    {automation.isEnabled ? 'On' : 'Off'}
                                 </Typography>
                              </Stack>
                           </Stack>

                           <FormControlLabel
                              control={
                                 <Switch
                                    color='primary'
                                    checked={recipientsDisabled}
                                    onChange={() => handleSendToAllToggle(automation)}
                                    disabled={Boolean(updatingKeys[automation.key])}
                                 />
                              }
                              label='Send to all active users with email addresses'
                           />

                          <Autocomplete
                             multiple
                             disableCloseOnSelect
                             clearOnBlur={false}
                             selectOnFocus
                             options={userOptions}
                             value={selectedOptions}
                             onChange={(event, value) => handleRecipientsChange(automation, value)}
                             getOptionLabel={option => option.label}
                             ListboxProps={{
                                style: { maxHeight: 280 }
                             }}
                             sx={{ width: { xs: '100%', md: 360 } }}
                             renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                   <Checkbox
                                      size='small'
                                      checked={selected}
                                      sx={{ mr: 1 }}
                                   />
                                    <Stack>
                                       <Typography variant='body2'>{option.label}</Typography>
                                       {option.email && (
                                          <Typography variant='caption' color='text.secondary'>
                                             {option.email}
                                          </Typography>
                                       )}
                                    </Stack>
                                 </li>
                              )}
                             renderInput={params => (
                                <TextField
                                   {...params}
                                   size='small'
                                   label='Select specific recipients'
                                   placeholder='Choose team members'
                                   helperText={
                                      recipientsDisabled
                                         ? 'Currently goes to all active users. Choose team members below to limit delivery.'
                                         : 'Only the selected users will receive this automation.'
                                   }
                                />
                             )}
                              disabled={Boolean(updatingKeys[automation.key])}
                              noOptionsText='No team members available.'
                           />
                        </Stack>
                     </Paper>
                  );
               })}
            </Stack>
         ) : (
            <Alert severity='info'>No automations are currently available for configuration.</Alert>
         )}
      </Stack>
   );
};

export default AccountAutomations;
