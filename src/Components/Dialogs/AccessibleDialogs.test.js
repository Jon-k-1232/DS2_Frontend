import {fireEvent,render,screen} from '@testing-library/react';
import GeneralDialog from './GeneralDialog';
import InformationDialog from './InformationDialog';
test('general form dialog is named and its cancel action closes through the owner',async()=>{
 const close=jest.fn();render(<GeneralDialog dialogTitle='Enter time' openDialogWindow onClose={close}><label>Hours<input/></label></GeneralDialog>);
 expect(await screen.findByRole('dialog',{name:'Enter time'})).toBeVisible();expect(screen.getByLabelText('Hours')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(close).toHaveBeenCalledTimes(1);
});
test('help has a keyboard-focusable button and a named dialog',()=>{
 render(<InformationDialog toolTipText='Explain retained funds' dialogTitle='Retained funds' dialogText={['Credit stays with its business.']}/>);
 const button=screen.getByRole('button',{name:'Explain retained funds'});button.focus();expect(button).toHaveFocus();fireEvent.click(button);expect(screen.getByRole('dialog',{name:'Retained funds'})).toBeVisible();expect(screen.getByText('Credit stays with its business.')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Close'}));
});
