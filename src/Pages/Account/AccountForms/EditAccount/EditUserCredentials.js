import { useState, useContext } from 'react';
import { Stack, Button, Alert, Box, Checkbox, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { putEditUserLogin } from '../../../../Services/ApiCalls/PutCalls';
import { context } from '../../../../App';
import UserLoginSelections from '../AddNewUser/FormSubComponents/UserLoginSelections';

export default function EditUserCredentials({ customerData, setCustomerData, userData }) {
  const navigate = useNavigate();
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState({
    userLoginName: '',
    userLoginPassword: '',
    isLoginActive: true,
    accountID: userData.account_id,
    userID: userData.user_id,
    userLoginID: userData.user_login_id
  });

  const handleSubmit = async () => {
    const postedItem = await putEditUserLogin(selectedItems, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, teamMembersList: postedItem.teamMembersList });
      setTimeout(() => setPostStatus(null), 2000);
      navigate('/account/accountUsers');
    }
  };

  return (
    <>
      <Stack spacing={3} sx={{ marginTop: '25px' }}>
        <UserLoginSelections selectedItems={selectedItems} setSelectedItems={e => setSelectedItems(e)} />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.isLoginActive}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isLoginActive: e.target.checked }))}
            />
          }
          label='Active'
        />

        <Box style={{ textAlign: 'center' }}>
          <Button onClick={handleSubmit}>Submit</Button>
          {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
        </Box>
      </Stack>
    </>
  );
}
