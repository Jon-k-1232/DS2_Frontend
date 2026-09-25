import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DataGrid from './DataGrid';
beforeAll(()=>{HTMLCanvasElement.prototype.getContext=()=>({measureText:text=>({width:String(text).length*7})});});
function Form(){const[value,setValue]=useState('');return <><input aria-label='Draft note' value={value} onChange={e=>setValue(e.target.value)} /><div role='alert'>Saved successfully</div></>;}
function Harness(){const[tick,setTick]=useState(0);return <><button onClick={()=>setTick(n=>n+1)}>Refresh {tick}</button><DataGrid tableData={{rows:[{id:1,name:'Local'}],columns:[{field:'name'}]}} arrayOfButtons={[{dialogTitle:'Add receipt',tooltipText:'Add receipt',icon:()=> 'Add receipt',component:()=> <Form/>}]} /></>;}
test('refresh preserves the open form, its draft and success message',()=>{
  render(<MemoryRouter><Harness/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Add receipt'}));
  fireEvent.change(screen.getByLabelText('Draft note'),{target:{value:'In progress'}});
  fireEvent.click(screen.getByText('Refresh 0'));
  expect(screen.getByLabelText('Draft note')).toHaveValue('In progress');
  expect(screen.getByRole('alert')).toHaveTextContent('Saved successfully');
});
