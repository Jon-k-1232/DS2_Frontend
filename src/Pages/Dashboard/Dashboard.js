import { Stack } from '@mui/material';
import EmployeeTimeWidget from './EmployeeTimeWidget';

export default function Dashboard() {
   return (
      <>
         <Stack spacing={3}>
            <h1>Welcome</h1>
            <EmployeeTimeWidget />
         </Stack>
      </>
   );
}
