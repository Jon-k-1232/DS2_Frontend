import { render, screen, fireEvent, within, createEvent } from '@testing-library/react';
import CreateInvoiceGridTable from './CreateInvoiceGrid';

// getDynamicColumnWidths measures text on a canvas 2D context, which jsdom
// doesn't implement — stub it the same way across every test in this file.
beforeAll(() => {
   HTMLCanvasElement.prototype.getContext = () => ({ measureText: text => ({ width: String(text).length * 7 }) });
});

const gridData = {
   columns: [{ field: 'display_name', headerName: 'Customer', width: 200 }],
   rows: [
      { id: 0, customer_id: 10, display_name: 'Fresh customer', invoice_total: 100, billed_today: false },
      { id: 1, customer_id: 20, display_name: 'Already billed', invoice_total: 200, billed_today: true }
   ]
};

// E2 — CreateInvoiceGrid checked rows must always equal the customers actually
// submitted via setSelectedRowsToInvoice. Before the fix, the DataGrid's
// selection was uncontrolled (no rowSelectionModel), so the header "select
// all" checkbox could leave a billed-today row visibly checked even though
// the row-count-based guard silently dropped it from the submitted payload —
// and a header select-all over a SINGLE billed-today row bypassed the guard
// entirely (guard only fired when more than one id was added at once) and
// submitted it anyway.
describe('CreateInvoiceGrid — bulk selection excludes billed-today rows, individual selection does not', () => {
   const headerCheckbox = () => screen.getByRole('checkbox', { name: 'Select all visible debit or zero customers not billed today' });

   it('header select-all with one fresh and one billed-today row submits only the fresh one, and the UI shows the same', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={gridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      fireEvent.click(headerCheckbox());

      // Payload: only the fresh customer.
      const lastPayload = setSelectedRowsToInvoice.mock.calls.at(-1)[0];
      expect(lastPayload.map(row => row.customer_id)).toEqual([10]);

      // UI: checked state agrees with the payload — the billed-today row's own
      // checkbox is NOT checked, the fresh row's is.
      expect(within(screen.getByRole('row', { name: /Fresh customer/ })).getByRole('checkbox', { name: 'Unselect row' })).toBeChecked();
      expect(within(screen.getByRole('row', { name: /Already billed/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();

      // The header itself reflects "all eligible rows selected", not "all rows".
      expect(headerCheckbox()).toBeChecked();
   });

   it('a single billed-today row does not get swept in by header select-all (header is disabled with nothing eligible)', () => {
      const setSelectedRowsToInvoice = jest.fn();
      const billedOnly = { ...gridData, rows: [gridData.rows[1]] };
      render(<CreateInvoiceGridTable gridData={billedOnly} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      const header = headerCheckbox();
      expect(header).toBeDisabled();

      fireEvent.click(header);

      const lastPayload = setSelectedRowsToInvoice.mock.calls.at(-1)[0];
      expect(lastPayload.map(row => row.customer_id)).toEqual([]);
      expect(within(screen.getByRole('row', { name: /Already billed/ })).getByRole('checkbox', { name: 'Select row' })).not.toBeChecked();
   });

   it('individual selection of a billed-today row stays possible via its own row checkbox', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={gridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      fireEvent.click(within(screen.getByRole('row', { name: /Already billed/ })).getByRole('checkbox', { name: 'Select row' }));

      const lastPayload = setSelectedRowsToInvoice.mock.calls.at(-1)[0];
      expect(lastPayload.map(row => row.customer_id)).toEqual([20]);
      expect(within(screen.getByRole('row', { name: /Already billed/ })).getByRole('checkbox', { name: 'Unselect row' })).toBeChecked();
      // Picking the one billed-today row individually is exactly one (of one)
      // eligible-excluded row selected — the bulk header must stay unchecked,
      // not read as "all done".
      expect(headerCheckbox()).not.toBeChecked();
   });
});

// R1 — the replacement header Checkbox must work from the keyboard (MUI's
// DataGrid cancels a bubbled Space to mean "page down", so this header must
// own Space itself with preventDefault/stopPropagation) and must expose a
// partial selection accessibly via aria-checked="mixed", not just a visual
// indeterminate icon.
describe('CreateInvoiceGrid — header checkbox keyboard operation and accessible mixed state', () => {
   // Two eligible (fresh) rows so "select all eligible" is a meaningful
   // plural, plus one billed-today row that must stay excluded either way.
   const multiRowGridData = {
      columns: [{ field: 'display_name', headerName: 'Customer', width: 200 }],
      rows: [
         { customer_id: 10, display_name: 'Fresh Alpha', invoice_total: 100, billed_today: false },
         { customer_id: 11, display_name: 'Fresh Beta', invoice_total: 100, billed_today: false },
         { customer_id: 20, display_name: 'Billed', invoice_total: 100, billed_today: true }
      ]
   };
   const headerCheckbox = () => screen.getByRole('checkbox', { name: 'Select all visible debit or zero customers not billed today' });

   it('Space on the focused header checkbox selects all eligible rows, and Space again deselects them', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={multiRowGridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      const header = headerCheckbox();
      header.focus();

      const keyDownEvent = createEvent.keyDown(header, { key: ' ', code: 'Space', keyCode: 32, charCode: 32, bubbles: true, cancelable: true });
      fireEvent(header, keyDownEvent);

      // DataGrid's own handler would otherwise treat this Space as "page
      // down" — the fix must own preventDefault/stopPropagation itself.
      expect(keyDownEvent.defaultPrevented).toBe(true);
      expect(header).toBeChecked();
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0].map(row => row.customer_id)).toEqual([10, 11]);

      fireEvent.keyDown(header, { key: ' ', code: 'Space' });

      expect(header).not.toBeChecked();
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0]).toEqual([]);
   });

   it('key-repeat while Space is held does not re-toggle the selection on every repeat tick', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={multiRowGridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      const header = headerCheckbox();
      header.focus();

      fireEvent.keyDown(header, { key: ' ', code: 'Space' });
      expect(header).toBeChecked();

      fireEvent.keyDown(header, { key: ' ', code: 'Space', repeat: true });
      fireEvent.keyDown(header, { key: ' ', code: 'Space', repeat: true });

      // Still just the one toggle from the initial (non-repeat) Space.
      expect(header).toBeChecked();
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0].map(row => row.customer_id)).toEqual([10, 11]);
   });

   it('a partial selection exposes aria-checked="mixed" (assistive tech reads this; MUI\'s indeterminate prop is visual-only)', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={multiRowGridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      fireEvent.click(within(screen.getByRole('row', { name: /Fresh Alpha/ })).getByRole('checkbox', { name: 'Select row' }));

      const header = headerCheckbox();
      expect(header).toHaveAttribute('data-indeterminate', 'true');
      expect(header).toHaveAttribute('aria-checked', 'mixed');

      // Fully deselecting clears the mixed state back to a plain "false".
      fireEvent.click(within(screen.getByRole('row', { name: /Fresh Alpha/ })).getByRole('checkbox', { name: 'Unselect row' }));
      expect(header).not.toHaveAttribute('aria-checked', 'mixed');
   });

   it('a filter change prunes hidden selections but keeps visible ones selected, and header clicks still work', () => {
      const setSelectedRowsToInvoice = jest.fn();
      render(<CreateInvoiceGridTable gridData={multiRowGridData} setSelectedRowsToInvoice={setSelectedRowsToInvoice} />);

      // Mouse click still works, bulk-selecting both eligible rows.
      fireEvent.click(headerCheckbox());
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0].map(row => row.customer_id)).toEqual([10, 11]);

      // Filtering down to "Alpha" hides Beta — Beta's selection is pruned,
      // Alpha's is kept, and the header reads fully-checked again (not mixed)
      // because every currently-VISIBLE eligible row is still selected.
      fireEvent.change(screen.getByPlaceholderText('Search by name or business'), { target: { value: 'Alpha' } });
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0].map(row => row.customer_id)).toEqual([10]);
      expect(headerCheckbox()).toBeChecked();
      expect(headerCheckbox()).not.toHaveAttribute('aria-checked', 'mixed');

      // Clearing the filter brings Beta back into view, but its earlier
      // selection was pruned, not remembered — only Alpha stays selected, and
      // the header now correctly reads mixed (one of two eligible checked).
      fireEvent.change(screen.getByPlaceholderText('Search by name or business'), { target: { value: '' } });
      expect(setSelectedRowsToInvoice.mock.calls.at(-1)[0].map(row => row.customer_id)).toEqual([10]);
      expect(headerCheckbox()).toHaveAttribute('aria-checked', 'mixed');
   });
});

it('keeps zero-dollar customers with pending retainer events selectable',()=>{
 const selected=jest.fn();
 const data={columns:[{field:'customer_id',headerName:'ID'},{field:'display_name',headerName:'Customer'},{field:'invoice_total',headerName:'Total'}],rows:[{customer_id:55,display_name:'Refund statement',invoice_total:0,retainer_event_count:1,billed_today:false}]};
 render(<CreateInvoiceGridTable gridData={data} setSelectedRowsToInvoice={selected}/>);
 const row=screen.getByRole('row',{name:/Refund statement/});fireEvent.click(within(row).getByRole('checkbox',{name:'Select row'}));
 expect(selected.mock.calls.at(-1)[0].map(r=>r.customer_id)).toEqual([55]);
});

describe('owner decision 2: explicit credit selection', () => {
   const creditGrid = {columns:[{field:'display_name',headerName:'Customer'},{field:'invoice_total',headerName:'Total'}],rows:[
      {customer_id:1,display_name:'Debit client',invoice_total:100},
      {customer_id:2,display_name:'Credit client',invoice_total:-25,is_credit_statement:true}
   ]};
   it('shows credit, excludes it from bulk selection and includes it only after an individual choice',()=>{
      const onSelect=jest.fn();render(<CreateInvoiceGridTable gridData={creditGrid} setSelectedRowsToInvoice={onSelect}/>);
      expect(onSelect.mock.calls.at(-1)[0]).toEqual([]);
      expect(screen.getByText(/Credit balances are not selected/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox',{name:'Select all visible debit or zero customers not billed today'}));
      expect(onSelect.mock.calls.at(-1)[0].map(r=>r.customer_id)).toEqual([1]);
      const row=screen.getByRole('row',{name:/Credit client/});
      fireEvent.click(within(row).getByRole('checkbox',{name:'Select row'}));
      expect(onSelect.mock.calls.at(-1)[0].find(r=>r.customer_id===2)).toMatchObject({includeCreditStatement:true,invoice_total:-25});
      expect(onSelect.mock.calls.at(-1)[0].find(r=>r.customer_id===2).issueReason).toMatch(/explicitly selected credit/);
      fireEvent.click(within(row).getByRole('checkbox',{name:'Unselect row'}));
      expect(onSelect.mock.calls.at(-1)[0].map(r=>r.customer_id)).toEqual([1]);
   });
   it('never selects a sole credit by keyboard bulk selection',()=>{
      const onSelect=jest.fn();render(<CreateInvoiceGridTable gridData={{...creditGrid,rows:[creditGrid.rows[1]]}} setSelectedRowsToInvoice={onSelect}/>);
      const header=screen.getByRole('checkbox',{name:'Select all visible debit or zero customers not billed today'});
      expect(header).toBeDisabled();fireEvent.keyDown(header,{key:' '});expect(onSelect.mock.calls.at(-1)[0]).toEqual([]);
   });
});

it('a selected debit becoming credit after refresh does not silently gain credit authorization',()=>{
 const onSelect=jest.fn();const positive={columns:[{field:'display_name',headerName:'Customer'}],rows:[{customer_id:1,display_name:'Changing balance',invoice_total:25}]};
 const {rerender}=render(<CreateInvoiceGridTable gridData={positive} setSelectedRowsToInvoice={onSelect}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Select all visible debit or zero customers not billed today'}));
 const credit={...positive,rows:[{...positive.rows[0],invoice_total:-25}]};
 rerender(<CreateInvoiceGridTable gridData={credit} setSelectedRowsToInvoice={onSelect}/>);
 expect(onSelect.mock.calls.at(-1)[0][0].includeCreditStatement).toBe(false);
 const row=screen.getByRole('row',{name:/Changing balance/});fireEvent.click(within(row).getByRole('checkbox',{name:'Unselect row'}));fireEvent.click(within(row).getByRole('checkbox',{name:'Select row'}));
 expect(onSelect.mock.calls.at(-1)[0][0].includeCreditStatement).toBe(true);
});
