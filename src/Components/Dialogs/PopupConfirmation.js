import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function PopupConfirmation({ show, handleShow, confirmFinalInvoice }) {
  return (
    <div>
      <Dialog open={show} onClose={e => handleShow(false)} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
        <DialogTitle id='alert-dialog-title'>{'Create and Lock Final Monthly Invoices?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            This will create the final invoices for the month and insert data into the database. If you are sure all adjustments and charges are
            completed then proceed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={e => {
              handleShow(false);
              confirmFinalInvoice(false);
            }}>
            Cancel
          </Button>
          <Button
            onClick={e => {
              handleShow(false);
              confirmFinalInvoice(true);
            }}
            autoFocus>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
