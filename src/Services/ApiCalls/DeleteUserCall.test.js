import axios from 'axios';
import config from '../../config';
import {deleteUser} from './DeleteCalls';
jest.mock('axios',()=>({delete:jest.fn()}));
beforeEach(()=>jest.clearAllMocks());
test('user deletion uses the tenant and target user IDs with JSON headers',async()=>{
 axios.delete.mockResolvedValue({data:{status:200}});await expect(deleteUser(99,9001)).resolves.toEqual({status:200});expect(axios.delete).toHaveBeenCalledWith(config.API_ENDPOINT+'/user/deleteUser/9001/99',{headers:{'content-type':'application/json'}});
});
test('a failed user deletion reaches the form error handler instead of returning undefined',async()=>{
 const error={response:{status:500,data:{message:'Unavailable'}}};axios.delete.mockRejectedValue(error);await expect(deleteUser(99,9001)).rejects.toBe(error);expect(axios.delete).toHaveBeenCalledTimes(1);
});
