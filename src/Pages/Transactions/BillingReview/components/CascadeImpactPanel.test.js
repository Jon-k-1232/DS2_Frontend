import { render, screen } from '@testing-library/react';
import CascadeImpactPanel from './CascadeImpactPanel';

describe('CascadeImpactPanel', () => {
   it('renders nothing when no side effects', () => {
      const { container } = render(<CascadeImpactPanel sideEffects={[]} />);
      expect(container).toBeEmptyDOMElement();
   });

   it('shows "Transaction updated" for any side effect', () => {
      render(<CascadeImpactPanel sideEffects={[{ type: 'reviewer_corrections_written' }]} />);
      expect(screen.getByText('Transaction updated')).toBeInTheDocument();
      expect(screen.queryByText(/AI training example/)).not.toBeInTheDocument();
   });

   it('adds the AI-training line when training_example_written is present', () => {
      render(<CascadeImpactPanel sideEffects={[{ type: 'training_example_written' }]} />);
      expect(screen.getByText('Transaction updated')).toBeInTheDocument();
      expect(screen.getByText(/AI training example recorded for the learning loop/)).toBeInTheDocument();
   });

   it('hides job-recalc and invoice-recalc detail lines from the user', () => {
      render(<CascadeImpactPanel sideEffects={[
         { type: 'invoice_recalculated', invoiceId: 1, totalCharges: 100, delta: 50 },
         { type: 'old_job_recalculated', customerJobId: 5, total: 200 },
         { type: 'training_example_written' }
      ]} />);
      expect(screen.queryByText(/Invoice #1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Job 5/)).not.toBeInTheDocument();
      expect(screen.getByText(/AI training example recorded/)).toBeInTheDocument();
   });
});
