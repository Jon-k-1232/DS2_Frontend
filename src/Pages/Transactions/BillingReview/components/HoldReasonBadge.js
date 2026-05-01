import { Chip } from '@mui/material';

const COLORS = {
   no_matching_customer: { bg: '#d32f2f', label: 'No customer match' },
   new_customer_needs_addition: { bg: '#ef6c00', label: 'New customer' },
   employee_not_matched: { bg: '#c2185b', label: 'Employee unmatched' },
   low_ai_confidence: { bg: '#fbc02d', label: 'Low confidence' },
   ambiguous_category: { bg: '#1976d2', label: 'Ambiguous category' },
   missing_required_field: { bg: '#6a1b9a', label: 'Missing field' },
   bedrock_error: { bg: '#7b1fa2', label: 'AI error' },
   ai_cost_cap_reached: { bg: '#455a64', label: 'Cost cap' },
   legacy_pre_ai: { bg: '#9e9e9e', label: 'Legacy hold' }
};

export default function HoldReasonBadge({ reason }) {
   const meta = COLORS[reason] || { bg: '#9e9e9e', label: reason || 'Unknown' };
   return (
      <Chip
         size='small'
         label={meta.label}
         sx={{ backgroundColor: meta.bg, color: 'white', fontWeight: 500 }}
      />
   );
}
