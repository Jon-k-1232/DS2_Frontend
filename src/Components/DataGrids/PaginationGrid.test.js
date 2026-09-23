import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaginationGrid from './PaginationGrid';

// getDynamicColumnWidths measures text on a canvas 2D context, which jsdom
// doesn't implement.
beforeAll(() => {
   HTMLCanvasElement.prototype.getContext = () => ({ measureText: text => ({ width: String(text).length * 7 }) });
});

const tableData = { rows: [{ id: 1, name: 'Row One' }], columns: [{ field: 'name', headerName: 'Name' }], totalCount: 1 };

const arrayOfButtons = [
   {
      dialogTitle: 'Add Thing',
      tooltipText: 'Add Thing',
      // Real text content (not an icon glyph) so the IconButton gets a plain,
      // unambiguous accessible name for the test — production callers pass a
      // real MUI icon here instead.
      icon: () => 'Add Thing',
      component: () => <div>Dialog content for the new thing</div>
   }
];

// Renders PaginationGrid behind a parent that can be forced to re-render
// (e.g. simulating context updating after some unrelated successful submit
// elsewhere on the page) without any of PaginationGrid's OWN props changing.
function Harness() {
   const [tick, setTick] = useState(0);
   return (
      <>
         <button onClick={() => setTick(value => value + 1)}>Re-render parent ({tick})</button>
         <PaginationGrid
            tableData={tableData}
            getRowId={row => row.id}
            arrayOfButtons={arrayOfButtons}
            paginationModel={{ page: 0, pageSize: 10 }}
            onPaginationModelChange={() => {}}
         />
      </>
   );
}

describe('PaginationGrid — toolbar stays mounted across parent re-renders', () => {
   it('keeps an open "Add" dialog open after the parent re-renders', () => {
      render(
         <MemoryRouter>
            <Harness />
         </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add Thing' }));
      expect(screen.getByText('Dialog content for the new thing')).toBeInTheDocument();

      // A parent re-render (context updating, an unrelated state change, etc.)
      // must not remount CustomToolbar — an inline `Toolbar: props => <CustomToolbar ... />`
      // is a NEW component identity every render, which DataGrid treats as a
      // different component type and unmounts/remounts, silently resetting
      // CustomToolbar's own `openDialog` state and closing the dialog.
      //
      // The open MUI Dialog marks the rest of the page aria-hidden (correct
      // modal behavior for screen readers), so the trigger button is queried
      // by its text rather than getByRole — aria-hidden removes it from the
      // accessibility tree but the element, and the click, are still real.
      fireEvent.click(screen.getByText(/Re-render parent/));

      expect(screen.getByText('Dialog content for the new thing')).toBeInTheDocument();
   });

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
