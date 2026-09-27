import React, { useEffect, useId, useState } from 'react';
import { DialogContent, DialogTitle, Dialog, Box, Button } from '@mui/material';

export default function GeneralDialog({ children, dialogSize = 'md', fullWidth, dialogTitle = '', openDialogWindow, onClose }) {
   const titleId=useId();
   const [openDialog, setOpenDialog] = useState(false);

   const handleOpenAndClose = () => {
      setOpenDialog(!openDialog);
      if (onClose) onClose();
   };

   useEffect(() => {
      setOpenDialog(openDialogWindow);
   }, [openDialogWindow]);

   return (
      <Dialog aria-labelledby={titleId} maxWidth={dialogSize} fullWidth={fullWidth || true} open={openDialog} onClose={handleOpenAndClose}>
         <DialogTitle id={titleId}>{dialogTitle}</DialogTitle>
         <DialogContent>{children}</DialogContent>
         <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
            <Button onClick={handleOpenAndClose}>Cancel</Button>
         </Box>
      </Dialog>
   );
}
