import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

Logo.propTypes = {
   sx: PropTypes.object
};

export default function Logo({ sx }) {
   return (
      <Box>
         <Typography style={{ fontFamily: 'Kanit, sans-serif', color: '#00AB55', fontSize: '2.7em', ...sx }} variant='h2'>
            DS | 2
         </Typography>
      </Box>
   );
}
