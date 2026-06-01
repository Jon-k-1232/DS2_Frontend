import { useContext } from 'react';
import { Typography, Container } from '@mui/material';
import { context } from '../App';

// Super admin is a real access_level value in the users table — sits above
// "Admin" / "Manager" / "User". Gate destructive admin-of-admin actions
// (user CRUD, master tracker template upload) on this check.
export const isSuperAdmin = loggedInUser => {
   if (!loggedInUser) return false;
   const access = (loggedInUser.accessLevel || '').trim().toLowerCase();
   return access === 'super admin';
};

const SuperAdminProtectedAccessRoute = ({ children }) => {
   const { loggedInUser } = useContext(context);
   if (isSuperAdmin(loggedInUser)) return children;
   return (
      <Container style={{ textAlign: 'center', paddingTop: 40 }}>
         <Typography variant='h3'>Unauthorized</Typography>
         <Typography variant='body1'>This page is restricted to super admins.</Typography>
         <Typography variant='body2'>If this is in error, please notify your administrator.</Typography>
      </Container>
   );
};

export default SuperAdminProtectedAccessRoute;
