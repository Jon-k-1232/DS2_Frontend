import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function PageHelpButton({ help }) {
  const [open, setOpen] = useState(false);
  if (!help) return null;
  return <>
    <Tooltip title="About this page"><IconButton aria-label="About this page" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} size="small" color="primary"><InfoOutlinedIcon /></IconButton></Tooltip>
    <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="page-help-title" maxWidth="sm" fullWidth>
      <DialogTitle id="page-help-title">About {help.title}</DialogTitle>
      <DialogContent><Typography component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1.5 }, '& li:last-child': { mb: 0 } }}>
        {help.bullets.map(bullet => <li key={bullet.split(':')[0]}>{bullet}</li>)}
      </Typography></DialogContent>
      <DialogActions><Button autoFocus onClick={() => setOpen(false)} aria-label="Close page help">Close</Button></DialogActions>
    </Dialog>
  </>;
}
