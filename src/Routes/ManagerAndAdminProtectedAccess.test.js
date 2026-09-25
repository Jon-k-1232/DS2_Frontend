import React from 'react';
import { render, screen } from '@testing-library/react';
import ManagerRoute from './ManagerAndAdminProtectedAccess';
import AdminRoute from './AdminProtectedAccess';
import SuperAdminRoute from './SuperAdminAccess';
import { context } from '../App';
jest.mock('../App', () => ({ context: require('react').createContext({}) }));

it.each(['Manager', 'Admin', 'Super Admin', 'Owner', 'owner'])('F37 admits backend manager-role %s to ledger pages', accessLevel => {
   render(<context.Provider value={{ loggedInUser: { accessLevel } }}><ManagerRoute><div>Ledger page</div></ManagerRoute></context.Provider>);
   expect(screen.getByText('Ledger page')).toBeInTheDocument();
});
it.each(['User', 'employee', undefined])('F37 denies ordinary role %s', accessLevel => {
   render(<context.Provider value={{ loggedInUser: { accessLevel } }}><ManagerRoute><div>Ledger page</div></ManagerRoute></context.Provider>);
   expect(screen.queryByText('Ledger page')).not.toBeInTheDocument();
   expect(screen.getByText('Unauthorized')).toBeInTheDocument();
});
it.each([AdminRoute, SuperAdminRoute])('F37 keeps Owner outside higher-privilege routes', Route => {
   render(<context.Provider value={{ loggedInUser: { accessLevel: 'Owner' } }}><Route><div>Privileged page</div></Route></context.Provider>);
   expect(screen.queryByText('Privileged page')).not.toBeInTheDocument();
});
