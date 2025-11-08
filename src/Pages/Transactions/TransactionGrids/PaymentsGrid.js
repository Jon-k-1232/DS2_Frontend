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

   const applyFilteredGrid = activePaymentsData => {
      if (!activePaymentsData?.grid) return;
      const filteredGrid = filterGridByColumnName(activePaymentsData.grid, arrayOfColumnNames);
      const totalCount = activePaymentsData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;

      setGridData({ rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount });

      const nextPageSize = activePaymentsData.pagination?.limit || activePaymentsData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activePaymentsData.pagination?.page || activePaymentsData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activePaymentsData.searchTerm ?? '';

      setSearchInput(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));

      setPaginationModel(prev => {
         const nextModel = { page: nextPageIndex >= 0 ? nextPageIndex : 0, pageSize: nextPageSize };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   useEffect(() => {
      const activePaymentsData = customerData?.paymentsList?.activePaymentsData;
      if (!activePaymentsData) return;
      applyFilteredGrid(activePaymentsData);
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
      setLoading(true);
      try {
         const response = await fetchPayments(accountID, userID, token, page, pageSize, searchValue);
         if (response?.paymentsList?.activePaymentsData) {
            const { paymentsList } = response;
            applyFilteredGrid(paymentsList.activePaymentsData);
            setCustomerData(prev => ({ ...prev, paymentsList }));
         }
      } catch (error) {
         console.error('Error fetching payments:', error);
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
