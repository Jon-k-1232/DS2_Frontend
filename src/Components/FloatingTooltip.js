import { Tooltip } from '@mui/material';

export default function FloatingTooltip({ tooltipContent, children }) {
   return (
      <Tooltip title={tooltipContent} placement='top' arrow followCursor>
         {children || ''}
      </Tooltip>
   );
}
