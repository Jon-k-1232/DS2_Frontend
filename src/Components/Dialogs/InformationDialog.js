import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper } from '@mui/material';
import Draggable from 'react-draggable';
import { Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

function PaperComponent(props) {
  return (
    <Draggable handle='#draggable-dialog-title' cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

export default function InformationDialog({ toolTipText, dialogTitle, dialogText, buttonLocation }) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title={toolTipText}>
        <InfoIcon onClick={handleClickOpen} color='primary' fontSize='small' style={buttonLocation} />
      </Tooltip>

      <Dialog open={open} onClose={handleClose} PaperComponent={PaperComponent} aria-labelledby='draggable-dialog-title'>
        {dialogTitle && (
          <DialogTitle style={{ cursor: 'move' }} id='draggable-dialog-title'>
            {dialogTitle}
          </DialogTitle>
        )}
        <DialogContent>
          <ul>
            {dialogText.map((bullet, i) => (
              <li key={i} style={{ paddingBottom: '10px' }}>
                <DialogContentText>{bullet}</DialogContentText>
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
