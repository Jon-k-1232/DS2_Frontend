import dayjs from 'dayjs';
import { validateFinancialForm } from './useFinancialSubmit';
const good={selectedCustomer:{customer_id:1},selectedJob:{customer_job_id:1},selectedTeamMember:{user_id:1},selectedGeneralWorkDescription:{general_work_description_id:1},selectedDate:dayjs('2026-08-31'),quantity:2,unitCost:10,minutes:18};
test.each([
 ['Time',{selectedCustomer:null},'Select a customer.'],
 ['Charge',{selectedDate:null},'Select a valid transaction date.'],
 ['Charge',{selectedDate:dayjs('invalid')},'Select a valid transaction date.'],
 ['Time',{selectedJob:null},'Select a job.'],
 ['Charge',{selectedTeamMember:null},'Select a team member.'],
 ['Time',{selectedGeneralWorkDescription:null},'Select a general work description.'],
 ...['',null,undefined,-1,0,Infinity,'garbage'].map(minutes=>['Time',{minutes},'Enter a positive time duration.']),
 ...['',null,undefined,-1,Infinity,'garbage'].map(quantity=>['Charge',{quantity},'Enter a valid, nonnegative quantity.']),
 ...['',null,undefined,-1,Infinity,'garbage'].map(unitCost=>['Charge',{unitCost},'Enter a valid, nonnegative unit cost.']),
 ...['',null,undefined,0,0.001,Infinity,'garbage'].map(unitCost=>['Retainer',{unitCost},'Enter an amount greater than $0.00.']),
 ['WriteOff',{unitCost:100000000},'The amount exceeds the supported maximum of $99999999.99.']
])('%s refuses %j with a useful message',(kind,changed,message)=>{
 expect(validateFinancialForm({...good,...changed},kind)).toBe(message);
});
test.each([['Charge',0,0],['Time',0.3,75],['Retainer',1,-25],['WriteOff',1,2]])('%s preserves valid zero charges, exact time and signed credits',(kind,quantity,unitCost)=>{
 expect(validateFinancialForm({...good,quantity,unitCost},kind)).toBeNull();
});
