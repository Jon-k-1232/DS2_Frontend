import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from '@mui/material';

export default function AutoCompleteWithDialog({ dialogTitle, children, dialogOpen, setDialogOpen, autoCompleteProps }) {
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
            <DialogContent>{children}</DialogContent>
            <DialogActions>
               <Button onClick={handleDialogClose}>Cancel</Button>
            </DialogActions>
         </Dialog>
      </>
   );
}
