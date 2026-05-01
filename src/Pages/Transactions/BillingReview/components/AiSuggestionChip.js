import { Chip, Tooltip } from '@mui/material';

export default function AiSuggestionChip({ entry }) {
   if (!entry) return null;
   const conf = entry.ai_confidence != null ? Number(entry.ai_confidence) : null;
   const label = entry.ai_suggested_category || entry.suggested_customer_display_name || 'AI suggestion';
   const conf2 = conf != null ? ` · ${conf.toFixed(2)}` : '';
   return (
      <Tooltip title={entry.ai_reason || 'AI suggestion'} arrow>
         <Chip size='small' label={`AI: ${label}${conf2}`} variant='outlined' />
      </Tooltip>
   );
}
