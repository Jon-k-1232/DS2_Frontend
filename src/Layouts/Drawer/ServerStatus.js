import React, { useEffect, useState, useContext } from 'react';
import { fetchServerHealth } from '../../Services/ApiCalls/FetchCalls';
import CircleIcon from '@mui/icons-material/Circle';
import { Typography, Box } from '@mui/material';
import { context } from '../../App';

const ServerStatus = () => {
   const [serverHealth, setServerHealth] = useState({});
   const {
      loggedInUser: { accountID, userID, token }
   } = useContext(context);

   useEffect(() => {
      const callServerHealth = async () => {
         const serverHealthFromServer = await fetchServerHealth(accountID, userID, token);
         setServerHealth(serverHealthFromServer);
      };
      callServerHealth();
      // recall every 2 minutes
      const intervalId = setInterval(callServerHealth, 30000);
      return () => clearInterval(intervalId);
      // eslint-disable-next-line
   }, []);

   return (
      <Box style={{ padding: '20px', backgroundColor: '#1c2536', color: '#637381', display: 'flex', alignItems: 'center' }}>
         <Box style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant='caption' style={{ padding: '3px 5px' }}>
               File System Connected:
            </Typography>
            <Typography variant='caption' style={{ padding: '3px 5px' }}>
               Server Health:
            </Typography>
            <Typography variant='caption' style={{ padding: '3px 5px' }}>
               Database Health:
            </Typography>
         </Box>

         <Box style={{ display: 'flex', flexDirection: 'column' }}>
            <CircleIcon fontSize='small' style={{ paddingBottom: '2px', color: serverHealth?.fileSystem?.message === 'UP' ? '#00AB55' : '#fd2828' }} />
            <CircleIcon fontSize='small' style={{ paddingBottom: '2px', color: serverHealth?.cpu?.message === 'UP' ? '#00AB55' : '#fd2828' }} />
            <CircleIcon fontSize='small' style={{ paddingTop: '2px', color: serverHealth?.database?.message === 'UP' ? '#00AB55' : '#fd2828' }} />
         </Box>
      </Box>
   );
};
export default ServerStatus;
