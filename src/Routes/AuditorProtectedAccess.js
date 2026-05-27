import { useContext } from 'react';
import { Typography, Container } from '@mui/material';
import { context } from '../App';

export const canAccessAccountAudit = loggedInUser => {
   if (!loggedInUser) return false;
   const access = (loggedInUser.accessLevel || '').toLowerCase();
   return access === 'super admin';
};

const AuditorProtectedAccessRoute = ({ children }) => {
   const { loggedInUser } = useContext(context);
   if (canAccessAccountAudit(loggedInUser)) return children;
   return (
      <Container style={{ textAlign: 'center', paddingTop: 40 }}>
         <Typography variant='h3'>Unauthorized</Typography>
         <Typography variant='body1'>You are not authorized to access the Account Audit module.</Typography>
         <Typography variant='body2'>If this is in error, please notify your administrator.</Typography>
      </Container>
   );
};

export default AuditorProtectedAccessRoute;
