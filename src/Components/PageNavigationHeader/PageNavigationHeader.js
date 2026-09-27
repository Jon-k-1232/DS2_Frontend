import { Box, Tab } from '@mui/material';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import { Link, useLocation } from 'react-router-dom';

export default function PageNavigationHeader({ menuOptions, onClickNavigation }) {
 const {pathname} = useLocation();
 const active=menuOptions.find(option=>option.route===pathname);
 if(!menuOptions.length)return null;
 return <TabContext value={active?.route || menuOptions[0].route}>
  <Box sx={{borderBottom:1,borderColor:'divider',minWidth:0}}>
   <TabList aria-label='Page sections' variant='scrollable' scrollButtons='auto' allowScrollButtonsMobile>
    {menuOptions.map(option=><Tab key={option.route} value={option.route} component={Link} to={option.route}
     label={option.display} onClick={()=>onClickNavigation?.({route:option.route,value:option.value})}/>) }
   </TabList>
  </Box>
 </TabContext>;
}
