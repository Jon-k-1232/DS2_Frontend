import { useContext } from 'react';
import { Typography, Container } from '@mui/material';
import { context } from '../App';

// Mirror of DS2_Backend/.../auditAllowlist.js — must stay in sync.
const ACCOUNT_AUDIT_ALLOWED_NAMES = ['kasi kimmel', 'jon kimmel'];

export const canAccessAccountAudit = loggedInUser => {
   if (!loggedInUser) return false;
   const access = (loggedInUser.accessLevel || '').toLowerCase();
   const name = (loggedInUser.displayName || '').trim().toLowerCase();
   return access === 'admin' && ACCOUNT_AUDIT_ALLOWED_NAMES.includes(name);
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
