import React from 'react';
import { Stack } from '@mui/material';
import ImageFromData from './ImageFromData';

export default function AccountLogo({ accountInformation }) {
   return (
      <>
         <Stack spacing={3}>
            <ImageFromData accountInformation={accountInformation} />
         </Stack>
      </>
   );
}
