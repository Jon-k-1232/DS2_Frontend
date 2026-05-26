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
      // Only accept rowData that looks like a customer record (has customer_id and
      // does NOT look like a job/invoice/transaction row).  This prevents navigating
      // to a sub-page (e.g. job delete form) from overwriting the customer context
      // so that clicking Back still restores the correct profile.
      if (state?.rowData && state.rowData.customer_id != null && state.rowData.customer_job_id == null) {
         setRowData(state.rowData);
      }
   }, [state]);

   return <RowDataContext.Provider value={{ rowData, setRowData }}>{children}</RowDataContext.Provider>;
};
