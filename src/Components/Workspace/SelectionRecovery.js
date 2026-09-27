import { Alert, Button, Stack } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { pageForPath } from '../../Routes/SidebarRoutes';

export default function SelectionRecovery({ message }) {
   const { pathname } = useLocation();
   const page = pageForPath(pathname);
   return <Stack spacing={2} sx={{ p: 3 }}>
      <Alert severity='info'>{message || 'This link does not identify a record. Select it from the list to continue.'}</Alert>
      <Button component={Link} to={page?.path || '/clients'}>Open {page?.title?.toLowerCase() || 'clients'}</Button>
   </Stack>;
}
