import axios from 'axios';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import TokenService from './Services/TokenService';

// Send the httpOnly session cookie on every API request (and accept Set-Cookie
// on login). This replaces the old Authorization: Bearer header.
axios.defaults.withCredentials = true;

// If the session cookie is missing/expired the API returns 401 — clear local
// session state and bounce to login so the UI doesn't sit in a broken state.
axios.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const path = window.location?.pathname || '';
    if (status === 401 && !path.startsWith('/login')) {
      TokenService.handleLogout();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

const root = createRoot(document.getElementById('root'));

root.render(
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>
);
