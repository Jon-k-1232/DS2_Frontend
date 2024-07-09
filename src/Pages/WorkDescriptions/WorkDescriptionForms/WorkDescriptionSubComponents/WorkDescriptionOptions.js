import { Box, TextField, Checkbox, FormControlLabel } from '@mui/material';
export default function WorkDescriptionOptions({ selectedItems, setSelectedItems }) {
  const { estimatedTime, generalWorkDescription, isGeneralWorkDescriptionActive } = selectedItems;

  const updateSelectedItems = (key, value) => {
    setSelectedItems(prevItems => ({ ...prevItems, [key]: value }));
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <TextField
          sx={{ width: 350, marginTop: '10px' }}
          variant='standard'
          label='Generalized Work Description'
          value={generalWorkDescription}
          onChange={e => updateSelectedItems('generalWorkDescription', e.target.value)}
        />
        <TextField
          sx={{ width: 350, marginTop: '10px' }}
          variant='standard'
          type='number'
          label='Estimated Time For Task'
          value={estimatedTime}
          onChange={e => updateSelectedItems('estimatedTime', e.target.value)}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isGeneralWorkDescriptionActive}
              onChange={e => updateSelectedItems('isGeneralWorkDescriptionActive', e.target.checked)}
            />
          }
          label='Active'
        />
      </Box>
    </>
  );
}
