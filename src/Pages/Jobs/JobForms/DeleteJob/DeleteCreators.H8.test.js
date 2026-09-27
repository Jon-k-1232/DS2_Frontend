import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {context} from '../../../../App';
import DeleteJobCategory from './DeleteJobCategory';
import DeleteJobTypes from './DeleteJobTypes';
import DeleteRetainer from '../../../Transactions/TransactionForms/DeleteTransaction/DeleteRetainer';
import DeleteJob from './DeleteJob';
import DeleteWorkDescription from '../../../WorkDescriptions/WorkDescriptionForms/DeleteWorkDescription/DeleteWorkDescription';
jest.mock('../../../../App',()=>({context:require('react').createContext({})}));
jest.mock('../../../../Components/Lookups/useJobDependencies',()=>()=>({grid:{rows:[],columns:[]},total:0,loading:false}));
jest.mock('../../../../Components/DataGrids/DataGrid',()=>()=>null);
jest.mock('../../../../Services/ApiCalls/FetchCalls',()=>({fetchCustomerProfileInformation:jest.fn().mockResolvedValue({status:200,customerPaymentData:{grid:{rows:[],columns:[]}}})}));
beforeEach(()=>require('../../../../Services/ApiCalls/FetchCalls').fetchCustomerProfileInformation.mockResolvedValue({status:200,customerPaymentData:{grid:{rows:[],columns:[]}}}));
const data={teamMembersList:{activeUserData:{activeUsers:[]}},customersList:{activeCustomerData:{activeCustomers:[]}},jobTypesList:{activeJobTypesData:{jobTypesData:[]}}};
for(const [name,Page,prop,row] of [
 ['category',DeleteJobCategory,'jobCategoryData',{customer_job_category_id:1,customer_job_category:'Tax'}],
 ['type',DeleteJobTypes,'jobTypeData',{job_type_id:1,job_description:'Return'}],
 ['retainer',DeleteRetainer,'retainerData',{retainer_id:1,customer_id:9,starting_amount:-25,current_amount:-25}],
 ['job',DeleteJob,'jobData',{customer_job_id:1,customer_id:9,job_type_id:1}],
 ['work description',DeleteWorkDescription,'workDescriptionData',{general_work_description_id:1,general_work_description:'Prepare return'}]
])test(`${name} deletion shows the creator by name`,async()=>{
 render(<MemoryRouter><context.Provider value={{loggedInUser:{accountID:9001,userID:90013}}}><Page customerData={data} {...{[prop]:{...row,created_by_user_id:90013,created_by_user_name:'Admin Person'}}}/></context.Provider></MemoryRouter>);
 expect(await screen.findByText('Admin Person')).toBeVisible();expect(screen.queryByText('Created By User ID:')).not.toBeInTheDocument();
});
