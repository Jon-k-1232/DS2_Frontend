import axios from 'axios';
import {deleteRetainer} from './DeleteCalls';
jest.mock('axios',()=>({delete:jest.fn()}));
test('retainer deletion preserves the server failure for its form to display',async()=>{
 const error={response:{status:409,data:{message:'Sent and locked'}}};
 axios.delete.mockRejectedValue(error);
 await expect(deleteRetainer(4,9001,90013)).rejects.toBe(error);
});
