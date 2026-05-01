import { render, screen } from '@testing-library/react';
import HoldReasonBadge from './HoldReasonBadge';

describe('HoldReasonBadge', () => {
   it('renders the friendly label for a known hold reason', () => {
      render(<HoldReasonBadge reason='no_matching_customer' />);
      expect(screen.getByText('No customer match')).toBeInTheDocument();
   });

   it('falls back to the raw reason for an unknown value', () => {
      render(<HoldReasonBadge reason='something_invented' />);
      expect(screen.getByText('something_invented')).toBeInTheDocument();
   });

   it('handles missing reason gracefully', () => {
      render(<HoldReasonBadge />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
   });

   it('renders distinct labels for the seven primary hold reasons', () => {
      const cases = [
         ['employee_not_matched', 'Employee unmatched'],
         ['low_ai_confidence', 'Low confidence'],
         ['ambiguous_category', 'Ambiguous category'],
         ['missing_required_field', 'Missing field'],
         ['new_customer_needs_addition', 'New customer'],
         ['bedrock_error', 'AI error'],
         ['ai_cost_cap_reached', 'Cost cap']
      ];
      for (const [reason, expected] of cases) {
         const { unmount } = render(<HoldReasonBadge reason={reason} />);
         expect(screen.getByText(expected)).toBeInTheDocument();
         unmount();
      }
   });
});
