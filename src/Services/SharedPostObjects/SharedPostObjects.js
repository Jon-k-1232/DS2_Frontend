import { priceQuantity } from '../../Pages/Transactions/TransactionForms/AddTransaction/FormSubComponents/TimeTrackingIncrements';
import dayjs from 'dayjs';

// Calendar-date-only formatter. A raw dayjs object (or a `.format()` call with
// no pattern) serializes over the wire as a full local-offset or UTC ISO
// timestamp; once the backend reads that back it can land on a different
// calendar day than the one the user picked (an evening entry shifts to the
// next day). Every date field that means "this calendar day" — writeoff_date,
// payment_date, transaction_date — must cross the wire as a bare 'YYYY-MM-DD'
// string instead, which no timezone conversion can move.
const formatCalendarDate = value => (value ? dayjs(value).format('YYYY-MM-DD') : value);

const formBaseObject = (selectedItems, loggedInUser, extraProperties) => {
   const { accountID, userID } = loggedInUser;
   const {
      selectedCustomer,
      selectedCustomers,
      accessLevel,
      customerFirstName,
      customerLastName,
      customerJobCategory,
      selectedJob,
      selectedRetainer,
      agreedJobAmount,
      writeOffReason,
      customerInvoicesID,
      selectedDate,
      ...rest
   } = selectedItems;

   return {
      accountID,
      customerInvoicesID: customerInvoicesID || null,
      customerName: `${selectedCustomer?.customerFirstName}${selectedCustomer?.customerLastName}`,
      customerID: selectedCustomer?.customer_id || selectedCustomers?.customerID,
      recurringCustomerID: selectedCustomer?.recurringCustomerID,
      loggedByUserID: userID,
      agreedJobAmount: selectedItems?.agreedJobAmount,
      selectedRetainerID: selectedItems?.selectedRetainer?.retainer_id,
      selectedJobID: selectedItems?.selectedJob?.customer_job_id,
      customerJobCategory: selectedItems?.customerJobCategory?.customer_job_category_id || null,
      writeOffReason: selectedItems?.writeOffReason,
      note: selectedItems?.note,
      // Write-offs and retainers read this raw `selectedDate` field directly
      // (see writeOffsObjects.js) — keep it calendar-date-safe by default so
      // any caller that doesn't rename it into a type-specific field below
      // still gets a safe value instead of a raw dayjs object.
      selectedDate: formatCalendarDate(selectedDate),
      ...extraProperties,
      ...rest
   };
};

export const formObjectForTransactionPost = (selectedItems, loggedInUser) => {
   // Exclude initialState from selectedItems. removed initialState from selectedItems, not needed for 'time'
   const { initialState, ...filteredItems } = selectedItems;

   return formBaseObject(filteredItems, loggedInUser, {
      selectedGeneralWorkDescriptionID: filteredItems?.selectedGeneralWorkDescription?.general_work_description_id || null,
      customerJobID: filteredItems.selectedJob?.customer_job_id,
      loggedForUserID: filteredItems.selectedTeamMember?.user_id,
      transactionDate: formatCalendarDate(filteredItems.selectedDate),
      totalTransaction: priceQuantity(filteredItems.quantity, filteredItems.unitCost).toFixed(2),
      selectedRetainerID: filteredItems?.selectedRetainer?.retainer_id || null,
      transactionType: filteredItems?.transactionType,
      quantity: filteredItems?.quantity,
      // Provide safe provenance and AI suggestion metadata
      timesheetEntryID: filteredItems?.timesheetEntryID || null,
      aiSuggestion: filteredItems?.aiSuggestion || null,
      minutes: filteredItems?.minutes || null,
      entity: filteredItems?.entity || null,
      category: filteredItems?.category || null
   });
};

export const formObjectForPaymentPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      selectedJobID: selectedItems?.selectedJob?.customer_job_id || null,
      selectedRetainerID: selectedItems?.selectedRetainer?.retainer_id || null,
      loggedForUserID: selectedItems?.selectedTeamMember?.user_id || null,
      transactionDate: formatCalendarDate(selectedItems.selectedDate),
      note: selectedItems?.note || null,
      foundInvoiceID: selectedItems?.foundInvoiceID || null,
      selectedInvoiceID: selectedItems?.selectedInvoice?.customer_invoice_id || null
   });

export const formObjectForWriteOffPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      selectedJobID: selectedItems?.selectedJob?.customer_job_id || null,
      loggedForUserID: selectedItems?.selectedTeamMember?.user_id || null,
      writeOffReason: selectedItems?.writeOffReason || null,
      customerInvoiceID: selectedItems?.selectedInvoice?.customer_invoice_id || null,
      writeOffID: selectedItems?.writeOffID || null
   });

export const formObjectForCustomerPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      userID: loggedInUser.userID,
      customerName: `${selectedItems.customerFirstName} ${selectedItems.customerLastName}`,
      recurringCustomerID: selectedItems.recurringCustomerID,
      recurringAmount: selectedItems.recurringAmount,
      dateCreated: dayjs().format()
   });

export const formObjectForJobPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      userID: loggedInUser.userID,
      agreedJobAmount: selectedItems.agreedJobAmount,
      jobTypeID: selectedItems.selectedJobDescription.job_type_id
   });

export const formObjectForJobTypePost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      userID: loggedInUser.userID,
      customerJobCategory: selectedItems.customerJobCategory.customer_job_category_id
   });

export const formObjectForJobCategoryPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      category: selectedItems.selectedNewJobCategory,
      isActive: true,
      createdBy: loggedInUser.userID
   });

export const formObjectForTeamMemberPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      accessLevel: selectedItems.accessLevel.value,
      costRate: selectedItems.costRate,
      billingRate: selectedItems.billingRate
   });

// account-router.js's PUT /account/updateAccount reads req.body.account straight
// into restoreDataTypesAccountOnUpdate/restoreDataTypesAccountInformationOnUpdate
// (accountObjects.js), which pull DB-shaped snake_case keys (account_name,
// account_street, is_this_address_active, ...) — not the camelCase field names
// the settings forms use locally. Map explicitly rather than relying on
// formBaseObject's generic customer/transaction-shaped passthrough, whose keys
// don't match either.
export const formObjectForUpdateAccountPost = selectedItems => ({
   account_id: selectedItems.accountID || undefined,
   account_name: selectedItems.accountName,
   account_type: selectedItems.accountType,
   account_statement: selectedItems.accountStatement,
   account_interest_statement: selectedItems.accountInterestStatement,
   account_invoice_template_option: selectedItems.template
   // Note: logo upload isn't wired here — account_company_logo expects an S3
   // key string, and the settings form currently collects a raw File with no
   // upload pathway to produce one, so it's intentionally left unsent rather
   // than posting an unusable value.
});

export const formObjectForAccountAddressUpdate = selectedItems => ({
   account_info_id: selectedItems.accountInfoID || undefined,
   account_id: selectedItems.accountID || undefined,
   account_street: selectedItems.customerStreet,
   account_city: selectedItems.customerCity,
   account_state: selectedItems.customerState,
   account_zip: selectedItems.customerZip,
   account_email: selectedItems.customerEmail,
   account_phone: selectedItems.customerPhone,
   is_this_address_active: selectedItems.isThisAddressActive,
   is_account_physical_address: selectedItems.isCustomerPhysicalAddress,
   is_account_billing_address: selectedItems.isCustomerBillingAddress,
   is_account_mailing_address: selectedItems.isCustomerMailingAddress
});

export const formObjectForInvoiceCreation = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      createInvoicesOnCustomerIDs: selectedItems.selectedCustomers.map(customer => customer.customer_id)
   });

export const formObjectForNewRecurringCustomerPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      userID: loggedInUser.userID,
      subscriptionFrequency: selectedItems.selectedFrequency,
      customerName: selectedItems.selectedCustomer.customer_name,
      customerID: selectedItems.selectedCustomer.customer_id,
      recurringAmount: selectedItems.recurringAmount,
      startDate: selectedItems.start_date,
      billingCycle: selectedItems.selectedBillingDay
   });

export const formObjectForRetainerPost = (selectedItems, loggedInUser) => formBaseObject(selectedItems, loggedInUser, {});
