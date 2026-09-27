import { Tooltip } from '@mui/material';
export default function ActorName({ id, name }) {
  return <Tooltip title={id ? `User ID: ${id}` : 'No staff identity was recorded'}><span>{name || (id ? 'Name not recorded' : 'System')}</span></Tooltip>;
}
