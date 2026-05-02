import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import DashboardNavbar from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';
import PrivateRoute from '../../Routes/PrivateRoute';

const APP_BAR_MOBILE = 64;
const APP_BAR_DESKTOP = 92;
const DESKTOP_OPEN_STORAGE_KEY = 'ds2:desktopSidebarOpen';

const RootStyle = styled('div')({
   display: 'flex',
   minHeight: '100%',
   overflow: 'hidden'
});

const MainStyle = styled('div')(({ theme }) => ({
   flexGrow: 1,
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

export default function DashboardLayout({ pageTitle }) {
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
         <DashboardNavbar
            pageTitle={pageTitle}
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
         <MainStyle>
            <PrivateRoute />
         </MainStyle>
      </RootStyle>
   );
}
