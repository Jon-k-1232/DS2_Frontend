import TokenService from './Services/TokenService';

const config = {
   REACT_APP_ENV: process.env.REACT_APP_ENV,
   API_ENDPOINT: process.env.REACT_APP_ENV === 'production' ? process.env.REACT_APP_API_PROD_ENDPOINT : process.env.REACT_APP_API_DEV_ENDPOINT,
   FRONT_WEB: process.env.REACT_APP_FRONT_WEB || '*',
   API_TOKEN: process.env.REACT_APP_API_TOKEN,
   JWT_TOKEN: `bearer ${TokenService.getAuthToken()}`,
   DISPLAY_NAME: process.env.REACT_APP_DISPLAY_NAME || ''
};

export default config;
