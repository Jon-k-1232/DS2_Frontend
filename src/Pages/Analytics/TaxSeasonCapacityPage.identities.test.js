import React from 'react';
import { render, screen } from '@testing-library/react';
import TaxSeasonCapacityPage from './TaxSeasonCapacityPage';
import { context } from '../../App';
import { fetchTaxSeasonCapacity } from '../../Services/ApiCalls/AnalyticsCalls';

jest.mock('../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../Services/ApiCalls/AnalyticsCalls', () => ({ fetchTaxSeasonCapacity: jest.fn() }));
jest.mock('./useExcludedCustomers', () => {
   const value = { ready: true, excludedIds: [], filter: null };
   return () => value;
});

it('F35 keeps same-name employee cards distinct across current and prior years', async () => {
   fetchTaxSeasonCapacity.mockResolvedValue({ taxSeasonCapacity: { current: [
      { user_id: 90011, employee: 'Alex', week: 2, hours: 4 }, { user_id: 90012, employee: 'Alex', week: 2, hours: 6 }
   ], prior: [
      { user_id: 90011, employee: 'Alex', week: 2, hours: 1 }, { user_id: 90012, employee: 'Alex', week: 2, hours: 3 }
   ] } });
   render(<context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013 } }}><TaxSeasonCapacityPage /></context.Provider>);
   const first = await screen.findByText('Alex (#90011)');
   const second = screen.getByText('Alex (#90012)');
   expect(first.closest('.MuiPaper-root')).not.toBe(second.closest('.MuiPaper-root'));
   expect(first.closest('.MuiPaper-root').querySelector('tbody').textContent).toContain('4');
   expect(second.closest('.MuiPaper-root').querySelector('tbody').textContent).toContain('6');
});
