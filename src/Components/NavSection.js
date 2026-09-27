import icon0 from '@iconify/icons-eva/people-fill';
import icon1 from '@iconify/icons-eva/clock-fill';
import icon2 from '@iconify/icons-eva/file-text-fill';
import icon3 from '@iconify/icons-eva/credit-card-fill';
import icon4 from '@iconify/icons-eva/pie-chart-fill';
import icon5 from '@iconify/icons-eva/bar-chart-fill';
import icon6 from '@iconify/icons-eva/calendar-fill';
import icon7 from '@iconify/icons-eva/settings-fill';
import icon8 from '@iconify/icons-eva/arrow-ios-downward-fill';
import icon9 from '@iconify/icons-eva/arrow-ios-forward-fill';
import { useEffect, useId, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { pageForPath } from '../Routes/SidebarRoutes';

const icons={'eva:people-fill':icon0,'eva:clock-fill':icon1,'eva:file-text-fill':icon2,'eva:credit-card-fill':icon3,'eva:pie-chart-fill':icon4,'eva:bar-chart-fill':icon5,'eva:calendar-fill':icon6,'eva:settings-fill':icon7,'eva:arrow-ios-downward-fill':icon8,'eva:arrow-ios-forward-fill':icon9};

function NavGroup({group,pathname}) {
 const active=pageForPath(pathname);
 const selected=group.children.some(page=>page.path===active?.path);
 const [open,setOpen]=useState(selected);
 const id=useId();
 useEffect(()=>{if(selected)setOpen(true);},[selected,pathname]);
 return <>
  <ListItemButton component='button' type='button' aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}
   sx={{width:'100%',textAlign:'left',minHeight:48,px:2,color:selected?'primary.light':'grey.100'}}>
   <ListItemIcon sx={{minWidth:34,color:'inherit'}}><Icon icon={icons[group.icon]} width={22}/></ListItemIcon>
   <ListItemText primary={group.title}/><Icon icon={open?icon8:icon9} width={18}/>
  </ListItemButton>
  <Collapse in={open} timeout='auto' unmountOnExit id={id}>
   <List component='div' disablePadding aria-label={group.title}>
    {group.children.map(page=><ListItemButton key={page.path} component={Link} to={page.path}
     aria-current={active?.path===page.path?'page':undefined} selected={active?.path===page.path}
     sx={{pl:6,pr:2,minHeight:44,color:active?.path===page.path?'primary.light':'grey.300'}}>
     <ListItemText primary={page.title}/>
    </ListItemButton>)}
   </List>
  </Collapse>
 </>;
}
export default function NavSection({navConfig,...other}) {
 const {pathname}=useLocation();
 return <Box component='nav' aria-label='Primary navigation' {...other}><List disablePadding>
  {navConfig.map(group=><NavGroup key={group.title} group={group} pathname={pathname}/>)}
 </List></Box>;
}
