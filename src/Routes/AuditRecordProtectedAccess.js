import { useContext } from 'react';
import { Alert } from '@mui/material';
import { context } from '../App';

// The deterministic client Audit Record is Admin/Super Admin only. This is a
// distinct permission from AI Audit (Super Admin), and the API enforces it too.
export const canAccessAuditRecord = user => ['admin', 'super admin'].includes((user?.accessLevel || '').toLowerCase());
export default function AuditRecordProtectedAccess({ children }) {
   const { loggedInUser } = useContext(context);
   return canAccessAuditRecord(loggedInUser) ? children : <Alert severity='error'>Audit Record is restricted to admins and super admins.</Alert>;
}
