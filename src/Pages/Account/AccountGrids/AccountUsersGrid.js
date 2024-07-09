import { Stack } from '@mui/material';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import AddIcon from '@mui/icons-material/Add';
import palette from '../../../Theme/palette';
import AddUser from '../AccountForms/AddNewUser/AddUser';

export default function AccountUsersGrid({ customerData, setCustomerData }) {
   if (!customerData || !customerData.teamMembersList || !customerData.teamMembersList.activeUserData) {
      // You can render a loading indicator or an empty state here
      return <div>Loading...</div>;
   }

   const {
      teamMembersList: { activeUserData }
   } = customerData;

   const gridButtons = [
      {
         dialogTitle: 'New New User',
         tooltipText: 'Add New User',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <AddUser activeUsers={activeUserData.activeUsers} customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   return (
      <>
         <Stack spacing={3}>
            <DataGridTable
               title='Account Users'
               tableData={activeUserData.grid}
               checkboxSelection={false}
               arrayOfButtons={gridButtons}
               enableSingleRowClick
               rowSelectionOnly
               routeToPass={'/account/accountUsers/deleteUser'}
            />
         </Stack>
      </>
   );
}
