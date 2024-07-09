// RowDataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const RowDataContext = createContext();

export const useRowData = () => {
   return useContext(RowDataContext);
};

export const RowDataProvider = ({ children }) => {
   const [rowData, setRowData] = useState(null);
   const location = useLocation();
   const { state } = location;

   useEffect(() => {
      if (state?.rowData) {
         setRowData(state.rowData);
      }
   }, [state]);

   return <RowDataContext.Provider value={{ rowData, setRowData }}>{children}</RowDataContext.Provider>;
};
