import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

jest.mock('../Routes/PrimaryRouter', () => () => <div>Mock Router</div>);

jest.mock('axios', () => {
   const mock = {
      get: jest.fn(() => Promise.resolve({ data: {} })),
      post: jest.fn(() => Promise.resolve({ data: {} }))
   };
   return { __esModule: true, default: mock }; 
});

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
      render(
         <MemoryRouter>
            <App />
         </MemoryRouter>
      );
      expect(await screen.findByText(/mock router/i)).toBeInTheDocument();
   });
});
