import React, { useState, useContext, createContext, useCallback } from 'react';
import { Box, Collapse, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Custom hook for toggling open/close state
const useToggle = (initialState = false) => {
   const [isToggled, setToggle] = useState(initialState);
   const toggle = useCallback(() => setToggle(prev => !prev), []);
   return [isToggled, toggle];
};

// Context for passing headers
const HeaderContext = createContext();

const CollapsibleRow = ({ row, children, isSubRow = false }) => {
   const [open, toggle] = useToggle();
   const headers = useContext(HeaderContext);
   return (
      <>
         <TableRow>
            {!isSubRow && (
               <TableCell>
                  <IconButton aria-label='expand row' size='small' onClick={toggle}>
                     {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
               </TableCell>
            )}
            <TableCell component='th' scope='row'>
               {row.customer || row.display_name}
            </TableCell>
            <TableCell align='right'>{row.time}</TableCell>
         </TableRow>
         <TableRow>
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
               <Collapse in={open} timeout='auto' unmountOnExit>
                  {children}
               </Collapse>
            </TableCell>
         </TableRow>
      </>
   );
};

const ClientRow = ({ row }) => {
   return (
      <CollapsibleRow row={row} isSubRow>
         <Box margin={1}>
            <Table size='small' aria-label='jobs'>
               <TableBody>
                  {row.jobs.map((job, i) => (
                     <TableRow key={i}>
                        <TableCell component='th' scope='row'>
                           {job.job}
                        </TableCell>
                        <TableCell align='right'>{job.time}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </Box>
      </CollapsibleRow>
   );
};

export const CollapsibleTable = ({ data }) => {
   const expandableHeaders = {
      headerOne: 'Job',
      headerTwo: 'Time'
   };

   return (
      <TableContainer component={Paper}>
         <HeaderContext.Provider value={expandableHeaders}>
            <Table aria-label='collapsible table'>
               <TableHead>
                  <TableRow>
                     <TableCell />
                     <TableCell>Employee</TableCell>
                     <TableCell align='right'>Total Hours</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {data.map((userTime, index) => (
                     <CollapsibleRow key={index} row={userTime.user}>
                        <Box margin={1}>
                           <Table size='small' aria-label='customers'>
                              <TableBody>
                                 {userTime.customers.map((customer, i) => (
                                    <ClientRow key={i} row={customer} />
                                 ))}
                              </TableBody>
                           </Table>
                        </Box>
                     </CollapsibleRow>
                  ))}
               </TableBody>
            </Table>
         </HeaderContext.Provider>
      </TableContainer>
   );
};
