import React from 'react';
import { Box, TextField } from '@mui/material';

export default function WriteOffOptions({ selectedItems, setSelectedItems }) {
  const { unitCost, writeoffReason } = selectedItems;

  return (
    <>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <TextField
          sx={{ width: 350 }}
          variant='standard'
          type='string'
          label='Reason For Write Off'
          value={writeoffReason}
          onChange={e => setSelectedItems(otherItems => ({ ...otherItems, writeoffReason: e.target.value }))}
        />

        <TextField
          sx={{ width: 350 }}
          variant='standard'
          type='number'
          label='Write Off Amount'
          value={unitCost}
          onChange={e => setSelectedItems(otherItems => ({ ...otherItems, unitCost: e.target.value }))}
        />
      </Box>
    </>
  );
}
