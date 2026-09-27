import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import TimeOptions from './TimeOptions';
import ChargeOptions from './ChargeOptions';
const plan={customer_id:7,billing_entity_id:1,is_recurring_customer_active:true,start_date:'2026-01-01'};
const data={recurringCustomersList:{activeRecurringCustomersData:{activeRecurringCustomers:[plan]}},workDescriptionsList:{activeWorkDescriptionsData:{workDescriptions:[]}}};
function Harness({Component,initial={}}){const [v,set]=React.useState({selectedCustomer:{customer_id:7},entityId:1,selectedDate:'2026-02-01',selectedTeamMember:{user_id:3,billing_rate:100},quantity:1,unitCost:100,detailedJobDescription:'Service',isTransactionBillable:true,isInAdditionToMonthlyCharge:false,...initial});return <><Component customerData={data} selectedItems={v} setSelectedItems={set}/><button onClick={()=>set(x=>({...x,entityId:2}))}>Other business</button><output data-testid='state'>{JSON.stringify(v)}</output></>;}
for(const Component of [TimeOptions,ChargeOptions]){
 test(`${Component.name} keeps excess separate from manual billable choice and resets coverage for another business`,()=>{render(<Harness Component={Component}/>);expect(screen.getByLabelText('Billable')).not.toBeChecked();fireEvent.click(screen.getByLabelText('Yes'));expect(screen.getByLabelText('Billable')).toBeChecked();fireEvent.click(screen.getByLabelText('Billable'));if(Component===TimeOptions)fireEvent.change(screen.getByLabelText('Time (hours)'),{target:{value:'0.3'}});else fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'2'}});expect(screen.getByLabelText('Billable')).not.toBeChecked();fireEvent.click(screen.getByText('Other business'));expect(screen.queryByLabelText('Yes')).not.toBeInTheDocument();expect(screen.getByLabelText('Billable')).toBeChecked();});
 test(`${Component.name} preserves the saved billable choice on edit`,()=>{render(<Harness Component={Component} initial={{transactionID:9,isTransactionBillable:true,isInAdditionToMonthlyCharge:false}}/>);expect(screen.getByLabelText('Billable')).toBeChecked();});
}
