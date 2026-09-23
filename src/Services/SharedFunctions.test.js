import { getOpenInvoicesForPayment } from './SharedFunctions';

// E5 — getOpenInvoicesForPayment must never offer an absorbed same-day
// parent's obsolete balance as a payment target. zeroOutAbsorbedInvoices
// (backend) marks an absorbed parent's notes with "[absorbed_by:...]" once a
// newer chain has rolled its balance forward — the fix excludes any parent
// carrying that marker and uses each remaining parent's OWN
// remaining_balance_on_invoice directly (no more substituting a parent for
// its latest child snapshot, which is what resurrected the absorbed child's
// still-positive historical balance in the first place).
describe('getOpenInvoicesForPayment', () => {
   it('excludes an absorbed same-day parent — its positive historical child balance never resurfaces — and keeps the current parent', () => {
      const rows = [
         {
            customer_invoice_id: 1,
            parent_invoice_id: null,
            invoice_date: '2026-09-22',
            created_at: '2026-09-22T08:00:00Z',
            remaining_balance_on_invoice: 0,
            notes: '[absorbed_by:INV-2026-2@2026-09-22]'
         },
         // A historical child snapshot of the absorbed parent — still shows a
         // positive balance, but it was never itself a candidate (it has a
         // parent_invoice_id) and must not leak into the result via any
         // parent-substitution logic.
         { customer_invoice_id: 2, parent_invoice_id: 1, invoice_date: '2026-09-22', created_at: '2026-09-22T09:00:00Z', remaining_balance_on_invoice: 80 },
         { customer_invoice_id: 3, parent_invoice_id: null, invoice_date: '2026-09-22', created_at: '2026-09-22T10:00:00Z', remaining_balance_on_invoice: 100, notes: '' }
      ];

      const choices = getOpenInvoicesForPayment(rows);

      expect(choices.map(row => row.customer_invoice_id)).toEqual([3]);
      expect(choices[0].remaining_balance_on_invoice).toBe(100);
   });

   it('excludes an absorbed parent even when its own remaining_balance_on_invoice is a stale nonzero value', () => {
      // Known data anomaly (see reference_known_data_anomalies): some absorbed
      // parents carry a stale nonzero remaining rather than 0 — the marker,
      // not the balance, is what must drive exclusion.
      const rows = [
         { customer_invoice_id: 1, parent_invoice_id: null, invoice_date: '2026-09-22', remaining_balance_on_invoice: 45, notes: '[absorbed_by:INV-2026-2@2026-09-22]' },
         { customer_invoice_id: 2, parent_invoice_id: null, invoice_date: '2026-09-22', remaining_balance_on_invoice: 100, notes: '' }
      ];

      const choices = getOpenInvoicesForPayment(rows);

      expect(choices.map(row => row.customer_invoice_id)).toEqual([2]);
   });

   it('keeps two genuinely independent, unmarked same-date roots — both offered, largest balance first', () => {
      const rows = [
         { customer_invoice_id: 10, parent_invoice_id: null, invoice_date: '2026-09-22', remaining_balance_on_invoice: 50, notes: '' },
         { customer_invoice_id: 11, parent_invoice_id: null, invoice_date: '2026-09-22', remaining_balance_on_invoice: 75, notes: null }
      ];

      const choices = getOpenInvoicesForPayment(rows);

      expect(choices.map(row => row.customer_invoice_id)).toEqual([11, 10]);
   });

   it('returns [] for no rows and for rows with no parent invoices', () => {
      expect(getOpenInvoicesForPayment([])).toEqual([]);
      expect(getOpenInvoicesForPayment(null)).toEqual([]);
      expect(getOpenInvoicesForPayment([{ customer_invoice_id: 5, parent_invoice_id: 1, remaining_balance_on_invoice: 20 }])).toEqual([]);
   });

   // A live (unmarked, no "[absorbed_by:") parent must keep its OWN
   // remaining_balance_on_invoice even when a later-dated historical child
   // snapshot of that same parent carries a different balance. The E5 fix's
   // absorbed-chain tests could still pass a partial fix that only excludes
   // absorbed parents but still substitutes a live parent's balance with its
   // latest child snapshot — this pins that the parent's own id/balance win.
   it('a live parent keeps its own remaining balance even though a newer historical child snapshot has a different one', () => {
      const rows = [
         { customer_invoice_id: 1, parent_invoice_id: null, invoice_date: '2026-09-20', created_at: '2026-09-20T08:00:00Z', remaining_balance_on_invoice: 100, notes: '' },
         // A later-dated child of that SAME live parent — never a candidate
         // itself (has a parent_invoice_id) and must not get substituted in
         // for the parent's own authoritative balance.
         { customer_invoice_id: 2, parent_invoice_id: 1, invoice_date: '2026-09-21', created_at: '2026-09-21T09:00:00Z', remaining_balance_on_invoice: 80, notes: '' }
      ];

      const choices = getOpenInvoicesForPayment(rows);

      expect(choices.map(row => row.customer_invoice_id)).toEqual([1]);
      expect(choices[0].remaining_balance_on_invoice).toBe(100);
   });
});
