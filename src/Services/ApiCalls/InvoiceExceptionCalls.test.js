import axios from 'axios';
import { invoiceExceptionCall } from './InvoiceExceptionCalls';
jest.mock('axios',()=>({get:jest.fn(),post:jest.fn()}));
beforeEach(()=>jest.clearAllMocks());
it('gets history through the scoped endpoint',async()=> {
 axios.get.mockResolvedValue({data:{status:200}});
 expect(await invoiceExceptionCall({accountID:1,userID:2,invoiceID:3})).toEqual({status:200});
 expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/invoices/3/history/1/2'));
});
it('posts the selected correction action',async()=> {
 axios.post.mockResolvedValue({data:{status:200}});
 await invoiceExceptionCall({accountID:1,userID:2,invoiceID:3,exceptionID:4,operation:'resolve',body:{action:'revision'}});
 expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/invoices/3/exceptions/4/resolve/1/2'),{action:'revision'});
});
it('preserves a server conflict message',async()=> {
 axios.post.mockRejectedValue({response:{status:409,data:{message:'locked'}}});
 expect(await invoiceExceptionCall({operation:'flag'})).toEqual({status:409,message:'locked'});
});
it('reports transport failure',async()=> {
 axios.get.mockRejectedValue(new Error('offline')); expect((await invoiceExceptionCall({})).status).toBe(500);
});
