import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import DataGrid from './DataGrid';
import PaginationGrid from './PaginationGrid';
beforeAll(()=>{HTMLCanvasElement.prototype.getContext=()=>({measureText:text=>({width:String(text).length*7})});});
const columns=[{field:'customer_id',headerName:'Customer Id'},{field:'created_by_user_id',headerName:'Created By User Id'},{field:'display_name',headerName:'Display Name'},{field:'created_by_user_name',headerName:'Created By User Name'}];
for(const [name,Grid] of [['simple',DataGrid],['paginated',PaginationGrid]])test(`${name} grid names clients and staff and keeps internal keys out of visible columns`,async()=>{
 const view=render(<MemoryRouter><Grid tableData={{rows:[],columns:[]}} /></MemoryRouter>);
 view.rerender(<MemoryRouter><Grid tableData={{rows:[{id:1,customer_id:33,created_by_user_id:44,display_name:'Named client',created_by_user_name:'Named staff'}],columns}} /></MemoryRouter>);
 expect(await screen.findByRole('columnheader',{name:'Display name',exact:true})).toBeVisible();
 expect(screen.getByRole('columnheader',{name:'Created by',exact:true})).toBeVisible();expect(screen.queryByRole('columnheader',{name:/\bId\b/})).not.toBeInTheDocument();
 expect(screen.getByText('Named client')).toBeVisible();expect(screen.getByText('Named staff')).toBeVisible();
});
