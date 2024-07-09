import { Box, Tab } from '@mui/material';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageNavigationHeader({ menuOptions, onClickNavigation }) {
  const [value, setValue] = useState('0');
  const location = useLocation();

  useEffect(() => {
    const optionIndex = menuOptions.findIndex(option => option.route === location.pathname);
    setValue(optionIndex.toString());
  }, [location, menuOptions]);

  return (
    <TabContext value={value}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <TabList
          variant='scrollable'
          scrollButtons='auto'
          onChange={(e, val) => {
            const selectedOption = menuOptions[val];
            if (selectedOption.onClick) {
              selectedOption.onClick();
            }
            onClickNavigation({ route: selectedOption.route, value: selectedOption.value });
            setValue(val);
          }}
        >
          {menuOptions.map((option, i) => (
            <Tab key={i} value={`${i}`} label={option.display} />
          ))}
        </TabList>
      </Box>
    </TabContext>
  );
}
