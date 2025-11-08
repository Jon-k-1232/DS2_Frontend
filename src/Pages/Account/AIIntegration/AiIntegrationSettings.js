import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
   Alert,
   Button,
   Chip,
   CircularProgress,
   FormControlLabel,
   MenuItem,
   Paper,
   Stack,
   Switch,
   TextField,
   Typography
} from '@mui/material';
import { context } from '../../../App';
import { fetchAiIntegrationModels, fetchAiIntegrationSettings } from '../../../Services/ApiCalls/FetchCalls';
import { createAiIntegration } from '../../../Services/ApiCalls/PostCalls';
import { updateAiIntegration } from '../../../Services/ApiCalls/PutCalls';
import { deleteAiIntegration } from '../../../Services/ApiCalls/DeleteCalls';

const determineCostTier = (modelValue, models = []) => {
   if (!modelValue) return '';
   const option = models.find(item => item.value === modelValue);
   if (option?.costTier) return option.costTier;

   if (/gpt-3\.5/i.test(modelValue)) return 'cheap';
   if (/mini/i.test(modelValue)) return 'less cheap';
   if (/gpt-4o/i.test(modelValue)) return 'average';
   if (/gpt-4\.1-pro/i.test(modelValue)) return 'expensive';
   if (/gpt-4\.1/i.test(modelValue)) return 'more expensive';
   if (/gpt-4/i.test(modelValue)) return 'expensive';
   return 'unknown';
};

const AiIntegrationSettings = () => {
   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [connecting, setConnecting] = useState(false);
   const [removing, setRemoving] = useState(false);
   const [availableModels, setAvailableModels] = useState([]);
   const [integrationRecord, setIntegrationRecord] = useState(null);
   const [hasStoredKey, setHasStoredKey] = useState(false);
   const [notification, setNotification] = useState(null);
   const [modelsLoading, setModelsLoading] = useState(false);
   const [modelStatus, setModelStatus] = useState({
      connected: false,
      message: 'Add an API key to load models.',
      error: false
   });

   const [formState, setFormState] = useState(() => ({
      isEnabled: false,
      apiKey: '',
      model: '',
      modelCostTier: ''
   }));

   const resetNotification = () => setNotification(null);

   const loadModels = useCallback(
      async integration => {
         if (!integration?.hasApiKey) {
            setAvailableModels([]);
            setModelStatus({
               connected: false,
               message: 'Add an API key to load models.',
               error: false
            });
            return;
         }

         setModelsLoading(true);
         setModelStatus({
            connected: false,
            message: 'Checking OpenAI connection…',
            error: false
         });

         try {
            const response = await fetchAiIntegrationModels(accountID, userID, token);
            if (response.status !== 200) {
               throw new Error(response.message || 'Unable to load AI integration models.');
            }

            const models = Array.isArray(response.models) ? response.models : [];
            if (!models.length) {
               throw new Error(response.message || 'OpenAI returned no models.');
            }

            let nextModels = models;
            if (integration?.model && !nextModels.some(item => item.value === integration.model)) {
               nextModels = [
                  ...nextModels,
                  {
                     value: integration.model,
                     label: integration.model,
                     costTier: integration.modelCostTier || determineCostTier(integration.model, nextModels) || 'custom'
                  }
               ];
            }

            setAvailableModels(nextModels);

            setFormState(prev => {
               let nextModel = prev.model;
               if (integration?.model && models.some(item => item.value === integration.model)) {
                  nextModel = integration.model;
               } else if (nextModel && !models.some(item => item.value === nextModel)) {
                  nextModel = '';
               }

               const nextCostTier = nextModel
                  ? integration?.model && integration.model === nextModel && integration.modelCostTier
                     ? integration.modelCostTier
                     : determineCostTier(nextModel, nextModels)
                  : '';

               return {
                  ...prev,
                  isEnabled: integration?.isEnabled ?? prev.isEnabled,
                  model: nextModel,
                  modelCostTier: nextCostTier,
                  apiKey: ''
               };
            });

            const statusMessage = response.modelsMessage || response.message || (response.connected !== false ? 'Connected to OpenAI successfully.' : 'Model list unavailable.');

            setModelStatus({
               connected: response.connected !== false,
               message: statusMessage,
               error: response.connected === false
            });
         } catch (error) {
            setAvailableModels([]);
            setModelStatus({
               connected: false,
               message: error?.message || 'Unable to load AI integration models.',
               error: true
            });
         } finally {
            setModelsLoading(false);
         }
      },
      [accountID, token, userID]
   );

   const applyIntegration = useCallback(integration => {
      setIntegrationRecord(integration);
      const hasKey = !!integration?.hasApiKey;
      setHasStoredKey(hasKey);

      setFormState(prev => ({
         ...prev,
         isEnabled: integration?.isEnabled ?? false,
         model: hasKey ? integration?.model || '' : '',
         modelCostTier: hasKey ? integration?.modelCostTier || '' : '',
         apiKey: ''
      }));

      if (!hasKey) {
         setAvailableModels([]);
         setModelStatus({
            connected: false,
            message: 'Add an API key to load models.',
            error: false
         });
      }
   }, []);

   const loadIntegration = useCallback(async () => {
      try {
         const response = await fetchAiIntegrationSettings(accountID, userID, token);
         if (response.status !== 200) {
            throw new Error(response.message || 'Unable to load AI integration settings.');
         }

         applyIntegration(response.integration);
         if (response.integration?.hasApiKey) {
            await loadModels(response.integration);
         }
      } catch (error) {
         setIntegrationRecord(null);
         setHasStoredKey(false);
         setAvailableModels([]);
         setModelStatus({
            connected: false,
            message: error?.message || 'Unable to load AI integration settings.',
            error: true
         });
         setNotification({
            severity: 'error',
            message: error?.message || 'Unable to load AI integration settings.'
         });
      } finally {
         setLoading(false);
      }
   }, [accountID, applyIntegration, loadModels, token, userID]);

   useEffect(() => {
      setLoading(true);
      resetNotification();
      loadIntegration();
   }, [loadIntegration]);

   const handleToggle = async (_, nextValue) => {
      resetNotification();

      setFormState(prev => ({ ...prev, isEnabled: nextValue }));

      if (!integrationRecord) {
         return;
      }

      const payload = {
         isEnabled: nextValue,
         model: formState.model.trim(),
         modelCostTier: (formState.modelCostTier || '').trim() || null
      };

      const { integration } = await persistIntegration(payload, setSaving, { skipModelValidation: true });

      if (!integration) {
         setFormState(prev => ({ ...prev, isEnabled: !nextValue }));
         return;
      }

      if (nextValue && !payload.model) {
         setNotification({ severity: 'info', message: 'Select a model and click Create Integration to finish enabling.' });
      }
   };

   const handleApiKeyChange = event => {
      const { value } = event.target;
      setFormState(prev => ({ ...prev, apiKey: value }));
      resetNotification();
   };

   const handleModelChange = event => {
      const { value } = event.target;
      const derivedCostTier = determineCostTier(value, availableModels);
      setFormState(prev => ({
         ...prev,
         model: value,
         modelCostTier: derivedCostTier || prev.modelCostTier
      }));
      resetNotification();
   };

   const composePayload = () => {
      const trimmedModel = formState.model.trim();
      const derivedCostTier = determineCostTier(trimmedModel, availableModels);
      const fallbackCostTier = (formState.modelCostTier || '').trim() || null;

      const payload = {
         isEnabled: formState.isEnabled,
         model: trimmedModel || '',
         modelCostTier: derivedCostTier || fallbackCostTier
      };

      const trimmedKey = formState.apiKey.trim();
      if (trimmedKey) {
         payload.apiKey = trimmedKey;
      }

      return payload;
   };

   const persistIntegration = async (overridePayload, busySetter = setSaving, options = {}) => {
      resetNotification();
      const payload = overridePayload || composePayload();

      if (options.skipModelValidation !== true && payload.isEnabled && !payload.model.trim()) {
         setNotification({
            severity: 'error',
            message: 'Select a model before enabling the AI integration.'
         });
         return false;
      }

      busySetter(true);
      try {
         const apiCall = integrationRecord ? updateAiIntegration : createAiIntegration;
         const response = await apiCall(payload, accountID, userID, token);

         if (![200, 201].includes(response.status)) {
            throw new Error(response.message || 'Unable to save AI integration settings.');
         }

         applyIntegration(response.integration);

         const modelsProvided = Array.isArray(response.models);
         if (modelsProvided) {
            setAvailableModels(response.models);
            setModelStatus({
               connected: !!response.connected,
               message: response.modelsMessage || (response.connected ? 'Connected to OpenAI successfully.' : 'Using default model list.'),
               error: !response.connected
            });
         } else if (response.integration?.hasApiKey) {
            await loadModels(response.integration);
         }

         setNotification({ severity: 'success', message: response.message || 'AI integration saved.' });
         return { integration: response.integration, modelsProvided };
      } catch (error) {
         setNotification({
            severity: 'error',
            message: error?.response?.data?.message || error?.message || 'Unable to save AI integration settings.'
         });
         return { integration: null, modelsProvided: false };
      } finally {
         busySetter(false);
      }
   };

   const handleSave = async () => {
      const { integration, modelsProvided } = await persistIntegration(undefined, setSaving, { skipModelValidation: false });
      if (integration?.hasApiKey && !modelsProvided) {
         await loadModels(integration);
      }
   };

   const handleConnect = async () => {
      const trimmedKey = formState.apiKey.trim();
      if (!trimmedKey && !hasStoredKey) {
         setNotification({
            severity: 'error',
            message: 'Enter an API key before connecting.'
         });
         return;
      }

      const payload = {
         isEnabled: formState.isEnabled,
         model: formState.model.trim(),
         modelCostTier: (formState.modelCostTier || '').trim() || null
      };

      if (trimmedKey) {
         payload.apiKey = trimmedKey;
      }

      const { integration, modelsProvided } = await persistIntegration(payload, setConnecting, { skipModelValidation: true });
      if (integration?.hasApiKey && !modelsProvided) {
         await loadModels(integration);
      }
   };

   const handleDelete = async () => {
      if (!integrationRecord) return;
      resetNotification();

      const confirmRemoval = window.confirm('Remove AI integration for this account?');
      if (!confirmRemoval) return;

      setRemoving(true);
      try {
         const response = await deleteAiIntegration(accountID, userID, token);
         if (response.status !== 200) {
            throw new Error(response.message || 'Unable to remove AI integration.');
         }

         setIntegrationRecord(null);
         setHasStoredKey(false);
         setAvailableModels([]);
         setModelStatus({
            connected: false,
            message: 'AI integration disconnected. Add an API key to reconnect.',
            error: false
         });
         setFormState({
            isEnabled: false,
            apiKey: '',
            model: '',
            modelCostTier: ''
         });

         setNotification({ severity: 'success', message: response.message || 'AI integration removed.' });

         // Ensure any cached record is cleared by reloading from the server
         await loadIntegration();
      } catch (error) {
         setNotification({
            severity: 'error',
            message: error?.response?.data?.message || error?.message || 'Unable to remove AI integration.'
         });
      } finally {
         setRemoving(false);
      }
   };


   const modelMenuItems = useMemo(
      () =>
         availableModels.map(option => (
            <MenuItem key={option.value} value={option.value}>
               {`${option.label} (${option.costTier})`}
            </MenuItem>
         )),
      [availableModels]
   );

   const connectionChipColor = modelStatus.connected ? 'success' : modelStatus.error ? 'error' : 'default';
   const connectionChipLabel = modelStatus.connected
      ? 'OpenAI Connected'
      : modelStatus.error
         ? 'Connection Error'
         : 'Not Connected';
   const modelHelperText = !formState.isEnabled
      ? 'Enable the integration to configure models.'
      : !hasStoredKey
         ? 'Connect an API key to load models.'
         : modelsLoading
            ? 'Loading models from OpenAI…'
            : modelStatus.message;
   const fieldsDisabled = !formState.isEnabled;
   const isModelDisabled = fieldsDisabled || !hasStoredKey;

   if (loading) {
      return (
         <Stack alignItems='center' justifyContent='center' sx={{ minHeight: 200 }}>
            <CircularProgress />
         </Stack>
      );
   }

   return (
      <Paper sx={{ p: 3 }}>
         <Stack spacing={3}>
            <Typography variant='h5'>AI Integration</Typography>
            <Typography variant='body2' color='text.secondary'>
               Configure your AI provider credentials and default model. The API key is encrypted at rest and only
               decrypted when used through the AI orchestrator.
            </Typography>

            {notification && (
               <Alert severity={notification.severity || 'info'} onClose={resetNotification}>
                  {notification.message}
               </Alert>
            )}

            <FormControlLabel
               control={<Switch checked={formState.isEnabled} onChange={handleToggle} color='primary' />}
               label='Enable AI integration for this account'
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems='center'>
               <Chip
                  label={connectionChipLabel}
                  color={connectionChipColor}
                  variant={modelStatus.connected ? 'filled' : 'outlined'}
                  size='small'
               />
               {modelsLoading && <CircularProgress size={18} thickness={5} />}
               <Typography variant='body2' color={modelStatus.error ? 'error.main' : 'text.secondary'}>
                  {modelHelperText}
               </Typography>
            </Stack>

            <Stack spacing={2}>
               <TextField
                  label='AI API Key'
                  type='password'
                  value={formState.apiKey}
                  onChange={handleApiKeyChange}
                  disabled={fieldsDisabled}
                  placeholder={hasStoredKey ? 'Key stored. Enter a new key to replace.' : 'Enter provider API key'}
                  helperText={
                     hasStoredKey
                        ? 'A key is already stored securely. Enter a new key to replace it or use the options below to manage it.'
                        : 'Provide your AI provider API key. It will be encrypted before storage.'
                  }
                  fullWidth
               />

               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems='center'>
                 <Button
                     variant='contained'
                     onClick={handleConnect}
                     disabled={fieldsDisabled || connecting || (!formState.apiKey.trim() && !hasStoredKey)}
                  >
                     {connecting ? 'Connecting…' : 'Connect'}
                  </Button>
                  <Typography variant='body2' color='text.secondary'>
                     Save the API key and verify access before choosing a model.
                  </Typography>
               </Stack>

               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                 <TextField
                     select
                     SelectProps={{
                        displayEmpty: true,
                        renderValue: selected => (selected ? selected : '')
                     }}
                     label={hasStoredKey ? 'Model' : undefined}
                     value={formState.model}
                     onChange={handleModelChange}
                     disabled={isModelDisabled}
                     helperText={
                        isModelDisabled
                           ? modelHelperText
                           : 'Select the OpenAI model to use for this account.'
                     }
                     InputProps={{
                        endAdornment: modelsLoading ? (
                           <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} />
                        ) : null
                     }}
                     fullWidth
                  >
                     {modelMenuItems}
                  </TextField>
               </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
               <Button
                  variant='contained'
                  onClick={handleSave}
                  disabled={fieldsDisabled || saving}
               >
                  {saving ? 'Saving…' : integrationRecord ? 'Update Settings' : 'Create Integration'}
               </Button>
               <Button
                  variant='outlined'
                  color='error'
                  onClick={handleDelete}
                  disabled={!integrationRecord || removing}
               >
                  {removing ? 'Removing…' : 'Remove Integration'}
               </Button>
            </Stack>

         </Stack>
      </Paper>
   );
};

export default AiIntegrationSettings;
