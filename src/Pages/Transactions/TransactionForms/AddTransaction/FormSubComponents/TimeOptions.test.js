import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import TimeOptions from './TimeOptions';
const member={user_id:3,billing_rate:137.5};
function Harness({initial={}}){
 const [value,setValue]=React.useState({selectedTeamMember:member,isTransactionBillable:true,selectedCustomer:{},quantity:1,unitCost:137.5,detailedJobDescription:'',...initial});
 return <><TimeOptions customerData={{}} selectedItems={value} setSelectedItems={setValue}/><output data-testid='values'>{JSON.stringify(value)}</output></>;
}
it('uses a six-minute spinner and bills a typed quarter hour as 0.3h while retaining15 raw minutes',()=>{
 render(<Harness/>);const input=screen.getByLabelText('Time (hours)');expect(input).toHaveAttribute('step','0.1');
 fireEvent.change(input,{target:{value:'0.25'}});const value=JSON.parse(screen.getByTestId('values').textContent);expect(value.quantity).toBe(.3);expect(value.minutes).toBe(15);expect(value.unitCost).toBe(137.5);
});
it('opening historical explicit hours preserves its loaded quantity/rate until the user changes time',()=>{
 render(<Harness initial={{transactionID:17,quantity:.25,unitCost:75}}/>);
 expect(screen.getByLabelText('Time (hours)')).toHaveValue(.25);const value=JSON.parse(screen.getByTestId('values').textContent);expect(value.quantity).toBe(.25);expect(value.unitCost).toBe(75);
 fireEvent.change(screen.getByLabelText('Time (hours)'),{target:{value:'0.3'}});
 expect(JSON.parse(screen.getByTestId('values').textContent).quantity).toBe(.3);
});
