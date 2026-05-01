import { render, screen } from '@testing-library/react';
import AiSuggestionChip from './AiSuggestionChip';

describe('AiSuggestionChip', () => {
   it('shows the AI category and confidence', () => {
      render(<AiSuggestionChip entry={{ ai_suggested_category: 'Tax Compliance', ai_confidence: 0.78, ai_reason: 'matches 1040 mention' }} />);
      expect(screen.getByText(/Tax Compliance/)).toBeInTheDocument();
      expect(screen.getByText(/0\.78/)).toBeInTheDocument();
   });

   it('returns null when no entry is provided', () => {
      const { container } = render(<AiSuggestionChip entry={null} />);
      expect(container).toBeEmptyDOMElement();
   });

   it('falls back to suggested customer name when no category', () => {
      render(<AiSuggestionChip entry={{ suggested_customer_display_name: 'Acme Corp', ai_confidence: 0.91 }} />);
      expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
   });

   it('omits the confidence segment when ai_confidence is null', () => {
      render(<AiSuggestionChip entry={{ ai_suggested_category: 'Bookkeeping' }} />);
      expect(screen.getByText(/Bookkeeping/)).toBeInTheDocument();
      expect(screen.queryByText(/·/)).not.toBeInTheDocument();
   });
});
