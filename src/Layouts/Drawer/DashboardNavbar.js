import PropTypes from 'prop-types';
import { Icon } from '@iconify/react';
import menu2Fill from '@iconify/icons-eva/menu-2-fill';
import { alpha, styled } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import { MHidden } from '../../Components/@material-extend';
import AccountPopover from './AccountPopover';
import NotificationBell from '../../Components/Notifications/NotificationBell';
import theme from '../../Theme/typography';

const DRAWER_WIDTH = 290;
const APPBAR_MOBILE = 64;
const APPBAR_DESKTOP = 92;

const RootStyle = styled(AppBar, { shouldForwardProp: prop => prop !== 'desktopOpen' })(({ theme, desktopOpen }) => ({
  boxShadow: 'none',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)', // Fix on Mobile
  backgroundColor: alpha(theme.palette.background.default, 0.72),
  [theme.breakpoints.up('lg')]: {
    width: desktopOpen ? `calc(100% - ${DRAWER_WIDTH + 1}px)` : '100%',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter
    })
  }
}));

const ToolbarStyle = styled(Toolbar)(({ theme }) => ({
  minHeight: APPBAR_MOBILE,
  [theme.breakpoints.up('lg')]: {
    minHeight: APPBAR_DESKTOP,
    padding: theme.spacing(0, 5)
  }
}));

DashboardNavbar.propTypes = {
  desktopOpen: PropTypes.bool,
  onToggleMobileSidebar: PropTypes.func,
  onToggleDesktopSidebar: PropTypes.func,
  pageTitle: PropTypes.string
};

export default function DashboardNavbar({ desktopOpen, onToggleMobileSidebar, onToggleDesktopSidebar, pageTitle }) {
  return (
    <RootStyle desktopOpen={desktopOpen}>
      <ToolbarStyle>
        <MHidden width='lgUp'>
          <IconButton onClick={onToggleMobileSidebar} sx={{ mr: 1, color: 'text.primary' }} aria-label='Toggle menu'>
            <Icon icon={menu2Fill} />
          </IconButton>
        </MHidden>

        <MHidden width='lgDown'>
          <IconButton
            onClick={onToggleDesktopSidebar}
            sx={{ mr: 1, color: 'text.primary' }}
            aria-label={desktopOpen ? 'Hide menu' : 'Show menu'}
          >
            <Icon icon={menu2Fill} />
          </IconButton>
        </MHidden>

        <Typography sx={{ color: 'black', ...theme.h3 }}>{pageTitle}</Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction='row' alignItems='center' spacing={{ xs: 0.5, sm: 1.5 }}>
          <NotificationBell />
          <AccountPopover />
        </Stack>
      </ToolbarStyle>
    </RootStyle>
  );
}
