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
      <Box style={{ padding: '20px', backgroundColor: '#1c2536', color: '#637381' }}>
         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
               <tr>
                  <td style={{ padding: '3px 5px' }}>
                     <Typography variant='caption'>File System Connected:</Typography>
                  </td>
                  <td style={{ padding: '3px 5px', display: 'flex', alignItems: 'center' }}>
                     <CircleIcon
                        fontSize='small'
                        style={{
                           color: serverHealth?.fileSystem?.message === 'UP' ? '#00AB55' : '#fd2828',
                           marginTop: '5px'
                        }}
                     />
                  </td>
               </tr>
               <tr>
                  <td style={{ padding: '3px 5px' }}>
                     <Typography variant='caption'>Server Health:</Typography>
                  </td>
                  <td style={{ padding: '3px 5px', display: 'flex', alignItems: 'center' }}>
                     <CircleIcon
                        fontSize='small'
                        style={{
                           color: serverHealth?.cpu?.message === 'UP' ? '#00AB55' : '#fd2828',
                           marginTop: '5px'
                        }}
                     />
                  </td>
               </tr>
               <tr>
                  <td style={{ padding: '3px 5px' }}>
                     <Typography variant='caption'>Database Health:</Typography>
                  </td>
                  <td style={{ padding: '3px 5px', display: 'flex', alignItems: 'center' }}>
                     <CircleIcon
                        fontSize='small'
                        style={{
                           color: serverHealth?.database?.message === 'UP' ? '#00AB55' : '#fd2828',
                           marginTop: '5px'
                        }}
                     />
                  </td>
               </tr>

               <tr>
                  <td style={{ padding: '3px 5px' }}>
                     <Typography variant='caption'>Backend Environment:</Typography>
                  </td>
                  <td style={{ padding: '3px 5px' }}>
                     <Typography variant='caption'>{(serverHealth?.backendEnvironmentName || '').toUpperCase()}</Typography>
                  </td>
               </tr>
            </tbody>
         </table>
      </Box>
   );
};

export default ServerStatus;
