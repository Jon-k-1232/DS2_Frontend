import dayjs from 'dayjs';
import { sixMinuteIncrementTimeCalculation } from './TimeTrackingIncrements';

/**
 * Conditionally toggle 'isTransactionBillable' based on recurring logic
 */
export const handleBillableStatus = (customer, isInAdditionToMonthlyCharge, currentBillable) => {
   if (customer?.is_recurring && !isInAdditionToMonthlyCharge && currentBillable) {
      return false;
   }
   if (customer?.is_recurring && isInAdditionToMonthlyCharge && !currentBillable) {
      return true;
   }
   return currentBillable;
};

/**
 * Perform the time calculation and update the parent state's quantity & unitCost
 */
export const handleTimeCalculation = (minuteDuration, selectedTeamMember, startTime, endTime, updateSelectedItems) => {
   if (!selectedTeamMember || !minuteDuration || isNaN(minuteDuration)) {
      updateSelectedItems('quantity', 1);
      updateSelectedItems('unitCost', 0);

      if (!selectedTeamMember) {
         alert('Please select a team member and enter a valid time duration');
      }
      return;
   }

   const loggedTime = sixMinuteIncrementTimeCalculation(startTime, endTime, minuteDuration);
   const employeeRate = selectedTeamMember.billing_rate;

   if (!isNaN(loggedTime) && !isNaN(employeeRate)) {
      updateSelectedItems('quantity', loggedTime);
      updateSelectedItems('unitCost', employeeRate);
   }
};

/**
 * Create or update the 'selectedItems' state based on passedTransactionData.
 */
export const populateState = (passedTransactionData, customerData, initialState) => {
   const { category, date, duration, notes, user_id, timesheet_entry_id, ai_suggestion, company_name, first_name, last_name } = passedTransactionData || {};

   const {
      customersList: { activeCustomerData: { activeCustomers = [] } = {} } = {},
      teamMembersList: { activeUserData: { activeUsers = [] } = {} } = {},
      workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions = [] } = {} } = {},
      accountJobsList: { activeJobData: { activeJobs = [] } = {} } = {}
   } = customerData || {};

   // Try to prefill the customer without using AI by matching names
   const normalize = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');
   const company = normalize(company_name);
   const first = normalize(first_name);
   const last = normalize(last_name);
   const fullNameSpace = first && last ? `${first} ${last}` : '';
   const fullNameComma = first && last ? `${last}, ${first}` : '';

   const foundCustomer =
      activeCustomers.find(c => {
         const display = normalize(c?.display_name);
         return (company && display === company) || (fullNameSpace && display === fullNameSpace) || (fullNameComma && display === fullNameComma);
      }) || null;

   const foundTeamMember = activeUsers.find(u => u.user_id === user_id);
   const foundWorkDescription =
      workDescriptions.find(jobType => jobType.general_work_description_id === ai_suggestion?.suggested_general_work_description_id) ||
      workDescriptions.find(jobType => jobType.general_work_description?.toLowerCase() === (category || '').toLowerCase());

   // Pre-select a job for this customer if the tracker category matches an open job's job_description.
   // Uses word-overlap so "Computer Maintenance" → "Computer Maintenance/Updates" picks up.
   const wordsOf = s => normalize(s).split(/\s+/).filter(w => w.length >= 4);
   const catWords = wordsOf(category);
   let foundJob = null;
   if (foundCustomer && catWords.length > 0) {
      const customerOpenJobs = activeJobs.filter(
         j => Number(j.customer_id) === Number(foundCustomer.customer_id) && !j.is_job_complete && !j.parent_job_id
      );
      const scored = customerOpenJobs
         .map(j => {
            const jdWords = wordsOf(j.job_description);
            const overlap = catWords.filter(c => jdWords.includes(c)).length;
            return { j, overlap, age: new Date(j.created_at).getTime() || 0 };
         })
         .filter(s => s.overlap > 0)
         .sort((a, b) => b.overlap - a.overlap || b.age - a.age);
      foundJob = scored[0]?.j || null;
   }

   return {
      ...initialState,
      selectedCustomer: foundCustomer || initialState.selectedCustomer,
      selectedJob: foundJob,
      selectedTeamMember: foundTeamMember || null,
      selectedGeneralWorkDescription: foundWorkDescription || null,
      detailedJobDescription: notes || '',
      // Default to current time if date not provided
      selectedDate: date ? dayjs(date) : dayjs(),
      minutes: duration || '',
      timesheetEntryID: timesheet_entry_id || null,
      aiSuggestion: ai_suggestion || null,
      // Preserve original category text when provided, else fallback to matched work description label
      category: category || foundWorkDescription?.general_work_description || null
   };
};
