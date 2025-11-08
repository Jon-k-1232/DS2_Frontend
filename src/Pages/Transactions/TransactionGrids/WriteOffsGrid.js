import { Stack, TextField, InputAdornment } from '@mui/material';
import PaginationGrid from '../../../Components/DataGrids/PaginationGrid';
import WriteOff from '../TransactionForms/AddTransaction/WriteOff';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import SearchIcon from '@mui/icons-material/Search';
import palette from '../../../Theme/palette';
import { filterGridByColumnName } from '../../../Services/SharedFunctions';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWriteOffs } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function WriteOffsGrid({ customerData, setCustomerData }) {
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
            placeholder='Search write-offs'
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
            aria-label='Search write-offs'
         />
      ),
      [searchInput, stopToolbarKeyEvent]
   );

   const gridButtons = [
      {
         dialogTitle: 'New Write Off',
         tooltipText: 'New Write Off',
         icon: () => <PlaylistRemoveIcon style={{ color: palette.primary.main }} />,
         component: () => <WriteOff customerData={customerData} setCustomerData={data => setCustomerData(data)} />
      }
   ];

   const arrayOfColumnNames = [
      'writeoff_id',
      'customer_id',
      'customer_invoice_id',
      'customer_job_id',
      'customer_name',
      'job_description',
      'writeoff_amount',
      'transaction_type',
      'writeoff_date',
      'created_at',
      'created_by_user_name',
      'writeoff_reason',
      'note'
   ];
   const getRowId = useCallback(row => row.writeoff_id || row.id, []);

   const applyFilteredGrid = activeWriteOffsData => {
      if (!activeWriteOffsData?.grid) return;
      const filteredGrid = filterGridByColumnName(activeWriteOffsData.grid, arrayOfColumnNames);
      const totalCount = activeWriteOffsData.pagination?.totalItems ?? filteredGrid.rows.length ?? 0;

      setGridData({ rows: filteredGrid.rows, columns: filteredGrid.columns, totalCount });

      const nextPageSize = activeWriteOffsData.pagination?.limit || activeWriteOffsData.pagination?.pageSize || DEFAULT_PAGE_SIZE;
      const nextPageIndex = (activeWriteOffsData.pagination?.page || activeWriteOffsData.pagination?.currentPage || 1) - 1;
      const normalizedSearch = activeWriteOffsData.searchTerm ?? '';

      setSearchInput(prev => (prev === normalizedSearch ? prev : normalizedSearch));
      setSearchTerm(prev => (prev === normalizedSearch ? prev : normalizedSearch));

      setPaginationModel(prev => {
         const nextModel = { page: nextPageIndex >= 0 ? nextPageIndex : 0, pageSize: nextPageSize };
         return prev.page === nextModel.page && prev.pageSize === nextModel.pageSize ? prev : nextModel;
      });
   };

   useEffect(() => {
      const activeWriteOffsData = customerData?.writeOffsList?.activeWriteOffsData;
      if (!activeWriteOffsData) return;
      applyFilteredGrid(activeWriteOffsData);
      initializedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [customerData?.writeOffsList]);

   useEffect(() => {
      if (initializedRef.current) return;
      const hasData = Boolean(customerData?.writeOffsList?.activeWriteOffsData);
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
         const response = await fetchWriteOffs(accountID, userID, token, page, pageSize, searchValue);
         if (response?.writeOffsList?.activeWriteOffsData) {
            const { writeOffsList } = response;
            applyFilteredGrid(writeOffsList.activeWriteOffsData);
            setCustomerData(prev => ({ ...prev, writeOffsList }));
         }
      } catch (error) {
         console.error('Error fetching write-offs:', error);
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
               title='Write Offs'
               passedHeight={window.innerHeight - 140}
               tableData={gridData}
               checkboxSelection={false}
               enableSingleRowClick
               rowSelectionOnly
               arrayOfButtons={gridButtons}
               routeToPass={'/transactions/customerWriteOffs/deleteWriteOff'}
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
