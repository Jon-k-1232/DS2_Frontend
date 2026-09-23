jest.mock('axios', () => ({}));
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditCustomerProfile from './EditCustomerProfile';
import { context } from '../../../App';

jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
   ...jest.requireActual('react-router-dom'),
   useNavigate: () => mockNavigate
}));

const loggedInUser = { accountID: 9001, userID: 90013, accessLevel: 'Admin' };

const renderWith = profileData =>
   render(
      <MemoryRouter>
         <context.Provider value={{ loggedInUser }}>
            <EditCustomerProfile profileData={profileData} customerData={{}} setCustomerData={() => {}} setCallProfileData={() => {}} />
         </context.Provider>
      </MemoryRouter>
   );

// E6 — EditCustomerProfile must not throw when profileData is a body-shaped
// 404/error object ({status: 404, message: '...'}, no customerData at all).
// It used to reach setInitialState()'s unguarded
// `profileData.customerData.customerData` destructure and throw a TypeError;
// it must instead take the same "nothing to edit" path as a missing/empty
// profileData already did — navigate back to the customer list.
describe('EditCustomerProfile — body-status 404 profileData', () => {
   beforeEach(() => mockNavigate.mockClear());

   it('does not throw on a body-status {status: 404} profileData, and navigates away instead', () => {
      const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
         expect(() => renderWith({ status: 404, message: 'Customer not found.' })).not.toThrow();
      } finally {
         silence.mockRestore();
      }
      expect(mockNavigate).toHaveBeenCalledWith('/customers/customersList');
   });

   it('navigates away for a missing profileData too (pre-existing "nothing loaded yet" path)', () => {
      expect(() => renderWith(null)).not.toThrow();
      expect(mockNavigate).toHaveBeenCalledWith('/customers/customersList');
   });

   it('renders the edit form (does not navigate away) for a genuine successful profile load', () => {
      renderWith({
         status: 200,
         customerData: {
            customerData: {
               customer_id: 42,
               customer_name: 'Jane Doe',
               account_id: 9001,
               is_customer_active: true,
               is_billable: true,
               is_commercial_customer: false
            }
         }
      });
      expect(mockNavigate).not.toHaveBeenCalled();
   });
});

// E6 — setInitialState used to split customer_name on the FIRST space only
// (names[0] -> First Name, names.slice(1).join(' ') -> Last Name), so a
// multi-word first name lost everything after its first word. Fixed to
// split on the LAST space instead (mirroring the multi-word-last-name case
// this already handled), and to prefer separately-stored first/last name
// fields over any split at all when the profile ever provides them.
const successfulProfile = customerData => ({
   status: 200,
   customerData: {
      customerData: {
         customer_id: 42,
         account_id: 9001,
         is_customer_active: true,
         is_billable: true,
         is_commercial_customer: false,
         ...customerData
      }
   }
});

describe('EditCustomerProfile — first/last name split', () => {
   beforeEach(() => mockNavigate.mockClear());

   it('splits a multi-word first name on the LAST space, not the first', () => {
      renderWith(successfulProfile({ customer_name: 'Mary Ann Smith' }));
      expect(screen.getByLabelText('First Name')).toHaveValue('Mary Ann');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Smith');
   });

   it('still splits a single-word first / single-word last name correctly', () => {
      renderWith(successfulProfile({ customer_name: 'Jane Doe' }));
      expect(screen.getByLabelText('First Name')).toHaveValue('Jane');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Doe');
   });

   it('handles a name with no space at all (First Name gets everything, Last Name empty)', () => {
      renderWith(successfulProfile({ customer_name: 'Cher' }));
      expect(screen.getByLabelText('First Name')).toHaveValue('Cher');
      expect(screen.getByLabelText('Last Name')).toHaveValue('');
   });

   it('prefers separately-stored customer_first_name/customer_last_name over splitting customer_name when the profile provides them', () => {
      renderWith(
         successfulProfile({
            customer_name: 'Ignored Combined Name',
            customer_first_name: 'Explicit',
            customer_last_name: 'Fields'
         })
      );
      expect(screen.getByLabelText('First Name')).toHaveValue('Explicit');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Fields');
   });

   // Documents a known, unavoidable limitation rather than hiding it: a name
   // that is multi-word on BOTH sides ("Mary Jane Smith" meant as first
   // "Mary Jane" / last "Smith", or first "Mary" / last "Jane Smith") cannot
   // be split back unambiguously from the single combined customer_name
   // string alone — there is no delimiter marking where first ends and last
   // begins. Splitting on the last space (this fix) recovers a multi-word
   // FIRST name correctly; it necessarily does not also recover a genuinely
   // multi-word LAST name paired with a single-word first name. Only a
   // stored first/last field (branch above) resolves that case exactly.
   it('a name that is multi-word on both sides cannot be split back exactly (documented limitation)', () => {
      renderWith(successfulProfile({ customer_name: 'Mary Jane Smith' }));
      expect(screen.getByLabelText('First Name')).toHaveValue('Mary Jane');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Smith');
   });
});
