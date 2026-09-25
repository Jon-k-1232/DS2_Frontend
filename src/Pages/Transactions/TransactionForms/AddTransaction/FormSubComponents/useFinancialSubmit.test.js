import {useState} from 'react';
import {render,screen,fireEvent,act} from '@testing-library/react';
import useFinancialSubmit from './useFinancialSubmit';
test('two callbacks in the same event post once; completion releases the guard for an explicit retry',async()=>{
 let resolve;const post=jest.fn(()=>new Promise(r=>{resolve=r;}));
 function Harness(){const[status,setStatus]=useState(null);const{submitting,submit}=useFinancialSubmit(setStatus);return <><button disabled={submitting} onClick={()=>{submit(post);submit(post);}}>Save twice in one event</button><p>{status?.message}</p></>;}
 render(<Harness/>);fireEvent.click(screen.getByRole('button'));
 expect(post).toHaveBeenCalledTimes(1);expect(screen.getByRole('button')).toBeDisabled();
 await act(async()=>resolve());expect(screen.getByRole('button')).toBeEnabled();
 fireEvent.click(screen.getByRole('button'));expect(post).toHaveBeenCalledTimes(2);
 await act(async()=>resolve());
});
