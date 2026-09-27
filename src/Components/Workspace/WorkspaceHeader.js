import { useContext, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Breadcrumbs, Button, Stack, Typography } from '@mui/material';
import { context } from '../../App';
import { canOpenPage, pageForPath } from '../../Routes/SidebarRoutes';
import { helpForPath } from '../../help/pageHelp';
import PageHelpButton from './PageHelpButton';

export default function WorkspaceHeader() {
 const {pathname}=useLocation();
 const {loggedInUser}=useContext(context);
 const help=helpForPath(pathname);
 const page=pageForPath(pathname) || (help && {title:help.title,group:'Workspace',path:pathname});
 useLayoutEffect(()=>{
  document.title=`${page?.title || 'DS2'} | DS2`;
  if(document.activeElement?.getAttribute('role')!=='tab') document.getElementById('main-content')?.focus({preventScroll:true});
 },[pathname,page?.title]);
 if(!page)return null;
 return <Stack spacing={1.5} sx={{px:{xs:2,md:3},py:2,borderBottom:1,borderColor:'divider'}}>
  <Stack direction='row' alignItems='center' justifyContent='space-between' gap={2}><Breadcrumbs aria-label='Breadcrumbs'>
   <Typography color='text.secondary'>{page.group}</Typography>
   {pathname===page.path?<Typography color='text.primary'>{page.title}</Typography>:<Link to={page.path}>{page.title}</Link>}
   {pathname!==page.path && <Typography color='text.primary'>Details</Typography>}
  </Breadcrumbs><PageHelpButton key={pathname} help={help}/></Stack>
  {canOpenPage(loggedInUser,'manager') && <Box component='nav' aria-label='Quick actions' sx={{'& .MuiButton-root':{color:'primary.dark'}}}>
   <Stack direction='row' useFlexGap flexWrap='wrap' gap={1}>
    <Button component={Link} to='/work/entries?entry=time' size='small' variant='outlined'>Enter time</Button>
    <Button component={Link} to='/billing/create' size='small'>Create invoices</Button>
    <Button component={Link} to='/payments/receive' size='small'>Receive payment</Button>
    <Button component={Link} to='/billing/recurring' size='small'>Recurring plans</Button>
   </Stack>
  </Box>}
 </Stack>;
}
