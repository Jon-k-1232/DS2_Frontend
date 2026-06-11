import { Stack, TextField, InputAdornment } from '@mui/material';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import NewCustomer from '../CustomerForms/AddCustomer/NewCustomer';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCustomers } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function Customers({ customerData, setCustomerData }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [gridData, setGridData] = useState({ rows: [], columns: [], totalCount: 0 });
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
   const [loading, setLoading] = useState(false);
   const [searchInput, setSearchInput] = useState('');
   const [searchTerm, setSearchTerm] = useState('');

   const initializedRef = useRef(false);
   const previousSearchTermRef = useRef('');
   const searchInputRef = useRef(null);

   useEffect(() => {
      const handler = setTimeout(() => setSearchTerm(prev => (prev === searchInput ? prev : searchInput)), SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(handler);
   }, [searchInput]);

   const stopToolbarKeyEvent = useCallback(event => {
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
   }, []);

   const searchField = useMemo(
      () => (
         <TextField
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={stopToolbarKeyEvent}
            onKeyDownCapture={stopToolbarKeyEvent}
            onKeyUp={stopToolbarKeyEvent}
            onKeyUpCapture={stopToolbarKeyEvent}
            onKeyPress={stopToolbarKeyEvent}
            placeholder='Search customers'
            size='small'
            variant='standard'
            inputRef={searchInputRef}
            InputProps={{
               startAdornment: (
                  <InputAdornment position='start'>
                     <SearchIcon fontSize='small' />
                  </InputAdornment>
               )
            }}
            sx={{ minWidth: 220, mr: 1 }}
            aria-label='Search customers'
         />
      ),
      [searchInput, stopToolbarKeyEvent]
   );

   const gridButtons = [
      {
         dialogTitle: 'New Customer',
         tooltipText: 'Add Customer',
         icon: () => <AddIcon style={{ color: palette.primary.main }} />,
         component: () => <NewCustomer customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = [
      'customer_id',
      'business_name',
      'customer_name',
      'display_name',
      'customer_street',
      'customer_city',
      'customer_state',
      'customer_zip',
      'customer_phone',
      'is_billable',
      'is_recurring',
      'is_customer_active'
   ];
   const getRowId = useCallback(row => row.customer_id || row.id, []);

   const applyFilteredGrid = activeCustomerData => {
      if (!activeCustomerData?.grid) return;
      const filteredGrid = filterGridByColumnName(activeCustomerData.grid, arrayOfColumnNames);
      const totalCount = activeCustomerData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;

      setGridData({ rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount });

      const nextPageSize = activeCustomerData.pagination?.limit || activeCustomerData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activeCustomerData.pagination?.page || activeCustomerData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activeCustomerData.searchTerm ?? '';

      setSearchInput(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));

      setPaginationModel(prev => {
         const nextModel = { page: nextPageIndex >= 0 ? nextPageIndex : 0, pageSize: nextPageSize };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   // First mount: always fetch a clean page 1 with no search.
   // Deliberately ignore any cached customersList that may have a stale
   // search term — otherwise navigating back from a customer profile
   // re-populates the search bar with the previous term, which triggers an
   // extra refetch and makes the table flicker between cached and fresh
   // results.
   useEffect(() => {
      if (initializedRef.current) return;
      if (!accountID || !userID || !token) return;
      initializedRef.current = true;
      previousSearchTermRef.current = '';
      fetchPageData(1, DEFAULT_PAGE_SIZE, '');
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [accountID, userID, token]);

   // After first mount, sync only the grid rows when the cached
   // customersList changes (e.g. an add/edit elsewhere updated it).
   // Do NOT touch searchInput/searchTerm/pagination — those are
   // user-driven now and must not be clobbered.
   useEffect(() => {
      if (!initializedRef.current) return;
      const activeCustomerData = customerData?.customersList?.activeCustomerData;
      if (!activeCustomerData?.grid) return;
      const filteredGrid = filterGridByColumnName(activeCustomerData.grid, arrayOfColumnNames);
      const totalCount = activeCustomerData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;
      setGridData(prev => {
         if (prev.totalCount === totalCount && prev.rows === filteredGrid.rows) return prev;
         return { rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount };
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [customerData?.customersList]);

   const fetchPageData = async (page = paginationModel.page + 1, pageSize = paginationModel.pageSize, searchValue = searchTerm) => {
      if (!accountID || !userID || !token) return;
      setLoading(true);
      try {
         const response = await fetchCustomers(accountID, userID, token, page, pageSize, searchValue);
         if (response?.customersList?.activeCustomerData) {
            const { customersList } = response;
            applyFilteredGrid(customersList.activeCustomerData);
            // Page data stays local to this grid. Writing it into the shared
            // customerData context replaced the full active-customers list
            // (initialBlob) with the current 20-row page, which silently
            // emptied the customer dropdowns on the payment/transaction/
            // write-off forms until the next full reload.
         }
      } catch (error) {
         console.error('Error fetching customers:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (!initializedRef.current) return;
      const { page, pageSize } = paginationModel;
      if (previousSearchTermRef.current !== searchTerm) {
         previousSearchTermRef.current = searchTerm;
         if (paginationModel.page !== 0) {
            setPaginationModel(prev => ({ ...prev, page: 0 }));
            return;
         }
      }
      fetchPageData(page + 1, pageSize, searchTerm);
      previousSearchTermRef.current = searchTerm;
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [paginationModel.page, paginationModel.pageSize, searchTerm]);

   useEffect(() => {
      if (!initializedRef.current) return;
      const input = searchInputRef.current;
      if (input && document.activeElement !== input) {
         input.focus({ preventScroll: true });
         const caret = input.value.length;
         input.setSelectionRange(caret, caret);
      }
   }, [gridData.rows, searchInput]);

   return (
      <>
         <Stack spacing={3}>
            <PaginationGrid
               title='Customers'
               tableData={gridData}
               checkboxSelection={false}
               arrayOfButtons={gridButtons}
               enableSingleRowClick
               rowSelectionOnly
               routeToPass={row => `/customers/customersList/customerProfile/${row.customer_id}/customerInvoices`}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               loading={loading}
               getRowId={getRowId}
               showQuickFilter={false}
               renderToolbarContent={() => searchField}
               passedHeight={window.innerHeight - 140}
            />
         </Stack>
      </>
   );
}
