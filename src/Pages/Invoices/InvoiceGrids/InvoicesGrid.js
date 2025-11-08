import { Stack, TextField, InputAdornment } from '@mui/material';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import SearchIcon from '@mui/icons-material/Search';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchInvoices } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function InvoicesGrid({ customerData, setCustomerData }) {
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
            placeholder='Search invoices'
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
            aria-label='Search invoices'
         />
      ),
      [searchInput, stopToolbarKeyEvent]
   );

   const arrayOfColumnNames = [
      'customer_invoice_id',
      'parent_invoice_id',
      'customer_name',
      'invoice_number',
      'invoice_date',
      'due_date',
      'beginning_balance',
      'total_payments',
      'total_charges',
      'total_write_offs',
      'total_retainers',
      'total_amount_due',
      'remaining_balance_on_invoice',
      'is_invoice_paid_in_full',
      'fully_paid_date',
      'created_at',
      'created_by_user_name'
   ];

   const applyFilteredGrid = activeInvoiceData => {
      if (!activeInvoiceData?.grid) return;
      const filteredGrid = filterGridByColumnName(activeInvoiceData.grid, arrayOfColumnNames);
      const totalCount = activeInvoiceData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;
      setGridData({ rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount });

      const nextPageSize = activeInvoiceData.pagination?.limit || activeInvoiceData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activeInvoiceData.pagination?.page || activeInvoiceData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activeInvoiceData.searchTerm ?? '';

      setSearchInput(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));

      setPaginationModel(prev => {
         const nextModel = { page: nextPageIndex >= 0 ? nextPageIndex : 0, pageSize: nextPageSize };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   useEffect(() => {
      const activeInvoiceData = customerData?.invoicesList?.activeInvoiceData;
      if (!activeInvoiceData) return;
      applyFilteredGrid(activeInvoiceData);
      initializedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [customerData?.invoicesList]);

   // Initial fetch on mount
   useEffect(() => {
      if (initializedRef.current) return;
      const hasData = Boolean(customerData?.invoicesList?.activeInvoiceData);
      if (!hasData && accountID && userID && token) {
         fetchPageData(1, DEFAULT_PAGE_SIZE, '');
         initializedRef.current = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [accountID, userID, token]);

   const fetchPageData = async (page = paginationModel.page + 1, pageSize = paginationModel.pageSize, searchValue = searchTerm) => {
      if (!accountID || !userID || !token) return;
      setLoading(true);
      try {
         const response = await fetchInvoices(accountID, userID, token, page, pageSize, searchValue);
         if (response?.invoicesList?.activeInvoiceData) {
            const { invoicesList } = response;
            applyFilteredGrid(invoicesList.activeInvoiceData);
            setCustomerData?.(prev => ({ ...prev, invoicesList }));
         }
      } catch (error) {
         console.error('Error fetching invoices:', error);
      } finally {
         setLoading(false);
      }
   };

   // React to pagination and search changes
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

   // Focus the search input after data loads
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
               title='Invoices'
               passedHeight={window.innerHeight - 140}
               tableData={gridData}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               routeToPass={'/invoices/invoices/invoiceDetail/invoiceTransactions'}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               loading={loading}
               showQuickFilter={false}
               renderToolbarContent={() => searchField}
            />
         </Stack>
      </>
   );
}
