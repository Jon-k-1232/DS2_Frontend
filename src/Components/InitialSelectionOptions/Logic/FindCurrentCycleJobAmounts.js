const findCurrentCycleJobAmounts = customerTransactionData => {
   // Group transactions by job ID
   const transactionGroups = customerTransactionData.reduce((acc, transaction) => {
      const identifier = transaction.customer_job_id;
      if (!acc[identifier]) acc[identifier] = [];
      acc[identifier].push(transaction);
      return acc;
   }, {});

   // Filter and sum transactions based on conditions
   return Object.entries(transactionGroups).map(([jobId, transactions]) => {
      // Filter transactions based on your conditions
      const filteredTransactions = transactions.filter(transaction => transaction.is_transaction_billable && !transaction.retainer_id && !transaction.customer_invoice_id);

      // Calculate the total amount for each group
      const totalAmount = filteredTransactions.reduce((acc, transaction) => acc + Number(transaction.total_transaction), 0);

      // Get the first transaction for additional data
      const firstTransaction = transactions[0] || {};

      return {
         total_transaction: totalAmount,
         account_id: firstTransaction.account_id,
         customer_id: firstTransaction.customer_id,
         customer_job_id: firstTransaction.customer_job_id,
         job_description: firstTransaction.job_description
      };
   });
};

export default findCurrentCycleJobAmounts;
