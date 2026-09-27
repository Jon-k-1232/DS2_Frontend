import useJobSearch from '../../Lookups/useJobSearch';
import React from 'react';
import { TextField, Autocomplete } from '@mui/material';
import SplitOptionLabel from '../../SplitOptionLabel';
import useJobChoices from '../../Lookups/useJobChoices';

const cycleLabel = job => job.total_transaction == null ? '' : ` Current Cycle:$${Number(job.total_transaction).toFixed(2)}`;

export default function JobDropWithCurrentCycleJobAmount({ customerData, selectedItems, setSelectedItems, dropDownPlaceholderText, helperText }) {
   const { selectedCustomer, selectedJob, entityId } = { ...customerData, ...selectedItems };
   const [search, setSearch, scope] = useJobSearch(selectedCustomer?.customer_id, entityId);
   const choices = useJobChoices(selectedCustomer?.customer_id, entityId, search, 0, selectedJob?.customer_job_id, true);
   return (
      <Autocomplete key={scope}
         size='small'
         sx={{ width: '100%', maxWidth: 350 }}
         value={selectedJob || null}
         onChange={(_, value) => setSelectedItems(previous => ({ ...previous, selectedJob: value, selectedInvoice: null }))}
         onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setSearch(value); }}
         filterOptions={rows => rows}
         loading={choices.loading}
         getOptionLabel={job => `${job.job_description}${cycleLabel(job)}`}
         isOptionEqualToValue={(option, value) => Number(option.customer_job_id) === Number(value.customer_job_id)}
         renderOption={(props, job) => (
            <li {...props} key={job.customer_job_id}>
               <SplitOptionLabel alignLeft={`${job.job_description} (#${job.customer_job_id})`} alignRight={cycleLabel(job).trim()} />
            </li>
         )}
         options={choices.rows}
         noOptionsText={selectedCustomer ? 'No matching jobs. Try a different search.' : 'Select a customer first'}
         renderInput={params => <TextField {...params} label={dropDownPlaceholderText} variant='standard' error={Boolean(choices.error)} helperText={choices.error || helperText} />}
      />
   );
}
