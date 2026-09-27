import {act,renderHook} from '@testing-library/react';
import useWorkspaceData from './useWorkspaceData';
import {getInitialAppData} from '../Services/ApiCalls/FetchCalls';
jest.mock('../Services/ApiCalls/FetchCalls',()=>({getInitialAppData:jest.fn(),fetchSingleUser:jest.fn()}));
const user={accountID:9001,userID:90013,token:'session',displayName:'Admin',accessLevel:'admin'};
const setUser=jest.fn();
beforeEach(()=>jest.clearAllMocks());
test('late data from another session cannot replace the current reference lists',async()=>{
 const requests=[];getInitialAppData.mockImplementation(()=>new Promise(resolve=>requests.push(resolve)));
 const {result,rerender}=renderHook(props=>useWorkspaceData(props,setUser),{initialProps:user});
 expect(result.current.loading).toBe(true);rerender({...user,accountID:9002});
 await act(async()=>requests[1]({status:200,clients:['Current']}));await act(async()=>requests[0]({status:200,clients:['Old']}));
 expect(result.current.customerData.clients).toEqual(['Current']);
});
test('reference failures are visible and a retry restores the complete context',async()=>{
 getInitialAppData.mockResolvedValueOnce([]).mockResolvedValue({status:200,clients:['A','B']});const {result}=renderHook(()=>useWorkspaceData(user,setUser));await act(async()=>{});expect(result.current.error).toMatch(/Unable to load/);await act(async()=>result.current.retry());expect(result.current.customerData.clients).toEqual(['A','B']);expect(result.current.error).toBeUndefined();
});
test('mutation refreshes apply only to the owning session and unauthenticated sessions do not load',async()=>{
 getInitialAppData.mockResolvedValue({status:200,clients:['A','B']});const {result,rerender}=renderHook(props=>useWorkspaceData(props,setUser),{initialProps:user});await act(async()=>{});const staleSetter=result.current.setCustomerData;rerender({...user,accountID:9002});await act(async()=>{});act(()=>staleSetter({clients:['Wrong']}));expect(result.current.customerData.clients).toEqual(['A','B']);rerender({});expect(result.current.customerData).toEqual({});expect(result.current.error).toBeUndefined();
});
test('signing in again as the same user rejects refreshes from the previous session',async()=>{
 getInitialAppData.mockResolvedValueOnce({status:200,clients:['Old session']}).mockResolvedValue({status:200,clients:['New session']});
 const {result,rerender}=renderHook(props=>useWorkspaceData(props,setUser),{initialProps:user});await act(async()=>{});
 const oldRefresh=result.current.setCustomerData;rerender({...user,token:'new-session'});await act(async()=>{});
 act(()=>oldRefresh({clients:['Stale mutation']}));expect(result.current.customerData.clients).toEqual(['New session']);
});
