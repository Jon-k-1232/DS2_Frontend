import { useContext } from 'react';
import { Typography, Container } from '@mui/material';
import { context } from '../App';

const ManagerAndAdminProtectedAccessRoute = ({ children }) => {
   const { loggedInUser } = useContext(context);
   const { accessLevel } = loggedInUser;

   const hasAccess = () => {
      const access = accessLevel?.toLowerCase();
      const allowedAccessLevels = ['admin', 'manager'];
      return allowedAccessLevels.includes(access);
   };

   return hasAccess() ? (
      children
   ) : (
      <Container style={{ textAlign: 'center' }}>
         <Typography variant='h3'>Unauthorized</Typography>
         <Typography variant='body1'>You are not authorized to access this page.</Typography>
         <Typography variant='body2'>If this is in error, please notify your administrator.</Typography>
      </Container>
   );
};

export default ManagerAndAdminProtectedAccessRoute;
