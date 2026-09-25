import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceHistory from './InvoiceHistory';
import { context } from '../../../App';
import { invoiceExceptionCall } from '../../../Services/ApiCalls/InvoiceExceptionCalls';
import { fetchFileDownload } from '../../../Services/ApiCalls/FetchCalls';
jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../Services/ApiCalls/InvoiceExceptionCalls', () => ({ invoiceExceptionCall: jest.fn() }));
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ fetchFileDownload: jest.fn() }));
const base = { status:200, sent_locked:true, locked_invoice_number:'INV-2026-00001', conditions:[{code:'bounced_check',label:'Bounced check'}],
   exceptions:[], revisions:[{revision:0,artifact_key:'original.zip',issued_amount:400}], events:[],
   statementPayments:[{payment_id:8,payment_amount:-100,eligible_for_exception:true}] };
const draw = () => render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><InvoiceHistory invoiceID={7} /></context.Provider>);
beforeEach(()=> { jest.clearAllMocks(); invoiceExceptionCall.mockResolvedValue(base); fetchFileDownload.mockResolvedValue({status:200}); });
it('shows the lock and reprints the original without a money mutation',async()=> {
   draw(); expect(await screen.findByText(/Sent — locked/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:/Reprint original/}));
   await waitFor(()=>expect(fetchFileDownload).toHaveBeenCalledWith('original.zip','invoice_revision_0.zip',9001,90013));
   expect(invoiceExceptionCall).toHaveBeenCalledTimes(1);
});
it('requires both a reason and selected payment before recording a flag',async()=> {
   draw(); fireEvent.click(await screen.findByRole('button',{name:'Flag exception'}));
   expect(screen.getByRole('button',{name:'Record exception'})).toBeDisabled();
   fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Bank returned check'}});
   fireEvent.click(screen.getByRole('checkbox',{name:/Payment #8/}));
   fireEvent.click(screen.getByRole('button',{name:'Record exception'}));
   await waitFor(()=>expect(invoiceExceptionCall).toHaveBeenCalledWith(expect.objectContaining({operation:'flag',body:{condition:'bounced_check',reason:'Bank returned check',paymentIds:[8]}})));
});
it('shows refusal and keeps the flag form available for retry',async()=> {
   invoiceExceptionCall.mockImplementation(a=>Promise.resolve(a.operation==='flag'?{status:409,message:'Resolve the existing exception first.'}:base));
   draw(); fireEvent.click(await screen.findByRole('button',{name:'Flag exception'}));
   fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'NSF'}}); fireEvent.click(screen.getByRole('checkbox'));
   fireEvent.click(screen.getByRole('button',{name:'Record exception'}));
   expect(await screen.findByText('Resolve the existing exception first.')).toBeInTheDocument();
   expect(screen.getByLabelText('Reason')).toHaveValue('NSF');
});
it('only offers reversal and cancellation while flagged',async()=> {
   invoiceExceptionCall.mockResolvedValue({...base,exceptions:[{exception_id:3,state:'flagged',reason:'NSF',payments:[{payment_id:8,amount:100}]}]});
   draw(); fireEvent.click(await screen.findByRole('button',{name:'Reverse selected payments'}));
   await waitFor(()=>expect(invoiceExceptionCall).toHaveBeenCalledWith(expect.objectContaining({operation:'reverse',exceptionID:3})));
   expect(screen.queryByRole('button',{name:'Roll into next invoice'})).not.toBeInTheDocument();
});
for (const [label,action] of [['Issue revision for reprint / resend','revision'],['Roll into next invoice','roll_forward']]) {
 it(`resolves reversed exception with ${action}`,async()=> {
   invoiceExceptionCall.mockResolvedValue({...base,exceptions:[{exception_id:3,state:'reversed',reason:'NSF',payments:[{payment_id:8,amount:100}]}]});
   draw(); fireEvent.click(await screen.findByRole('button',{name:label}));
   await waitFor(()=>expect(invoiceExceptionCall).toHaveBeenCalledWith(expect.objectContaining({operation:'resolve',body:{action}})));
 });
}
it('shows history and download failures',async()=> {
   invoiceExceptionCall.mockResolvedValue({...base,events:[{history_id:1,created_at:'2026-09-24T12:00:00Z',actor_id:90013,event:'exception_reversed',detail:{reason:'NSF',payment_ids:[8],after_balance:500}}]});
   fetchFileDownload.mockRejectedValue(new Error('offline'));
   draw(); expect(await screen.findByText(/Payments 8.*Balance \$500.00/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:/Reprint original/}));
   expect(await screen.findByText('Download failed. Please try again.')).toBeInTheDocument();
});
it('shows a history load error',async()=> {
   invoiceExceptionCall.mockResolvedValue({status:500,message:'Unavailable'}); draw(); expect(await screen.findByText('Unavailable')).toBeInTheDocument();
});
it('reports the refreshed current balance after correction and shows cancellation evidence',async()=>{
 const onBalanceChange=jest.fn();
 invoiceExceptionCall.mockResolvedValue({...base,current_remaining_balance:500,events:[{history_id:2,created_at:'2026-09-25T12:00:00Z',actor_id:1,event:'exception_reversed',detail:{reversal_ids:[9],retainer_cancellations:[{retainer_id:4,amount:50}],after_balance:500}}]});
 render(<context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><InvoiceHistory invoiceID={7} onBalanceChange={onBalanceChange} /></context.Provider>);
 expect(await screen.findByText(/Reversals 9.*retainer #4 \$50.00/)).toBeInTheDocument();
 expect(onBalanceChange).toHaveBeenCalledWith(500);
});

it('explains how to reprint the complete revision package',async()=>{
 invoiceExceptionCall.mockResolvedValue({...base,revisions:[...base.revisions,{revision:1,artifact_key:'revision.zip',issued_amount:500}]});
 draw();expect(await screen.findByText(/Reprint or resend both together/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Reprint revision 1/}));
 await waitFor(()=>expect(fetchFileDownload).toHaveBeenCalledWith('revision.zip','invoice_revision_1.zip',9001,90013));
});
