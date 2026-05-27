import { createContext, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Router from './Routes/PrimaryRouter';
import ThemeConfig from './Theme';
import GlobalStyles from './Theme/globalStyles';
import { RowDataProvider } from './Routes/useRowData';
import config from './config';

let context = createContext();

export default function App() {
   const windowUserID = window.sessionStorage.getItem('userID') || null;
   const windowAccountID = window.sessionStorage.getItem('accountID') || null;
   const windowToken = window.sessionStorage.getItem('token') || null;
   // Restore identity-derived fields so a page reload keeps protected routes
   // (e.g. /transactions/*) accessible without forcing a re-login. LoginForm
   // is responsible for writing these on a fresh login.
   const windowAccessLevel = window.sessionStorage.getItem('accessLevel') || null;
   const windowDisplayName = window.sessionStorage.getItem('displayName') || null;
   const windowRole = window.sessionStorage.getItem('role') || null;

   let [loggedInUser, setLoggedInUser] = useState(
      {
         accountID: windowAccountID,
         userID: windowUserID,
         displayName: windowDisplayName,
         role: windowRole,
         accessLevel: windowAccessLevel,
         token: windowToken
      } || {}
   );

   return (
      <GoogleOAuthProvider clientId={config.GOOGLE_CLIENT_ID}>
         <ThemeConfig>
            <context.Provider value={{ loggedInUser, setLoggedInUser }}>
               <RowDataProvider>
                  <GlobalStyles />
                  <Router />
               </RowDataProvider>
            </context.Provider>
         </ThemeConfig>
      </GoogleOAuthProvider>
   );
}

export { context };
