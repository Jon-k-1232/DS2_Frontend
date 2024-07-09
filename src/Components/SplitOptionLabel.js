import { Box } from '@mui/material';

// Custom component to render the option label
const SplitOptionLabel = ({ alignLeft, alignRight }) => {
   return (
      <Box display='flex' justifyContent='space-between' width='100%'>
         <span>{alignLeft}</span>
         <span>{alignRight}</span>
      </Box>
   );
};

export default SplitOptionLabel;
