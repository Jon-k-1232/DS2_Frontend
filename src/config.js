import TokenService from './Services/TokenService';

const deriveApiEndpoint = () => {
   const env = process.env.REACT_APP_ENV;
   const productionEndpoint = process.env.REACT_APP_API_PROD_ENDPOINT;
   const developmentEndpoint = process.env.REACT_APP_API_DEV_ENDPOINT;
   const genericEndpoint = process.env.REACT_APP_API_ENDPOINT;

   const resolved = (env === 'production' ? productionEndpoint : developmentEndpoint) || genericEndpoint || '';

   if (!resolved) {
      // Fail loudly instead of falling back to window.location.origin — auto-detection
      // could let a phishing site or DNS hijack point the app at an attacker-controlled API.
      console.error('API endpoint env var not set. Configure REACT_APP_API_ENDPOINT (or _PROD_/_DEV_) at build time.');
      return '';
   }

   return resolved.replace(/\/+$/, '');
};

const config = {
   REACT_APP_ENV: process.env.REACT_APP_ENV,
   API_ENDPOINT: deriveApiEndpoint(),
   GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
   JWT_TOKEN: `bearer ${TokenService.getAuthToken()}`
};

export default config;
