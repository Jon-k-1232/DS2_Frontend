import { Alert, AlertTitle, List, ListItem, ListItemText } from '@mui/material';

const _label = effect => {
   switch (effect.type) {
      case 'invoice_recalculated':
         return `Invoice #${effect.invoiceId} recalculated → total now $${Number(effect.totalCharges || 0).toFixed(2)} (delta $${Number(effect.delta || 0).toFixed(2)})`;
      case 'old_invoice_recalculated_after_customer_change':
         return `Old invoice #${effect.invoiceId} recalculated after customer change`;
      case 'old_job_recalculated':
         return `Job ${effect.customerJobId} total recomputed to $${Number(effect.total || 0).toFixed(2)}`;
      case 'new_job_recalculated':
         return `New job ${effect.customerJobId} total recomputed to $${Number(effect.total || 0).toFixed(2)}`;
      case 'training_example_written':
         return 'AI training example recorded for the learning loop';
      default:
         return effect.type;
   }
};

export default function CascadeImpactPanel({ sideEffects = [] }) {
   if (!sideEffects.length) return null;
   return (
      <Alert severity='info' sx={{ mt: 2 }}>
         <AlertTitle>Downstream effects</AlertTitle>
         <List dense>
            {sideEffects.map((s, i) => (
               <ListItem key={i} disableGutters>
                  <ListItemText primary={_label(s)} />
               </ListItem>
            ))}
         </List>
      </Alert>
   );
}
