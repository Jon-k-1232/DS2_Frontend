import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpandableGrid from './ExpandableGrid';

// getDynamicColumnWidths measures text on a canvas 2D context, which jsdom
// doesn't implement.
beforeAll(() => {
   HTMLCanvasElement.prototype.getContext = () => ({ measureText: text => ({ width: String(text).length * 7 }) });
});

const tableData = {
   treeGrid: {
      columns: [{ field: 'name', headerName: 'Name' }],
      rows: [{ id: 1, name: 'Row One', children: [] }]
   }
};

const arrayOfButtons = [
   {
      dialogTitle: 'Add Thing',
      tooltipText: 'Add Thing',
      icon: () => 'Add Thing',
      component: () => <div>Dialog content for the new thing</div>
   }
];

// Same remount hazard as PaginationGrid.js (see its test for the full
// explanation) — ExpandableGrid built its Toolbar the identical inline-arrow-
// function way.
function Harness() {
   const [tick, setTick] = useState(0);
   return (
      <>
         <button onClick={() => setTick(value => value + 1)}>Re-render parent ({tick})</button>
         <ExpandableGrid tableData={tableData} idField='id' parentColumnName='parentId' arrayOfButtons={arrayOfButtons} />
      </>
   );
}

describe('ExpandableGrid — toolbar stays mounted across parent re-renders', () => {
   it('keeps an open "Add" dialog open after the parent re-renders', () => {
      render(
         <MemoryRouter>
            <Harness />
         </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add Thing' }));
      expect(screen.getByText('Dialog content for the new thing')).toBeInTheDocument();

      // Modal Dialog marks the rest of the page aria-hidden — query by text,
      // not role, the same way PaginationGrid.test.js does.
      fireEvent.click(screen.getByText(/Re-render parent/));

      expect(screen.getByText('Dialog content for the new thing')).toBeInTheDocument();
   });

   // Same remount hazard as PaginationGrid.test.js's quick-filter test:
   // ExpandableGrid doesn't pass showQuickFilter/hideGridTools, so
   // CustomToolbar's quick filter defaults on — an inline Toolbar component
   // identity would remount it (and MUI's own quick-filter input echo, which
   // is local state) on every unrelated parent re-render, silently dropping
   // in-progress typing.
   it('keeps in-progress quick-filter text after the parent re-renders', () => {
      render(
         <MemoryRouter>
            <Harness />
         </MemoryRouter>
      );

      const searchBox = screen.getByPlaceholderText('Search…');
      fireEvent.change(searchBox, { target: { value: 'partial search' } });
      expect(searchBox).toHaveValue('partial search');

      fireEvent.click(screen.getByRole('button', { name: /Re-render parent/ }));

      expect(screen.getByPlaceholderText('Search…')).toHaveValue('partial search');
   });
});
