import { useState, useContext, useEffect } from 'react';
import { Stack, Button, Alert, Box, Checkbox, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TeamMemberName from '../AddNewUser/FormSubComponents/TeamMemberNameForm';
import AccessSelections from '.././AddNewUser/FormSubComponents/AccessSelections';
import RateSelections from '../AddNewUser/FormSubComponents/RateSelections';
import { putEditTeamMember } from '../../../../Services/ApiCalls/PutCalls';
import { context } from '../../../../App';

const initialState = {
  userDisplayName: '',
  userEmail: '',
  costRate: 0,
  billingRate: 0,
  role: '',
  accessLevel: '',
  userLoginName: '',
  userLoginPassword: '',
  isUserActive: true
};

export default function EditUser({ customerData, setCustomerData, userData }) {
  const navigate = useNavigate();
  const { accountID, userID } = useContext(context).loggedInUser;

  const [postStatus, setPostStatus] = useState(null);
  const [selectedItems, setSelectedItems] = useState(initialState);

  const { access_level, account_id, billing_rate, cost_rate, created_at, display_name, email, is_user_active, job_title, user_id } =
    userData || {};

  useEffect(() => {
    if (userData && Object.keys(userData).length) {
      setSelectedItems({
        ...selectedItems,
        accountID: account_id,
        userID: user_id,
        createdAt: created_at,
        isUserActive: is_user_active,
        userDisplayName: display_name,
        userEmail: email,
        costRate: cost_rate,
        billingRate: billing_rate,
        role: job_title,
        accessLevel: access_level
      });
    }
    // eslint-disable-next-line
  }, []);

  const handleSubmit = async () => {
    const postedItem = await putEditTeamMember(selectedItems, accountID, userID);

    setPostStatus(postedItem);
    if (postedItem.status === 200) {
      setCustomerData({ ...customerData, teamMembersList: postedItem.teamMembersList });
      setTimeout(() => setPostStatus(null), 2000);
      setSelectedItems(initialState);
      navigate('/account/accountUsers');
    }
  };

  return (
    <>
      <Stack spacing={3} sx={{ marginTop: '25px' }}>
        <TeamMemberName selectedItems={selectedItems} setSelectedItems={e => setSelectedItems(e)} page='editUser' />
        <RateSelections selectedItems={selectedItems} setSelectedItems={e => setSelectedItems(e)} />
        <AccessSelections selectedItems={selectedItems} setSelectedItems={e => setSelectedItems(e)} />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.isUserActive}
              onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isUserActive: e.target.checked }))}
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
