import dayjs from 'dayjs';

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
      ...extraProperties,
      ...rest
   };
};

export const formObjectForTransactionPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      selectedGeneralWorkDescriptionID: selectedItems?.selectedGeneralWorkDescription?.general_work_description_id || null,
      customerJobID: selectedItems.selectedJob.customer_job_id,
      loggedForUserID: selectedItems.selectedTeamMember.user_id,
      transactionDate: dayjs(selectedItems.selectedDate).format(),
      totalTransaction: (selectedItems.quantity * selectedItems.unitCost).toFixed(2),
      selectedRetainerID: selectedItems?.selectedRetainer?.retainer_id || null,
      transactionType: selectedItems?.initialState?.transactionType || selectedItems?.transactionType,
      quantity: selectedItems?.initialState?.quantity || selectedItems?.quantity
   });

export const formObjectForPaymentPost = (selectedItems, loggedInUser) =>
   formBaseObject(selectedItems, loggedInUser, {
      selectedJobID: selectedItems?.selectedJob?.customer_job_id || null,
      selectedRetainerID: selectedItems?.selectedRetainer?.retainer_id || null,
      loggedForUserID: selectedItems?.selectedTeamMember?.user_id || null,
      transactionDate: dayjs(selectedItems.selectedDate).format(),
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

export const formObjectForUpdateAccountPost = (selectedItems, loggedInUser) => formBaseObject(selectedItems, loggedInUser, {});

export const formObjectForAccountAddressUpdate = (selectedItems, loggedInUser) => formBaseObject(selectedItems, loggedInUser, {});

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
