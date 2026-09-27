import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import DashboardNavbar from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';
import WorkspaceHeader from '../../Components/Workspace/WorkspaceHeader';
import { useLocation } from 'react-router-dom';
import { pageForPath } from '../../Routes/SidebarRoutes';
import { Alert, Box, Button } from '@mui/material';
import PrivateRoute from '../../Routes/PrivateRoute';

const APP_BAR_MOBILE = 64;
const APP_BAR_DESKTOP = 92;
const DESKTOP_OPEN_STORAGE_KEY = 'ds2:desktopSidebarOpen';

const RootStyle = styled('div')({
   display: 'flex',
   minHeight: '100%',
   overflow: 'hidden'
});

const MainStyle = styled('main')(({ theme }) => ({
   flexGrow: 1,
   minWidth: 0,
   overflow: 'auto',
   minHeight: '100%',
   paddingTop: APP_BAR_MOBILE,
   paddingBottom: 0,
   [theme.breakpoints.up('lg')]: {
      paddingTop: APP_BAR_DESKTOP,
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2)
   }
}));

export default function DashboardLayout({ pageTitle, referenceLoading, referenceError, retryReference }) {
   const {pathname}=useLocation();
   const currentPage=pageForPath(pathname);
   const [mobileOpen, setMobileOpen] = useState(false);
   const [desktopOpen, setDesktopOpen] = useState(() => {
      try {
         const stored = window.localStorage.getItem(DESKTOP_OPEN_STORAGE_KEY);
         return stored == null ? true : stored === '1';
      } catch {
         return true;
      }
   });

   useEffect(() => {
      try { window.localStorage.setItem(DESKTOP_OPEN_STORAGE_KEY, desktopOpen ? '1' : '0'); } catch {}
   }, [desktopOpen]);

   return (
      <RootStyle>
         <Box component='a' href='#main-content' sx={{position:'fixed',top:8,left:8,zIndex:2000,p:1,bgcolor:'background.paper',transform:'translateY(-200%)','&:focus':{transform:'none'}}}>Skip to content</Box>
         <DashboardNavbar
            pageTitle={currentPage?.title || pageTitle}
            desktopOpen={desktopOpen}
            onToggleMobileSidebar={() => setMobileOpen(o => !o)}
            onToggleDesktopSidebar={() => setDesktopOpen(o => !o)}
         />
         <DashboardSidebar
            isMobileOpen={mobileOpen}
            isDesktopOpen={desktopOpen}
            onCloseMobile={() => setMobileOpen(false)}
            onCloseDesktop={() => setDesktopOpen(false)}
         />
         <MainStyle id='main-content' tabIndex={-1}>
            <WorkspaceHeader/>
            {referenceLoading && <Box role='status' sx={{px:3,py:1}}>Loading reference lists…</Box>}
            {referenceError && <Alert severity='error'>{referenceError}<Button onClick={retryReference}>Reload reference lists</Button></Alert>}

            <PrivateRoute />
         </MainStyle>
      </RootStyle>
   );
}
