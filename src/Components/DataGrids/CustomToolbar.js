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
                  <GridToolbarQuickFilter
                     sx={{ paddingRight: '10px' }}
                     quickFilterParser={searchInput =>
                        searchInput
                           .split(',')
                           .map(value => value.trim())
                           .filter(value => value !== '')
                     }
                     debounceMs={100}
                  />
               )}
            </>
         )}
      </GridToolbarContainer>
   );
};

export default CustomToolbar;
