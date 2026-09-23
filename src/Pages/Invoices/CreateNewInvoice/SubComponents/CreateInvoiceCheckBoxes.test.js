import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateInvoiceCheckBoxes from './CreateInvoiceCheckBoxes';

const baseSettings = { isFinalized: false, isRoughDraft: false, isCsvOnly: true, allowSameDayRebill: false };

describe('CreateInvoiceCheckBoxes — Allow same-day re-bill', () => {
   it('is disabled when no selected row was already billed today', () => {
      render(<CreateInvoiceCheckBoxes invoiceCreationSettings={baseSettings} setInvoiceCreationSettings={() => {}} hasBilledTodaySelected={false} />);
      expect(screen.getByRole('checkbox', { name: /allow same-day re-bill/i })).toBeDisabled();
   });

   it('is enabled once a selected row was already billed today', () => {
      render(<CreateInvoiceCheckBoxes invoiceCreationSettings={baseSettings} setInvoiceCreationSettings={() => {}} hasBilledTodaySelected />);
      expect(screen.getByRole('checkbox', { name: /allow same-day re-bill/i })).toBeEnabled();
   });

   it('reports allowSameDayRebill=true on check', async () => {
      const setInvoiceCreationSettings = jest.fn();
      render(
         <CreateInvoiceCheckBoxes invoiceCreationSettings={baseSettings} setInvoiceCreationSettings={setInvoiceCreationSettings} hasBilledTodaySelected />
      );
      await userEvent.click(screen.getByRole('checkbox', { name: /allow same-day re-bill/i }));
      expect(setInvoiceCreationSettings).toHaveBeenCalledWith('allowSameDayRebill', true);
   });

   it('reflects a checked state from invoiceCreationSettings', () => {
      render(
         <CreateInvoiceCheckBoxes
            invoiceCreationSettings={{ ...baseSettings, allowSameDayRebill: true }}
            setInvoiceCreationSettings={() => {}}
            hasBilledTodaySelected
         />
      );
      expect(screen.getByRole('checkbox', { name: /allow same-day re-bill/i })).toBeChecked();
   });
});
