import React, { useState } from 'react';
import { GridToolbarContainer, GridToolbarExport, GridToolbarFilterButton, GridToolbarColumnsButton, GridToolbarQuickFilter } from '@mui/x-data-grid';
import { DialogContent, DialogTitle, Dialog, IconButton, Box, Tooltip, Button } from '@mui/material';

// Adds Custom tool bar to Grid. Allows for a plus Icon to be added to the top of the grid. along with the tools, and generalize search.
const CustomToolbar = ({
   arrayOfButtons,
   title,
   dialogSize,
   hideGridTools,
   showGridTools,
   showQuickFilter = true,
   renderToolbarContent,
   renderExport
}) => {
   const [openDialog, setOpenDialog] = useState(null);

   const handleClickOpen = index => () => setOpenDialog(index);
   const handleClose = () => setOpenDialog(null);
   const shouldShowGridTools = showGridTools !== undefined ? showGridTools : !hideGridTools;
   return (
      <GridToolbarContainer>
         {title && <Box sx={{ padding: '10px', fontSize: '18px', fontWeight: 'bold' }}>{title}</Box>}
         {arrayOfButtons &&
            arrayOfButtons.map((button, index) => (
               <div key={index}>
                  <Tooltip title={button.tooltipText || 'Add'}>
                     <IconButton onClick={handleClickOpen(index)}>{button.icon()}</IconButton>
                  </Tooltip>
                  <Dialog maxWidth={dialogSize ? dialogSize : 'md'} fullWidth style={{ display: 'flex', justifyContent: 'center' }} open={openDialog === index} onClose={handleClose}>
                     <DialogTitle>{button.dialogTitle}</DialogTitle>
                     <DialogContent>{button.component()}</DialogContent>
                     <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                        <Button onClick={handleClose}>Cancel</Button>
                     </Box>
                  </Dialog>
               </div>
            ))}
         {shouldShowGridTools && (
            <>
               <GridToolbarColumnsButton />
               <GridToolbarFilterButton />
               {renderExport ? renderExport() : <GridToolbarExport />}
               <div style={{ flexGrow: 1 }} />
               {renderToolbarContent && <Box sx={{ paddingRight: '10px' }}>{renderToolbarContent()}</Box>}
               {showQuickFilter && (
                  // IMPORTANT: parser + formatter must be lossless inverses, or
                  // MUI re-derives the input value from quickFilterValues and
                  // strips whatever the parser dropped — most visibly trailing
                  // spaces. The old "split(',').map(trim).filter(non-empty)"
                  // parser caused "guenther [space] j" to flicker to "guentherj"
                  // after the debounce because the trailing space was trimmed
                  // out and then the formatter rebuilt the input without it.
                  //
                  // Treat the entire input as a single filter term — preserves
                  // every character the user types. Trade-off: comma-separated
                  // OR-filtering (rarely used) no longer works.
                  <GridToolbarQuickFilter
                     sx={{ paddingRight: '10px' }}
                     quickFilterParser={input => (input && input.length > 0 ? [input] : [])}
                     quickFilterFormatter={values => (values && values.length ? values[0] : '')}
                     debounceMs={100}
                  />
               )}
            </>
         )}
      </GridToolbarContainer>
   );
};

export default CustomToolbar;
