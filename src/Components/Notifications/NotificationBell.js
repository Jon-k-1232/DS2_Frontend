import { useState } from 'react';
import { Badge, Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Popover, Stack, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import useNotifications from './useNotifications';
import { routeFor } from './notificationRouting';

export default function NotificationBell() {
   const navigate = useNavigate();
   const { unreadCount, items, loading, refreshItems, markRead, markAllRead } = useNotifications();
   const [anchor, setAnchor] = useState(null);

   const handleOpen = e => {
      setAnchor(e.currentTarget);
      refreshItems();
   };
   const handleClose = () => setAnchor(null);

   const handleClick = async item => {
      await markRead(item.notification_id);
      handleClose();
      navigate(routeFor(item.type));
   };

   return (
      <>
         <IconButton onClick={handleOpen} color='inherit' size='large'>
            <Badge badgeContent={unreadCount} color='error'>
               <NotificationsIcon />
            </Badge>
         </IconButton>
         <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <Box sx={{ width: 380, maxHeight: 480, overflow: 'auto' }}>
               <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 1.5 }}>
                  <Typography variant='subtitle1'>Notifications</Typography>
                  <Button size='small' onClick={markAllRead} disabled={!unreadCount}>Mark all read</Button>
               </Stack>
               <Divider />
               {loading ? (
                  <Typography variant='body2' sx={{ p: 2 }}>Loading…</Typography>
               ) : items.length === 0 ? (
                  <Typography variant='body2' sx={{ p: 2 }} color='text.secondary'>You're all caught up.</Typography>
               ) : (
                  <List dense disablePadding>
                     {items.map(item => (
                        <ListItemButton key={item.notification_id} onClick={() => handleClick(item)} sx={{ alignItems: 'flex-start', backgroundColor: item.read_at ? 'transparent' : 'action.hover' }}>
                           <ListItemText
                              primary={item.title}
                              secondary={
                                 <Stack>
                                    <Typography variant='caption' color='text.secondary'>{item.body}</Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                       {new Date(item.created_at).toLocaleString()}
                                    </Typography>
                                 </Stack>
                              }
                           />
                        </ListItemButton>
                     ))}
                  </List>
               )}
            </Box>
         </Popover>
      </>
   );
}
