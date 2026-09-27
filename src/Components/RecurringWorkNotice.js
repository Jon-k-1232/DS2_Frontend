import { Alert, Button } from '@mui/material';
import { Link } from 'react-router-dom';
export default function RecurringWorkNotice({ planId }) {
  return <Alert severity='info'>This charge belongs to a recurring period. Edit it or skip the period with a reason before finalizing.
    <Button component={Link} to={`/billing/recurring/${planId}`}>Open recurring plan</Button>
  </Alert>;
}
