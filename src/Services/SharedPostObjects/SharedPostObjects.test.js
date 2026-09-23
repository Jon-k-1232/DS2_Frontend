import dayjs from 'dayjs';
import {
   formObjectForTransactionPost,
   formObjectForPaymentPost,
   formObjectForWriteOffPost,
   formObjectForRetainerPost,
   formObjectForUpdateAccountPost,
   formObjectForAccountAddressUpdate
} from './SharedPostObjects';

const loggedInUser = { accountID: 1, userID: 21 };

// A calendar-date field sent as a full ISO/offset timestamp can cross the
// UTC-day boundary once the backend reads it back (an evening entry shifts to
// the next day). Every date payload below must be a bare 'YYYY-MM-DD' string —
// no 'T', no time-of-day, no timezone offset — so nothing downstream has a
// timezone left to convert.
const isPlainCalendarDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value);

describe('SharedPostObjects date fields', () => {
   // A late-evening local time is exactly the scenario the bug hit: naive UTC
   // serialization of this instant can land on the following calendar day.
   const lateEveningLocal = dayjs('2026-06-10T23:30:00');

   it('formObjectForTransactionPost sends transactionDate as a bare calendar date', () => {
      const result = formObjectForTransactionPost({ selectedDate: lateEveningLocal, quantity: 1, unitCost: 100 }, loggedInUser);
      expect(result.transactionDate).toBe('2026-06-10');
      expect(isPlainCalendarDate(result.transactionDate)).toBe(true);
   });

   it('formObjectForPaymentPost sends transactionDate as a bare calendar date', () => {
      const result = formObjectForPaymentPost({ selectedDate: lateEveningLocal }, loggedInUser);
      expect(result.transactionDate).toBe('2026-06-10');
      expect(isPlainCalendarDate(result.transactionDate)).toBe(true);
   });

   it('formObjectForWriteOffPost sends selectedDate as a bare calendar date (writeOffsObjects.js reads it directly as writeoff_date)', () => {
      const result = formObjectForWriteOffPost({ selectedDate: lateEveningLocal }, loggedInUser);
      expect(result.selectedDate).toBe('2026-06-10');
      expect(isPlainCalendarDate(result.selectedDate)).toBe(true);
   });

   it('formObjectForRetainerPost sends selectedDate as a bare calendar date via the shared base object', () => {
      const result = formObjectForRetainerPost({ selectedDate: lateEveningLocal }, loggedInUser);
      expect(result.selectedDate).toBe('2026-06-10');
   });

   it('formats a plain date string the same way as a dayjs object', () => {
      const result = formObjectForPaymentPost({ selectedDate: '2026-06-10T23:30:00' }, loggedInUser);
      expect(result.transactionDate).toBe('2026-06-10');
   });

   it('leaves a missing date alone instead of defaulting to "today"', () => {
      const result = formObjectForWriteOffPost({ selectedDate: null }, loggedInUser);
      expect(result.selectedDate).toBeNull();
   });
});

describe('account settings payload key mapping', () => {
   // account-router.js's PUT /account/updateAccount reads req.body.account
   // straight into restoreDataTypesAccountOnUpdate /
   // restoreDataTypesAccountInformationOnUpdate (accountObjects.js), which pull
   // snake_case DB column names — not the camelCase field names the settings
   // forms use locally.
   it('formObjectForUpdateAccountPost maps camelCase form fields to the snake_case keys the backend reads', () => {
      const result = formObjectForUpdateAccountPost({
         accountName: 'James F. Kimmel & Associates',
         accountType: 'Business',
         accountStatement: 'Thank you for your business.',
         accountInterestStatement: '1.5% monthly on unpaid balances.',
         template: 'Template One'
      });

      expect(result).toMatchObject({
         account_name: 'James F. Kimmel & Associates',
         account_type: 'Business',
         account_statement: 'Thank you for your business.',
         account_interest_statement: '1.5% monthly on unpaid balances.',
         account_invoice_template_option: 'Template One'
      });
   });

   it('formObjectForAccountAddressUpdate maps camelCase address fields to the snake_case keys the backend reads, including account_info_id', () => {
      const result = formObjectForAccountAddressUpdate({
         accountInfoID: 7,
         accountID: 1,
         customerStreet: '123 Main St',
         customerCity: 'Anytown',
         customerState: 'CA',
         customerZip: '90210',
         customerEmail: 'billing@example.com',
         customerPhone: '555-1234',
         isThisAddressActive: true,
         isCustomerPhysicalAddress: true,
         isCustomerBillingAddress: false,
         isCustomerMailingAddress: true
      });

      expect(result).toMatchObject({
         account_info_id: 7,
         account_id: 1,
         account_street: '123 Main St',
         account_city: 'Anytown',
         account_state: 'CA',
         account_zip: '90210',
         account_email: 'billing@example.com',
         account_phone: '555-1234',
         is_this_address_active: true,
         is_account_physical_address: true,
         is_account_billing_address: false,
         is_account_mailing_address: true
      });
   });

   // account-router.js's combined PUT now treats a key's mere ABSENCE from
   // req.body.account as "leave this column alone" (accountObjects.js's
   // restoreDataTypesAccountOnUpdate / restoreDataTypesAccountInformationOnUpdate
   // only include a field when it's an own property of the payload) — it used
   // to synthesize is_account_active:false and a fresh created_at for
   // whichever fields were missing. That only works if these two builders
   // never send those keys themselves; toMatchObject above wouldn't catch a
   // stray extra key, so assert the exact key sets.
   it('formObjectForUpdateAccountPost never sends is_account_active, created_at, or any account_information field', () => {
      const result = formObjectForUpdateAccountPost({ accountName: 'James F. Kimmel & Associates', accountType: 'Business' });

      expect(Object.keys(result).sort()).toEqual(
         ['account_id', 'account_name', 'account_type', 'account_statement', 'account_interest_statement', 'account_invoice_template_option'].sort()
      );
      expect(result).not.toHaveProperty('is_account_active');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('account_info_id');
      expect(result).not.toHaveProperty('account_street');
   });

   it('formObjectForAccountAddressUpdate never sends is_account_active, created_at, or any accounts-table business field', () => {
      const result = formObjectForAccountAddressUpdate({
         accountInfoID: 7,
         accountID: 1,
         customerStreet: '123 Main St',
         isThisAddressActive: true,
         isCustomerPhysicalAddress: true,
         isCustomerBillingAddress: true,
         isCustomerMailingAddress: true
      });

      expect(Object.keys(result).sort()).toEqual(
         [
            'account_info_id',
            'account_id',
            'account_street',
            'account_city',
            'account_state',
            'account_zip',
            'account_email',
            'account_phone',
            'is_this_address_active',
            'is_account_physical_address',
            'is_account_billing_address',
            'is_account_mailing_address'
         ].sort()
      );
      expect(result).not.toHaveProperty('is_account_active');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('account_name');
      // account_info_id must be a real, present value — the backend now 400s a
      // request that touches account_information without a valid one.
      expect(result.account_info_id).toBe(7);
   });
});
