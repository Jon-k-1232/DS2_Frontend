import { useState } from 'react';
import { Stack, Button, Alert, TextField, Autocomplete, Box, Input } from '@mui/material';
import { putUpdateAccount } from '../../../../Services/ApiCalls/PutCalls';
import { formObjectForUpdateAccountPost } from '../../../../Services/SharedPostObjects/SharedPostObjects';

const initialState = {
   accountName: '',
   accountType: null,
   accountStatement: '',
   accountInterestStatement: '',
   template: null,
   logo: null,
   interestForInvoices: ''
};

export default function UpdateAccount() {
   const [postStatus, setPostStatus] = useState(null);
   const [accountData, setAccountData] = useState(initialState);
   const [logoPreview, setLogoPreview] = useState(null);

   const updateAccountData = (key, value) => {
      setAccountData(prevData => ({ ...prevData, [key]: value }));
   };

   const handleSubmit = async () => {
      const formData = new FormData();
      Object.entries(accountData).forEach(([key, value]) => {
         if (key === 'logo' && value) {
            formData.append(key, value, value.name);
         } else {
            formData.append(key, value);
         }
      });

      // Transform FormData into a regular object again
      const dataToPost = {};
      formData.forEach((value, key) => {
         dataToPost[key] = value;
      });

      const formattedData = formObjectForUpdateAccountPost(dataToPost);
      const postedItem = await putUpdateAccount(formattedData);

      setPostStatus(postedItem);
      if (postedItem?.status === 200) resetState(postedItem);
   };

   const resetState = () => {
      setAccountData(initialState);
      setTimeout(() => setPostStatus(null), 4000);
   };

   const handleFileChange = e => {
      updateAccountData('logo', e.target.files[0]);
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
   };

   return (
      <Stack spacing={3} sx={{ '& > *': { marginBottom: 2 } }}>
         <TextField size='small' sx={{ width: 350 }} label='Business Name' variant='standard' value={accountData.accountName} onChange={e => updateAccountData('accountName', e.target.value)} />
         <Autocomplete
            size='small'
            sx={{ width: 350 }}
            options={['Business', 'Individual']}
            renderInput={params => <TextField {...params} label='Account Type' variant='standard' />}
            value={accountData.accountType}
            onChange={(e, newValue) => updateAccountData('accountType', newValue)}
         />
         <TextField
            size='small'
            sx={{ width: 350 }}
            label='Statement To Appear On Invoices'
            variant='standard'
            value={accountData.accountStatement}
            onChange={e => updateAccountData('accountStatement', e.target.value)}
         />
         <TextField
            size='small'
            sx={{ width: 350 }}
            label='Interest Statement To Appear On Invoices'
            variant='standard'
            value={accountData.accountInterestStatement}
            onChange={e => updateAccountData('accountInterestStatement', e.target.value)}
         />
         <TextField
            size='small'
            sx={{ width: 350 }}
            variant='standard'
            label='Interest Rate On Unpaid Invoices'
            type='number'
            value={accountData.interestForInvoices}
            onChange={e => updateAccountData('interestForInvoices', e.target.value)}
            helperText='Insert percentage, e.g., 1.5'
         />
         <Autocomplete
            size='small'
            sx={{ width: 350 }}
            options={['Template One']}
            renderInput={params => <TextField {...params} label='Template' variant='standard' />}
            value={accountData.template}
            onChange={(e, newValue) => updateAccountData('template', newValue)}
         />

         <Box>
            <Button color='primary' component='label' htmlFor='upload-logo'>
               Upload Logo
               <Input sx={{ display: 'none' }} id='upload-logo' type='file' accept='.jpeg, .jpg, .png' onChange={handleFileChange} />
            </Button>
         </Box>

         <Box>{logoPreview && <img src={logoPreview} alt='logo preview' style={{ width: '100px', height: '100px', border: '1px solid #02ab55', borderRadius: '10px' }} />}</Box>

         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <Button onClick={handleSubmit}>Submit</Button>
            {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         </Box>
      </Stack>
   );
}
