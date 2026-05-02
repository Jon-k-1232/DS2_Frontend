import { cloneElement, Children } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from '@mui/material';

export default function AutoCompleteWithDialog({ dialogTitle, children, dialogOpen, setDialogOpen, autoCompleteProps, onAdded }) {
   const { autoCompleteLabel, autoCompleteOptionsList, onChangeKey, optionLabelProperty, valueTestProperty, addedOptionLabel, selectedOption, handleAutocompleteChange } = autoCompleteProps;

   const listWithAddOptions = () => {
      const addOption = {
         [optionLabelProperty]: addedOptionLabel,
         [valueTestProperty]: 0
      };
      return autoCompleteOptionsList && [...autoCompleteOptionsList, addOption];
   };

   const handleDialogClose = () => {
      setDialogOpen(false);
   };

   const handleDialogOpen = () => {
      setDialogOpen(true);
   };

   // Inject onSuccess into the inner form so that a successful submit closes the
   // dialog and bubbles the new item up via onAdded. Without this, users had to
   // click Cancel after submit and the parent had no idea what just got created.
   const childWithSuccess = (newItem => {
      handleDialogClose();
      if (typeof onAdded === 'function') onAdded(newItem);
   });
   const enhancedChildren = Children.map(children, child =>
      child ? cloneElement(child, { onSuccess: childWithSuccess }) : child
   );

   return (
      <>
         <Autocomplete
            size='small'
            sx={{ width: 350 }}
            value={selectedOption}
            onChange={(event, value) => handleAutocompleteChange(onChangeKey, value)}
            getOptionLabel={option => (option ? option[optionLabelProperty] : '') || ''}
            isOptionEqualToValue={(option, value) => (option && value ? option[valueTestProperty] === value[valueTestProperty] : false) || true}
            options={listWithAddOptions() || []}
            renderOption={(props, option) => {
               if (option[optionLabelProperty] === addedOptionLabel) {
                  return (
                     <li style={{ fontWeight: '500' }} {...props} onClick={handleDialogOpen}>
                        {option[optionLabelProperty]}
                     </li>
                  );
               }

               return <li {...props}>{option[optionLabelProperty]}</li>;
            }}
            renderInput={params => <TextField {...params} label={autoCompleteLabel} variant='standard' />}
         />

         <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth='md'>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>{enhancedChildren}</DialogContent>
            <DialogActions>
               <Button onClick={handleDialogClose}>Cancel</Button>
            </DialogActions>
         </Dialog>
      </>
   );
}
