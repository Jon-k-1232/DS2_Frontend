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
   const { category, company_name, date, duration, first_name, last_name, notes, user_id, timesheet_entry_id } = passedTransactionData || {};

   const {
      customersList: { activeCustomerData: { activeCustomers = [] } = {} } = {},
      teamMembersList: { activeUserData: { activeUsers = [] } = {} } = {},
      workDescriptionsList: { activeWorkDescriptionsData: { workDescriptions = [] } = {} } = {}
   } = customerData || {};

   const foundCustomer = activeCustomers.find(c => c.display_name === `${first_name} ${last_name}` || c.display_name === company_name);
   const foundTeamMember = activeUsers.find(u => u.user_id === user_id);
   const foundWorkDescription = workDescriptions.find(jobType => jobType.general_work_description?.toLowerCase() === category?.toLowerCase());

   return {
      ...initialState,
      selectedCustomer: foundCustomer || null,
      selectedJob: null,
      selectedTeamMember: foundTeamMember || null,
      selectedGeneralWorkDescription: foundWorkDescription || null,
      detailedJobDescription: notes || '',
      // Default to current time if date not provided
      selectedDate: date ? dayjs(date) : dayjs(),
      minutes: duration || '',
      timesheetEntryID: timesheet_entry_id || null
   };
};
