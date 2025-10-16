import { render, waitFor, act } from '@testing-library/react';
import ServerStatus from './ServerStatus';
import { context as AppContext } from '../../App';
import { fetchServerHealth } from '../../Services/ApiCalls/FetchCalls';

jest.mock('../../Services/ApiCalls/FetchCalls', () => ({
   fetchServerHealth: jest.fn()
}));

const healthResponse = {
   memory: { message: 'UP' },
   cpu: { message: 'UP' },
   database: { message: 'UP' },
   fileSystem: { message: 'UP' },
   backendEnvironmentName: 'development'
};

describe('ServerStatus', () => {
   beforeEach(() => {
      jest.useFakeTimers();
      fetchServerHealth.mockResolvedValue(healthResponse);
   });

   afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
   });

   const renderWithContext = () =>
      render(
         <AppContext.Provider
            value={{ loggedInUser: { accountID: 1, userID: 2, token: 'mock-token' } }}
         >
            <ServerStatus />
         </AppContext.Provider>
      );

   it('requests server health immediately and every 60 seconds', async () => {
      renderWithContext();

      await waitFor(() => expect(fetchServerHealth).toHaveBeenCalledTimes(1));
      expect(fetchServerHealth).toHaveBeenCalledWith(1, 2, 'mock-token');

      await act(async () => {
         jest.advanceTimersByTime(60000);
      });

      await waitFor(() => expect(fetchServerHealth).toHaveBeenCalledTimes(2));
   });
});
