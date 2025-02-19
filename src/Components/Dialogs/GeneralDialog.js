import React, { useEffect, useState } from 'react';
import { DialogContent, DialogTitle, Dialog, Box, Button } from '@mui/material';

export default function GeneralDialog({ children, dialogSize = 'md', fullWidth, dialogTitle = '', openDialogWindow, onClose }) {
   const [openDialog, setOpenDialog] = useState(false);

   const handleOpenAndClose = () => {
      setOpenDialog(!openDialog);
      if (onClose) onClose();
   };

   useEffect(() => {
      setOpenDialog(openDialogWindow);
   }, [openDialogWindow]);

   return (
      <Dialog maxWidth={dialogSize} fullWidth={fullWidth || true} open={openDialog} onClose={handleOpenAndClose}>
         <DialogTitle>{dialogTitle}</DialogTitle>
         <DialogContent>{children}</DialogContent>
         <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
            <Button onClick={handleOpenAndClose}>Cancel</Button>
         </Box>
      </Dialog>
   );
}
