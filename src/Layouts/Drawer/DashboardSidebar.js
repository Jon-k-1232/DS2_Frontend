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
import ServerStatus from './ServerStatus';

const DRAWER_WIDTH = 290;

const RootStyle = styled('div')(({ theme }) => ({
   [theme.breakpoints.up('lg')]: {
      flexShrink: 0,
      width: DRAWER_WIDTH
   }
}));

DashboardSidebar.propTypes = {
   isOpenSidebar: PropTypes.bool,
   onCloseSidebar: PropTypes.func
};

export default function DashboardSidebar({ isOpenSidebar, onCloseSidebar }) {
   const { pathname } = useLocation();

   useEffect(() => {
      if (isOpenSidebar) {
         onCloseSidebar();
      }
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
      <RootStyle>
         <MHidden width='lgUp'>
            <Drawer
               open={isOpenSidebar}
               onClose={onCloseSidebar}
               PaperProps={{
                  sx: { width: DRAWER_WIDTH }
               }}
            >
               {renderContent}
               <ServerStatus />
            </Drawer>
         </MHidden>

         <MHidden width='lgDown'>
            <Drawer
               open
               variant='persistent'
               PaperProps={{
                  sx: {
                     width: DRAWER_WIDTH,
                     bgcolor: 'background.drawerDefault'
                  }
               }}
            >
               {renderContent}
               <ServerStatus />
            </Drawer>
         </MHidden>
      </RootStyle>
   );
}
