import React, { useContext, useEffect } from 'react';
import DataGridTable from '../../../Components/DataGrids/DataGrid';
import { fetchQuotesList } from '../../../Services/ApiCalls/FetchCalls';
import { context } from '../../../App';

export default function QuotesGrid({ customerData, setCustomerData }) {
  const { accountID, userID, token } = useContext(context).loggedInUser;
  const { quotesList: { activeQuoteData = {} } = {} } = customerData || {};

  // getInitialAppData (FetchCalls.js) never fetches or sets a quotesList key
  // at all — unlike jobCategoriesList/jobTypesList/workDescriptionsList,
  // which arrive with the rest of the app's initial data blob — so without a
  // dedicated fetch here this page's own gate below never advances past
  // "Loading...". Fetch directly on this page instead of the shared blob.
  //
  // PrimaryRouter's own initial-data apiCall() also writes customerData from
  // a plain `{...customerData, ...initialData}` closure snapshot (no
  // functional-update form is available through the setCustomerData prop
  // chain), and on a first navigation straight to this page it's still in
  // flight when this component mounts. Firing this fetch immediately would
  // race it: whichever of the two setCustomerData calls resolves LAST wins
  // and silently drops the other's contribution (observed live: the grid
  // flashed in once this fetch's own update landed, then reverted to
  // "Loading..." once the slower, larger initial blob landed afterward and
  // overwrote customerData from ITS OWN stale, quotesList-less snapshot).
  // Gate on customersList — a key that load definitely sets — so this
  // effect's merge only fires (and re-fires, once, when that key first
  // appears) strictly after the initial blob has already landed; nothing
  // else writes customerData after that point, so this can't be clobbered.
  useEffect(() => {
    let cancelled = false;
    const loadQuotes = async () => {
      const data = await fetchQuotesList(accountID, userID, token);
      if (!cancelled && data && data.activeQuoteData) {
        setCustomerData({ ...customerData, quotesList: { activeQuoteData: data.activeQuoteData } });
      }
    };
    if (accountID && userID && customerData?.customersList && !customerData?.quotesList) loadQuotes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [accountID, userID, customerData?.customersList]);

  if (!customerData || !customerData.quotesList || !customerData.quotesList.activeQuoteData) {
    // Still waiting on the dedicated fetch above.
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataGridTable title='Quotes' tableData={activeQuoteData.grid} />
    </>
  );
}
