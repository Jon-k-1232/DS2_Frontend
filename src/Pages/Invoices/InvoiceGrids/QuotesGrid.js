import React from 'react';
import DataGridTable from '../../../Components/DataGrids/DataGrid';

export default function QuotesGrid({ customerData }) {
  const { quotesList: { activeQuoteData = {} } = {} } = customerData || {};

  if (!customerData || !customerData.quotesList || !customerData.quotesList.activeQuoteData) {
    // Render a loading indicator or an empty state here
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataGridTable title='Quotes' tableData={activeQuoteData.grid} />
    </>
  );
}
