import { useState } from 'react';
import { Box, Autocomplete, TextField, FormControlLabel, Checkbox } from '@mui/material';

export default function NewJobSelections({ customerData, selectedItems, setSelectedItems, notes }) {
   const [filteredJobTypes, setFilteredJobTypes] = useState([]);
   const [selectedJobCategory, setSelectedJobCategory] = useState(null);

   const {
      jobCategoriesList: { activeJobCategoriesData: { activeJobCategories } = {} } = {},
      customersList: { activeCustomerData: { activeCustomers } = {} } = {},
      jobTypesList: { activeJobTypesData: { jobTypesData } = {} } = {}
   } = customerData ?? {};

   const { selectedCustomer, selectedJobDescription, isQuote, quoteAmount, agreedJobAmount, isJobComplete } = selectedItems;

   const findJobTypes = (e, jobCategory) => {
      const jobs = jobTypesData.filter(type => type.customer_job_category_id === jobCategory.customer_job_category_id);
      setFilteredJobTypes(jobs);
      setSelectedJobCategory(jobCategory);
   };

   return (
      <>
         <Box>
            <Autocomplete
               size='small'
               sx={{ width: 350 }}
               value={selectedCustomer}
               onChange={(event, newValue) => setSelectedItems(otherItems => ({ ...otherItems, selectedCustomer: newValue }))}
               getOptionLabel={option => option.display_name || ''}
               options={activeCustomers || []}
               renderInput={params => <TextField {...params} label='Select Customer' variant='standard' />}
            />
            <TextField
               sx={{ width: '350px' }}
               variant='standard'
               type='number'
               label='Job Quote Amount'
               value={quoteAmount}
               onChange={e => setSelectedItems(otherItems => ({ ...otherItems, quoteAmount: e.target.value }))}
            />

            <Autocomplete
               size='small'
               sx={{ width: 350 }}
               value={selectedJobCategory}
               onChange={findJobTypes}
               getOptionLabel={option => option.customer_job_category || ''}
               isOptionEqualToValue={(option, value) => option.customer_job_category_id === value.customer_job_category_id}
               options={activeJobCategories || []}
               renderInput={params => <TextField {...params} label='Filter Job Types By Category' variant='standard' />}
            />

            <TextField
               sx={{ width: 350 }}
               variant='standard'
               type='number'
               label='Agreed Job Amount'
               value={agreedJobAmount}
               onChange={e => setSelectedItems(otherItems => ({ ...otherItems, agreedJobAmount: e.target.value }))}
            />

            <Autocomplete
               size='small'
               sx={{ width: 350 }}
               value={selectedJobDescription}
               onChange={(event, newValue) => setSelectedItems(otherItems => ({ ...otherItems, selectedJobDescription: newValue }))}
               getOptionLabel={option => option.job_description || ''}
               isOptionEqualToValue={(option, value) => option.job_type_id === value.job_type_id}
               options={filteredJobTypes || []}
               renderInput={params => <TextField {...params} label='Type Of Job' variant='standard' />}
            />

            <TextField sx={{ width: '350px' }} variant='standard' label='Job Notes' value={notes} onChange={e => setSelectedItems(otherItems => ({ ...otherItems, notes: e.target.value }))} />

            <Box>
               <FormControlLabel control={<Checkbox checked={isQuote} onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isQuote: e.target.checked }))} />} label='Is this a quote?' />

               <FormControlLabel
                  control={<Checkbox checked={isJobComplete} onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isJobComplete: e.target.checked }))} />}
                  label='Is Job Complete?'
               />
            </Box>
         </Box>
      </>
   );
}
