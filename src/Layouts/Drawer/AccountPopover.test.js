import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../App';
import AccountPopover from './AccountPopover';
jest.mock('../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../Components/MenuPopover',()=>({open,children})=>open?<div>{children}</div>:null);
jest.mock('../../Services/ApiCalls/PostCalls',()=>({postLogout:jest.fn()}));
test.each([['admin','/clients'],['SUPER ADMIN','/clients'],['manager','/clients'],['employee','/time-tracking/upload'],['User','/time-tracking/upload']])('account menu for %s has an accessible control and a permitted Home destination', (accessLevel,path)=>{
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accessLevel,displayName:'Synthetic user'},setLoggedInUser:jest.fn()}}><AccountPopover/></context.Provider></MemoryRouter>);
 const button=screen.getByRole('button',{name:'Account menu',exact:true});expect(button).toHaveAttribute('aria-expanded','false');button.focus();expect(button).toHaveFocus();fireEvent.click(button);expect(button).toHaveAttribute('aria-expanded','true');const home=screen.getByRole('menuitem',{name:'Home',exact:true});expect(home).toHaveAttribute('href',path);expect(home).toHaveFocus();fireEvent.keyDown(home,{key:'ArrowDown'});expect(screen.getByRole('menuitem',{name:'Log out',exact:true})).toHaveFocus();
});
