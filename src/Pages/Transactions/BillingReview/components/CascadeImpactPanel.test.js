import { render, screen } from '@testing-library/react';
import CascadeImpactPanel from './CascadeImpactPanel';

describe('CascadeImpactPanel', () => {
   it('renders nothing when no side effects', () => {
      const { container } = render(<CascadeImpactPanel sideEffects={[]} />);
      expect(container).toBeEmptyDOMElement();
   });

   it('renders an invoice recalc effect with delta', () => {
      render(<CascadeImpactPanel sideEffects={[{ type: 'invoice_recalculated', invoiceId: 88, totalCharges: 1200, delta: 150 }]} />);
      expect(screen.getByText(/Invoice #88 recalculated/)).toBeInTheDocument();
      expect(screen.getByText(/\$1200\.00/)).toBeInTheDocument();
      expect(screen.getByText(/delta \$150\.00/)).toBeInTheDocument();
   });

   it('renders a training-example effect', () => {
      render(<CascadeImpactPanel sideEffects={[{ type: 'training_example_written' }]} />);
      expect(screen.getByText(/AI training example recorded/)).toBeInTheDocument();
   });

   it('renders the raw type for an unknown effect', () => {
      render(<CascadeImpactPanel sideEffects={[{ type: 'mystery_effect' }]} />);
      expect(screen.getByText('mystery_effect')).toBeInTheDocument();
   });

   it('renders multiple side effects in order', () => {
      render(<CascadeImpactPanel sideEffects={[
         { type: 'invoice_recalculated', invoiceId: 1, totalCharges: 100, delta: 50 },
         { type: 'old_job_recalculated', customerJobId: 5, total: 200 },
         { type: 'training_example_written' }
      ]} />);
      expect(screen.getByText(/Invoice #1 recalculated/)).toBeInTheDocument();
      expect(screen.getByText(/Job 5/)).toBeInTheDocument();
      expect(screen.getByText(/AI training example recorded/)).toBeInTheDocument();
   });
});
