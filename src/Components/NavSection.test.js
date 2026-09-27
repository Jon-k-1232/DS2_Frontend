import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import NavSection from './NavSection';
import {buildSidebarRoutes} from '../Routes/SidebarRoutes';
function Location(){return <output>{useLocation().pathname}</output>;}
test('category controls expose expansion without changing the route; leaves are real links',()=>{
 render(<MemoryRouter initialEntries={['/clients']}><NavSection navConfig={buildSidebarRoutes({accessLevel:'admin'})}/><Location/></MemoryRouter>);
 const button=screen.getByRole('button',{name:'Billing',exact:true});expect(button).toHaveAttribute('aria-expanded','false');fireEvent.click(button);expect(button).toHaveAttribute('aria-expanded','true');expect(screen.getByText('/clients')).toBeVisible();
 fireEvent.click(screen.getByRole('link',{name:'Create invoices',exact:true}));expect(screen.getByText('/billing/create')).toBeVisible();expect(screen.getByRole('link',{name:'Create invoices',exact:true})).toHaveAttribute('aria-current','page');
});
test('deep links open the correct category and employee menus contain only permitted links',()=>{
 render(<MemoryRouter initialEntries={['/time-tracking/history']}><NavSection navConfig={buildSidebarRoutes({accessLevel:'employee'})}/></MemoryRouter>);
 expect(screen.getByRole('button',{name:'Time Tracking'})).toHaveAttribute('aria-expanded','true');expect(screen.getAllByRole('link')).toHaveLength(2);expect(screen.getByRole('link',{name:'Your trackers'})).toHaveAttribute('aria-current','page');expect(screen.queryByRole('button',{name:'Settings'})).not.toBeInTheDocument();
});
