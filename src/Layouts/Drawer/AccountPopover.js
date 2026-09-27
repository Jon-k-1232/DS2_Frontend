import { Icon } from '@iconify/react';
import { useRef, useState } from 'react';
import homeFill from '@iconify/icons-eva/home-fill';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { Box, Divider, MenuItem, MenuList, Typography, Avatar, IconButton } from '@mui/material';
import MenuPopover from '../../Components/MenuPopover';
import TokenService from '../../Services/TokenService';
import { postLogout } from '../../Services/ApiCalls/PostCalls';
import { useContext } from 'react';
import { context } from '../../App';
import { getDefaultLandingRoute } from '../../utils/navigation';

const MENU_OPTIONS = [
   {
      label: 'Home',
      icon: homeFill,
      linkTo: '/clients'
   }
];

export default function AccountPopover() {
   const navigate = useNavigate();
   const anchorRef = useRef(null);
   const [open, setOpen] = useState(false);
   const { loggedInUser, setLoggedInUser } = useContext(context);

   const handleOpen = () => {
      setOpen(true);
   };
   const handleClose = () => {
      setOpen(false);
   };

   const handleLogout = async () => {
      // Clear the server-side httpOnly cookie, then local state.
      await postLogout();
      TokenService.handleLogout();
      setLoggedInUser({
         accountID: null,
         userID: null,
         displayName: null,
         role: null,
         accessLevel: null,
         token: null
      });
      navigate('/login');
   };

   return (
      <>
         <IconButton
            ref={anchorRef}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? "account-menu" : undefined}
            onClick={handleOpen}
            sx={{
               padding: 0,
               width: 44,
               height: 44,
               ...(open && {
                  '&:before': {
                     zIndex: 1,
                     content: "''",
                     width: '100%',
                     height: '100%',
                     borderRadius: '50%',
                     position: 'absolute',
                     bgcolor: theme => alpha(theme.palette.grey[900], 0.72)
                  }
               })
            }}
         >
            <Avatar alt={loggedInUser.displayName || 'Account'} />
         </IconButton>

         <MenuPopover id="account-menu" open={open} onClose={handleClose} anchorEl={anchorRef.current} sx={{ width: 220 }}>
            <Box sx={{ my: 1.5, px: 2.5 }}>
               <Typography variant='subtitle1' noWrap>
                  {loggedInUser.displayName}
               </Typography>
               <Typography variant='body2' sx={{ color: 'text.secondary' }} noWrap>
                  {loggedInUser.role}
               </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <MenuList autoFocusItem={open} aria-label='Account actions' onKeyDown={event => {
               if (event.key === 'Tab') { event.preventDefault(); handleClose(); }
            }}>
            {MENU_OPTIONS.map(option => (
               <MenuItem key={option.label} to={option.label === 'Home' ? getDefaultLandingRoute(loggedInUser.accessLevel) : option.linkTo} component={RouterLink} onClick={handleClose} sx={{ typography: 'body2', py: 1, px: 2.5 }}>
                  <Box
                     component={Icon}
                     icon={option.icon}
                     sx={{
                        mr: 2,
                        width: 24,
                        height: 24
                     }}
                  />

                  {option.label}
               </MenuItem>
            ))}

            <Divider />
            <MenuItem onClick={handleLogout}>Log out</MenuItem>
            </MenuList>
         </MenuPopover>
      </>
   );
}
