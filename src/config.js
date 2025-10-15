import TokenService from './Services/TokenService';

const deriveApiEndpoint = () => {
   const env = process.env.REACT_APP_ENV;
   const productionEndpoint = process.env.REACT_APP_API_PROD_ENDPOINT;
   const developmentEndpoint = process.env.REACT_APP_API_DEV_ENDPOINT;
   const genericEndpoint = process.env.REACT_APP_API_ENDPOINT;

   const resolved =
      (env === 'production' ? productionEndpoint : developmentEndpoint) ||
      genericEndpoint ||
      '';

   if (!resolved && typeof window !== 'undefined') {
      return window.location.origin.replace(/\/+$/, '');
   }

   return resolved.replace(/\/+$/, '');
};

const config = {
   REACT_APP_ENV: process.env.REACT_APP_ENV,
   API_ENDPOINT: deriveApiEndpoint(),
   FRONT_WEB: process.env.REACT_APP_FRONT_WEB || '*',
   API_TOKEN: process.env.REACT_APP_API_TOKEN,
   JWT_TOKEN: `bearer ${TokenService.getAuthToken()}`,
   DISPLAY_NAME: process.env.REACT_APP_DISPLAY_NAME || ''
};

export default config;
