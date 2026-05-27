import { styled } from '@mui/material/styles';
import { Card, Stack, Container, Typography, Paper } from '@mui/material';
import AuthLayout from '../../Layouts/AuthLayout';
import Page from '../../Components/Page';
import { MHidden } from '../../Components/@material-extend';
import LoginForm from './LoginForm';

const RootStyle = styled(Page)(({ theme }) => ({
   [theme.breakpoints.up('md')]: {
      display: 'flex'
   },
   minHeight: '100vh',
   background: theme.palette.grey[100]
}));

const SectionStyle = styled(Card)(({ theme }) => ({
   width: '100%',
   maxWidth: 464,
   display: 'flex',
   flexDirection: 'column',
   justifyContent: 'center',
   margin: theme.spacing(2, 0, 2, 2),
   borderRadius: theme.spacing(2),
   position: 'relative'
}));

const ContentStyle = styled('div')(({ theme }) => ({
   maxWidth: 480,
   margin: 'auto',
   display: 'flex',
   minHeight: '100vh',
   flexDirection: 'column',
   justifyContent: 'center',
   padding: theme.spacing(12, 2)
}));

const LoginCard = styled(Paper)(({ theme }) => ({
   padding: theme.spacing(6, 4),
   borderRadius: theme.spacing(2),
   border: `1px solid ${theme.palette.grey[200]}`,
   boxShadow: '0 24px 48px -8px rgba(145, 158, 171, 0.12)'
}));

const BottomTypography = styled(Typography)(({ theme }) => ({
   position: 'absolute',
   bottom: theme.spacing(1),
   left: '15px',
   fontSize: '0.75rem'
}));

// ----------------------------------------------------------------------

export default function Login({ appVersion }) {
   const showVersion = appVersion && appVersion !== 'Unknown';

   return (
      <RootStyle title='DS | 2'>
         <AuthLayout />

         <MHidden width='mdDown'>
            <SectionStyle>
               <Typography variant='h3' sx={{ px: 5, mt: 10, mb: 5 }}>
                  Hi, Welcome Back
               </Typography>
               {showVersion && (
                  <BottomTypography variant='body2' sx={{ mb: 1 }}>
                     v {appVersion}
                  </BottomTypography>
               )}
            </SectionStyle>
         </MHidden>

         <Container maxWidth='sm'>
            <ContentStyle>
               <LoginCard elevation={0}>
                  <Stack sx={{ mb: 4, textAlign: 'center' }} spacing={1}>
                     <Typography variant='h4' sx={{ fontWeight: 600 }}>
                        Sign in to DS2
                     </Typography>
                     <Typography sx={{ color: 'text.secondary' }}>Use your @jimkimmel.com Google account.</Typography>
                  </Stack>

                  <LoginForm />
               </LoginCard>
            </ContentStyle>
         </Container>
      </RootStyle>
   );
}
