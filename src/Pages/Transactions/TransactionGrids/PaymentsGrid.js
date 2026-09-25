import { Stack, TextField, InputAdornment } from '@mui/material';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import Payment from '../TransactionForms/AddTransaction/Payment';
import PaymentIcon from '@mui/icons-material/Payment';
import SearchIcon from '@mui/icons-material/Search';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPayments } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function PaymentsGrid({ customerData, setCustomerData }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [gridData, setGridData] = useState({ rows: [], columns: [], totalCount: 0 });
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
   const [loading, setLoading] = useState(false);
   const [searchInput, setSearchInput] = useState('');
   const [searchTerm, setSearchTerm] = useState('');

   // Request counter + a ref mirroring the live search input: a page fetch
   // resolving after a newer one (or after the user has since typed something
   // else) must be dropped instead of overwriting fresher rows/input. Both are
   // refs, not state, so reading them inside an in-flight fetchPageData call
   // always sees the CURRENT value rather than whatever was captured in that
   // call's closure.
   const requestRef = useRef(0);
   const currentSearchRef = useRef(searchInput);
   currentSearchRef.current = searchInput;
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
            placeholder='Search payments'
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
            aria-label='Search payments'
         />
      ),
      [searchInput, stopToolbarKeyEvent]
   );

   const gridButtons = [
      {
         dialogTitle: 'New Payment',
         tooltipText: 'New Payment',
         icon: () => <PaymentIcon style={{ color: palette.primary.main }} />,
         component: () => <Payment customerData={customerData} setCustomerData={data => setCustomerData(data)} dialogSize='xl' />
      }
   ];

   const arrayOfColumnNames = [
      'payment_id',
      'customer_id',
      'customer_name',
      'payment_date',
      'payment_amount',
      'form_of_payment',
      'payment_reference_number',
      'customer_invoice_id',
      'customer_job_id',
      'retainer_id',
      'is_transaction_billable',
      'created_at',
      'created_by_user_name',
      'note'
   ];

   const getRowId = useCallback(row => row.payment_id || row.id, []);

   const applyFilteredGrid = (activePaymentsData, syncQuery = false) => {
      if (!activePaymentsData?.grid) return;
      const filteredGrid = filterGridByColumnName(activePaymentsData.grid, arrayOfColumnNames);
      const totalCount = activePaymentsData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;

      setGridData({ rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount });

      // Query controls (search input/term, pagination model) only ever hydrate
      // from the initial context-supplied page — a subsequent page response
      // must not resync them, or a still-in-flight older search's response
      // would stomp the search box the user is actively typing into.
      if (!syncQuery) return;
      const nextPageSize = activePaymentsData.pagination?.limit || activePaymentsData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activePaymentsData.pagination?.page || activePaymentsData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activePaymentsData.searchTerm ?? '';

      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      // The server trims the search term, so echoing it straight back into the
      // live input would drop a trailing space (or overwrite characters typed
      // since this fetch went out) on every keystroke's round trip. Only
      // resync the visible input when the server's value reflects something
      // OTHER than our own request's trim — a genuinely external change to
      // paymentsList (e.g. from another tab/page) — never our own echo.
      if (normalizedSearch !== searchTerm.trim()) {
         setSearchInput(normalizedSearch);
      }

      setPaginationModel(prev => {
         const nextModel = { page: nextPageIndex >= 0 ? nextPageIndex : 0, pageSize: nextPageSize };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   useEffect(() => {
      // Once this grid has already loaded its own page, a LATER change to
      // customerData?.paymentsList is a shared mutation from elsewhere (e.g.
      // the "New Payment" dialog writes its response straight into context) —
      // not necessarily shaped like, or scoped to, this grid's current
      // page/search. Re-fetch the grid's own current query instead of
      // rendering whatever page-shaped object the mutation happened to write.
      if (initializedRef.current) {
         fetchPageData(paginationModel.page + 1, paginationModel.pageSize, searchTerm);
         return;
      }
      const activePaymentsData = customerData?.paymentsList?.activePaymentsData;
      if (!activePaymentsData) return;
      applyFilteredGrid(activePaymentsData, true);
      initializedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [customerData?.paymentsList]);

   // Initial fetch on mount
   useEffect(() => {
      if (initializedRef.current) return;
      const hasData = Boolean(customerData?.paymentsList?.activePaymentsData);
      if (!hasData && accountID && userID && token) {
         fetchPageData(1, DEFAULT_PAGE_SIZE, '');
         initializedRef.current = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [accountID, userID, token]);

   const fetchPageData = async (page = paginationModel.page + 1, pageSize = paginationModel.pageSize, searchValue = searchTerm) => {
      if (!accountID || !userID || !token) return;
      // Tag this request, and remember the search it was fired for. Search A
      // and search AB can be in flight together (a debounced follow-up firing
      // before A's response lands) — if A resolves last, it's obsolete twice
      // over: it isn't the latest request AND the input has already moved on.
      const request = ++requestRef.current;
      setLoading(true);
      try {
         const response = await fetchPayments(accountID, userID, token, page, pageSize, searchValue);
         if (request !== requestRef.current || searchValue.trim() !== currentSearchRef.current.trim()) return;
         if (response?.paymentsList?.activePaymentsData) {
            const { paymentsList } = response;
            applyFilteredGrid(paymentsList.activePaymentsData);
            // Page results are grid-local (gridData state) — they must never be
            // written into the shared customerData.paymentsList context. That
            // context is for app-wide coordination (e.g. "something changed,
            // refetch"), not a place to park one page of one grid's own query;
            // writing a page there clobbers it for every other consumer.
         }
      } catch (error) {
         console.error('Error fetching payments:', error);
      } finally {
         if (request === requestRef.current) setLoading(false);
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


   // Listen for global payment updates and refresh grid
   useEffect(() => {
      const handler = () => {
         const { page, pageSize } = paginationModel;
         fetchPageData(page + 1, pageSize, searchTerm);
      };
      window.addEventListener('payments:updated', handler);
      return () => window.removeEventListener('payments:updated', handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [paginationModel.page, paginationModel.pageSize, searchTerm, accountID, userID, token]);

   return (
      <>
         <Stack spacing={3}>
            <PaginationGrid
               title='Payments'
               passedHeight={window.innerHeight - 140}
               tableData={gridData}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/transactions/customerPayments/deletePayment'}
               paginationModel={paginationModel}
               onPaginationModelChange={setPaginationModel}
               loading={loading}
               getRowId={getRowId}
               showQuickFilter={false}
               renderToolbarContent={() => searchField}
            />
         </Stack>
      </>
   );
}
