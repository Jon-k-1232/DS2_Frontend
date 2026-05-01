import Router from './Routes/PrimaryRouter';
import ThemeConfig from './Theme';
import GlobalStyles from './Theme/globalStyles';
import { createContext, useState } from 'react';
import { RowDataProvider } from './Routes/useRowData';

let context = createContext();

export default function App() {
   const windowUserID = window.sessionStorage.getItem('userID') || null;
   const windowAccountID = window.sessionStorage.getItem('accountID') || null;
   const windowToken = window.sessionStorage.getItem('token') || null;
   const windowRequiresReset = window.sessionStorage.getItem('requiresPasswordReset') === 'true';
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
         token: windowToken,
         requiresPasswordReset: windowRequiresReset
      } || {}
   );

   return (
      <ThemeConfig>
         <context.Provider value={{ loggedInUser, setLoggedInUser }}>
            <RowDataProvider>
               <GlobalStyles />
               <Router />
            </RowDataProvider>
         </context.Provider>
      </ThemeConfig>
   );
}

export { context };
