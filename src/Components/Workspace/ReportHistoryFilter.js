import { Accordion, AccordionDetails, AccordionSummary, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function ReportHistoryFilter({ value, onChange }) {
  return <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Advanced: reproduce an earlier report</Typography></AccordionSummary>
    <AccordionDetails>
      <TextField size="small" fullWidth label="Include records saved through" value={value} onChange={e => onChange(e.target.value)}
        helperText="Leave blank to include everything known now. To reproduce a saved report, paste its exact saved-through time, including the time zone (for example, 2026-09-26T17:00:00Z)." />
    </AccordionDetails>
  </Accordion>;
}
