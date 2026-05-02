import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Box, Drawer } from '@mui/material';
import Logo from '../../Components/Logo';
import Scrollbar from '../../Components/Scrollbar';
import NavSection from '../../Components/NavSection';
import { MHidden } from '../../Components/@material-extend';
import sidebarRoutes from '../../Routes/SidebarRoutes';
// ServerStatus component removed - health checks now handled by AWS

const DRAWER_WIDTH = 290;

const RootStyle = styled('div', { shouldForwardProp: prop => prop !== 'isDesktopOpen' })(({ theme, isDesktopOpen }) => ({
   [theme.breakpoints.up('lg')]: {
      flexShrink: 0,
      width: isDesktopOpen ? DRAWER_WIDTH : 0,
      transition: theme.transitions.create('width', {
         easing: theme.transitions.easing.sharp,
         duration: theme.transitions.duration.shorter
      })
   }
}));

DashboardSidebar.propTypes = {
   isMobileOpen: PropTypes.bool,
   isDesktopOpen: PropTypes.bool,
   onCloseMobile: PropTypes.func,
   onCloseDesktop: PropTypes.func
};

export default function DashboardSidebar({ isMobileOpen, isDesktopOpen, onCloseMobile, onCloseDesktop }) {
   const { pathname } = useLocation();

   // Auto-close the mobile (modal) drawer on route change so it doesn't cover content.
   // Desktop drawer is persistent — preserve its state across navigation.
   useEffect(() => {
      if (isMobileOpen) onCloseMobile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [pathname]);

   const renderContent = (
      <Scrollbar
         sx={{
            overflowY: 'scroll',
            height: '100%',
            backgroundColor: '#1c2536',
            '& .simplebar-content': {
               height: '100%',
               display: 'flex',
               flexDirection: 'column'
            }
         }}
      >
         <Box sx={{ px: 2.5, py: 3 }}>
            <Box component={RouterLink} to='/customers/customersList' sx={{ display: 'inline-flex', textDecoration: 'none' }}>
               <Logo />
            </Box>
         </Box>

         <NavSection navConfig={sidebarRoutes} />

         <Box sx={{ flexGrow: 1 }} />
      </Scrollbar>
   );

   return (
      <RootStyle isDesktopOpen={isDesktopOpen}>
         <MHidden width='lgUp'>
            <Drawer
               open={isMobileOpen}
               onClose={onCloseMobile}
               PaperProps={{
                  sx: { width: DRAWER_WIDTH }
               }}
            >
               {renderContent}
            </Drawer>
         </MHidden>

         <MHidden width='lgDown'>
            <Drawer
               open={isDesktopOpen}
               onClose={onCloseDesktop}
               variant='persistent'
               PaperProps={{
                  sx: {
                     width: DRAWER_WIDTH,
                     bgcolor: 'background.drawerDefault'
                  }
               }}
            >
               {renderContent}
            </Drawer>
         </MHidden>
      </RootStyle>
   );
}
