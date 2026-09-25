import { render, screen, fireEvent, act } from '@testing-library/react';
import { context } from '../../../../App';
import Payment from './Payment';
import WriteOff from './WriteOff';
import Retainer from './Retainer';
import Charge from './Charge';
import Time from './Time';
import { postNewPayment, postNewWriteOff, postNewRetainer, postTransaction } from '../../../../Services/ApiCalls/PostCalls';
jest.mock('../../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../../Services/ApiCalls/PostCalls', () => ({postNewPayment:jest.fn(),postNewWriteOff:jest.fn(),postNewRetainer:jest.fn(),postTransaction:jest.fn()}));
jest.mock('../../../../Services/ApiCalls/FetchCalls', () => ({ fetchCustomerProfileInformation: jest.fn(async()=>({})) }));
jest.mock('../../../../Components/Dialogs/InformationDialog', () => () => null);
jest.mock('../../../../Components/InitialSelectionOptions/InitialSelectionForms/InvoiceDropWithInvoiceAmounts', () => () => null);
jest.mock('../../../../Components/InitialSelectionOptions/InitialSelectionForms/JobDropWithCurrentCycleJobAmount', () => () => null);
jest.mock('./FormSubComponents/InvoiceConfirmation', () => () => null);
jest.mock('./FormSubComponents/RetainerSelection', () => () => null);
jest.mock('./FormSubComponents/InitialSelectionOptions', () => ({setSelectedItems}) => <button onClick={()=>setSelectedItems(s=>({...s,selectedCustomer:{customer_id:123},selectedInvoice:{customer_invoice_id:1,remaining_balance_on_invoice:100},selectedJob:{customer_job_id:1},selectedTeamMember:{user_id:90013},selectedGeneralWorkDescription:{general_work_description_id:1},selectedDate:require('dayjs')('2026-08-31'),unitCost:5,quantity:1,minutes:60,formOfPayment:'Check',paymentReferenceNumber:'local',writeoffReason:'Courtesy',typeOfHold:'Retainer',displayName:'Local receipt'}))}>Use valid fixture</button>);
jest.mock('./FormSubComponents/PaymentOptions', () => () => null);
jest.mock('./FormSubComponents/WriteOffOptions', () => () => null);
jest.mock('./FormSubComponents/ChargeOptions', () => () => null);
jest.mock('./FormSubComponents/TimeOptions', () => () => null);
const cases=[['Payment',Payment,postNewPayment],['Write-off',WriteOff,postNewWriteOff],['Retainer',Retainer,postNewRetainer],['Charge',Charge,postTransaction],['Time',Time,postTransaction]];
function mount(Component) {
  render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Component customerData={{teamMembersList:{activeUserData:{activeUsers:[{user_id:90013}]}}}} setCustomerData={jest.fn()} /></context.Provider>);
}
beforeEach(()=>jest.clearAllMocks());
test.each(cases)('%s serializes a pending submit and preserves a server refusal for retry',async(_,Component,post)=>{
  let resolve;
  post.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  mount(Component);
  await act(async()=>fireEvent.click(screen.getByText('Use valid fixture')));
  const button=screen.getByRole('button',{name:'Submit',exact:true});
  fireEvent.click(button); fireEvent.click(button);
  expect(post).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async()=>resolve({status:409,message:'This statement is sent and locked.'}));
  expect(screen.getByRole('alert')).toHaveTextContent('sent and locked');
  expect(screen.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
});
test.each(cases)('%s catches a failed request and re-enables submission without losing the form',async(_,Component,post)=>{
  post.mockRejectedValue({response:{data:{message:'Local request unavailable'}}});
  mount(Component);
  await act(async()=>fireEvent.click(screen.getByText('Use valid fixture')));
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Submit',exact:true})));
  expect(screen.getByRole('alert')).toHaveTextContent('Local request unavailable');
  expect(screen.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
});
test.each(cases)('%s refuses an empty form without a request',async(_,Component,post)=>{
  mount(Component);
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Submit',exact:true})));
  expect(screen.getByRole('alert')).toHaveTextContent(/customer/i);
  expect(post).not.toHaveBeenCalled();
});
