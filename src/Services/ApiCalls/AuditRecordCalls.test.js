import axios from 'axios';
import * as calls from './AuditRecordCalls';
jest.mock('axios',()=>({get:jest.fn(),post:jest.fn()}));
const ids={accountID:1,userID:2,customerID:7};
beforeEach(()=>{jest.clearAllMocks();axios.get.mockResolvedValue({data:{status:200}});axios.post.mockResolvedValue({data:{status:201}});});
it('uses account/customer-scoped routes, exact range and record identity',async()=>{
 await calls.fetchAuditRecord(ids,{limit:25,offset:25});expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('/auditRecord/customer/7/1/2'),{params:{limit:25,offset:25}});
 await calls.fetchPrintedRecords(ids,25);expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('/records'),{params:{offset:25,limit:25}});
 await calls.printAuditRecord(ids,{startDate:'2026-01-01'});expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/records'),{startDate:'2026-01-01'});
 await calls.verifyAuditRecord(ids,'record-1');expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('/records/record-1/verify'));
});
it('propagates failures instead of pretending a record was printed',async()=>{axios.post.mockRejectedValue(Error('offline'));await expect(calls.printAuditRecord(ids,{})).rejects.toThrow('offline');});
it('downloads the stored PDF and releases the object URL',async()=>{jest.useFakeTimers();window.URL.createObjectURL=jest.fn(()=> 'blob:saved');window.URL.revokeObjectURL=jest.fn();const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await calls.openAuditRecord(ids,'record-1');expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('/records/record-1/pdf'),{responseType:'blob'});expect(click).toHaveBeenCalled();jest.runOnlyPendingTimers();expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:saved');click.mockRestore();jest.useRealTimers();});
