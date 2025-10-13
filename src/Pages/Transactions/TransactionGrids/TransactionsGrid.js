import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Stack, TextField, InputAdornment } from '@mui/material';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import ServerExportMenu from '../../../Components/DataGrids/ServerExportMenu';
import Charge from '../TransactionForms/AddTransaction/Charge';
import Time from '../TransactionForms/AddTransaction/Time';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import SearchIcon from '@mui/icons-material/Search';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { fetchTransactions, exportAllTransactions } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const TRANSACTION_COLUMNS = [
   'transaction_id',
   'customer_id',
   'customer_name',
   'transaction_type',
   'quantity',
   'unit_cost',
   'total_transaction',
   'customer_invoice_id',
   'retainer_id',
   'is_transaction_billable',
   'is_excess_to_subscription',
   'transaction_date',
   'created_at',
   'logged_for_user_name',
   'job_description',
   'general_work_description',
   'detailed_work_description'
];

export default function TransactionsGrid({ customerData, setCustomerData }) {
   const { accountID, userID, token } = useContext(context).loggedInUser;

   const [gridData, setGridData] = useState({ rows: [], columns: [], totalCount: 0 });
   const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
   const [loading, setLoading] = useState(false);
   const [exportingAll, setExportingAll] = useState(false);
   const [searchInput, setSearchInput] = useState('');
   const [searchTerm, setSearchTerm] = useState('');

   const initializedRef = useRef(false);
   const previousSearchTermRef = useRef('');
   const searchInputRef = useRef(null);

   useEffect(() => {
      const handler = setTimeout(() => {
         setSearchTerm(prev => (prev === searchInput ? prev : searchInput));
      }, SEARCH_DEBOUNCE_MS);

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
            placeholder='Search transactions'
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
            aria-label='Search transactions'
         />
      ),
      [searchInput, stopToolbarKeyEvent]
   );

   const gridButtons = [
      {
         dialogTitle: 'New Charge',
         tooltipText: 'New Charge',
         icon: () => <LibraryAddIcon style={{ color: palette.primary.main }} />,
         component: () => <Charge customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      },
      {
         dialogTitle: 'Add Time',
         tooltipText: 'Add Time',
         icon: () => <MoreTimeIcon style={{ color: palette.primary.main }} />,
         component: () => <Time customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const getTransactionRowId = useCallback(row => row.transaction_id || row.id, []);

   const applyFilteredGrid = activeTransactionsData => {
      if (!activeTransactionsData?.grid) return;

      const filteredGrid = filterGridByColumnName(activeTransactionsData.grid, TRANSACTION_COLUMNS);
      const totalCount = activeTransactionsData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;

      setGridData({
         rows: filteredGrid.rows,
         columns: filteredGrid.columns,
         totalCount
      });

      const nextPageSize = activeTransactionsData.pagination?.limit || activeTransactionsData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activeTransactionsData.pagination?.page || activeTransactionsData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activeTransactionsData.searchTerm ?? '';

      setSearchInput(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));

      setPaginationModel(prev => {
         const nextModel = {
            page: nextPageIndex >= 0 ? nextPageIndex : 0,
            pageSize: nextPageSize
         };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   useEffect(() => {
      const activeTransactionsData = customerData?.transactionsList?.activeTransactionsData;
      if (!activeTransactionsData) return;

      applyFilteredGrid(activeTransactionsData);
      initializedRef.current = true;
   }, [customerData?.transactionsList]);

   const handleExportAllTransactions = useCallback(async () => {
      if (!accountID || !userID || !token) return;
      setExportingAll(true);
      try {
         const normalizedSearch = searchTerm.trim();
         await exportAllTransactions(accountID, userID, token, normalizedSearch);
      } catch (error) {
         console.error('Error exporting all transactions:', error);
         window.alert('Unable to export all transactions. Please try again.');
      } finally {
         setExportingAll(false);
      }
   }, [accountID, userID, token, searchTerm]);

   const renderExportComponent = useCallback(
      () => (
         <ServerExportMenu
            onExportAll={handleExportAllTransactions}
            exportingAll={exportingAll}
            labels={{ exportAll: 'Export All Transactions', exportFiltered: 'Export Available', print: 'Print' }}
         />
      ),
      [handleExportAllTransactions, exportingAll]
   );

   const fetchPageData = async (page = paginationModel.page + 1, pageSize = paginationModel.pageSize, searchValue = searchTerm) => {
      if (!accountID || !userID || !token) return;

      setLoading(true);
      try {
         const response = await fetchTransactions(accountID, userID, token, page, pageSize, searchValue);

         if (response?.transactionsList?.activeTransactionsData) {
            const { transactionsList } = response;
            applyFilteredGrid(transactionsList.activeTransactionsData);
            setCustomerData(prev => ({ ...prev, transactionsList }));
         }
      } catch (error) {
         console.error('Error fetching transactions:', error);
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
      <Stack spacing={3}>
         <PaginationGrid
            title='Charges and Time'
            tableData={gridData}
            checkboxSelection={false}
            enableSingleRowClick
            rowSelectionOnly
            arrayOfButtons={gridButtons}
            routeToPass={'/transactions/customerTransactions/deleteTimeOrCharge'}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
            getRowId={getTransactionRowId}
            showQuickFilter={false}
            renderToolbarContent={() => searchField}
            renderExport={renderExportComponent}
         />
      </Stack>
   );
}
