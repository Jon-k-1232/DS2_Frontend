import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Checkbox, Tooltip } from '@mui/material';
import { context } from '../../App';
import { fetchExclusions } from '../../Services/ApiCalls/AnalyticsCalls';

const STORAGE_KEY = 'ds2_analytics_exclude';

const readStored = () => {
   try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids.map(Number).filter(Number.isInteger) : null;
   } catch {
      return null;
   }
};

/**
 * Shared "filter out" control for the analytics pages.
 *
 * Loads the customer list + default-excluded ids once, renders a multi-select,
 * and persists the selection across the analytics section in sessionStorage —
 * so the firm's own related entities (LTDFH*, JFK&A, KFP, Jim Kimmel Insurance)
 * stay excluded by default while the user can add or remove any customer.
 *
 * Returns `{ ready, excludedIds, filter }`. Pages gate their data fetch on
 * `ready`, pass `excludedIds` to the fetch (and include it in the effect deps),
 * and drop `filter` into their toolbar.
 */
export default function useExcludedCustomers() {
   const { loggedInUser } = useContext(context);
   const { accountID, userID } = loggedInUser;

   const [customers, setCustomers] = useState([]);
   const [excludedIds, setExcludedIds] = useState([]);
   const [ready, setReady] = useState(false);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         try {
            const res = await fetchExclusions(accountID, userID);
            if (cancelled) return;
            const list = res?.exclusions?.customers || [];
            const defaults = res?.exclusions?.defaultExcludedIds || [];
            setCustomers(list);
            // Stored selection wins so the choice sticks across pages/reloads;
            // first visit falls back to the firm's default exclusions.
            const stored = readStored();
            setExcludedIds(stored ?? defaults);
         } catch (err) {
            // Non-fatal: pages still render, just unfiltered.
            console.error('Error loading analytics exclusions:', err);
            setCustomers([]);
            setExcludedIds(readStored() ?? []);
         } finally {
            if (!cancelled) setReady(true);
         }
      };
      if (accountID && userID) load();
      return () => {
         cancelled = true;
      };
   }, [accountID, userID]);

   const handleChange = useCallback((_event, selected) => {
      const ids = selected.map(c => c.customer_id);
      setExcludedIds(ids);
      try {
         window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch {
         // sessionStorage unavailable — selection is still live in state.
      }
   }, []);

   const value = useMemo(() => customers.filter(c => excludedIds.includes(c.customer_id)), [customers, excludedIds]);

   const filter = (
      <Tooltip title='Customers excluded from every analytics page. Defaults to the firm’s own related entities.'>
         <Autocomplete
            multiple
            size='small'
            limitTags={1}
            sx={{ minWidth: 280, maxWidth: 460 }}
            options={customers}
            value={value}
            onChange={handleChange}
            disableCloseOnSelect
            getOptionLabel={option => option.display_name || ''}
            isOptionEqualToValue={(option, val) => option.customer_id === val.customer_id}
            ChipProps={{ size: 'small' }}
            // Checkbox per option marks what's selected; multiple stays open while picking.
            renderOption={(props, option, { selected }) => {
               const { key, ...optionProps } = props;
               return (
                  <li key={option.customer_id} {...optionProps}>
                     <Checkbox size='small' style={{ marginRight: 8 }} checked={selected} />
                     {option.display_name}
                  </li>
               );
            }}
            // Collapsed (unfocused) the field shows the first name then "+N"; focus expands all.
            getLimitTagsText={more => `+${more}`}
            renderInput={params => <TextField {...params} label='Filter out (exclude)' variant='outlined' placeholder={value.length ? '' : 'None'} />}
         />
      </Tooltip>
   );

   return { ready, excludedIds, filter };
}
