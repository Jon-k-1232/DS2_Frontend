import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('../Services/ApiCalls/FetchCalls', () => ({
   fetchAppVersion: jest.fn().mockResolvedValue('test-version'),
   getInitialAppData: jest.fn().mockResolvedValue({}),
   fetchSingleUser: jest.fn().mockResolvedValue({
      activeUserData: {
         activeUser: {}
      }
   })
}));

jest.mock('../Services/TokenService', () => ({
   getAuthToken: jest.fn(() => null),
   isTokenExpired: jest.fn(() => ({ isExpired: false })),
   saveAuthToken: jest.fn(),
   clearAuthToken: jest.fn(),
   hasAuthToken: jest.fn(() => false),
   handleLogout: jest.fn()
}));

describe('App', () => {
   beforeEach(() => {
      window.sessionStorage.clear();
   });

   it('renders the login screen when no session is active', async () => {
      render(<App />);
      expect(await screen.findByText(/sign in to ds2/i)).toBeInTheDocument();
   });
});
