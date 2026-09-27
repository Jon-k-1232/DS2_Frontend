import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {context} from '../../App';
import WorkspaceHeader from './WorkspaceHeader';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
test('shared breadcrumbs and quick links follow the page and focus its main content',()=>{
 render(<MemoryRouter initialEntries={['/billing/invoices/7/work']}><context.Provider value={{loggedInUser:{accessLevel:'admin'}}}><main id='main-content' tabIndex={-1}><WorkspaceHeader/><Routes><Route path='/work/entries' element={<div>Time entry</div>}/></Routes></main></context.Provider></MemoryRouter>);
 for(const label of ['Billing','Invoices','Details'])expect(screen.getByRole('navigation',{name:'Breadcrumbs'})).toHaveTextContent(label);expect(screen.getByRole('main')).toHaveFocus();expect(document.title).toBe('Invoices | DS2');
 fireEvent.click(screen.getByRole('link',{name:'Enter time'}));expect(screen.getByText('Time entry')).toBeVisible();
});
test('employees have their own breadcrumb without financial quick actions',()=>{
 render(<MemoryRouter initialEntries={['/time-tracking/history']}><context.Provider value={{loggedInUser:{accessLevel:'employee'}}}><WorkspaceHeader/></context.Provider></MemoryRouter>);
 expect(screen.getByRole('navigation',{name:'Breadcrumbs'})).toHaveTextContent('Your trackers');expect(screen.queryByRole('navigation',{name:'Quick actions'})).not.toBeInTheDocument();
});
