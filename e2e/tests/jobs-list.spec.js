const { test, expect } = require('../lib/fixtures');
const { createCustomer, createJob, addTransaction, fillQuickFilter, routes, submit, deleteCustomer } = require('../lib/ui');

// "Create" is already exercised by lib/ui.js's createJob() helper, shared with
// jobs-and-transactions.spec.js — this file covers the piece that wasn't
// covered yet: the re-parent/delete guard that appears once a job has billing
// history linked to it.
test.describe('Jobs list', () => {
  test('delete guard shows linked transactions and disables Delete Job when a job has a transaction', async ({ page, prefix }) => {
    const customer = await createCustomer(page, prefix);
    await createJob(page, customer);
    const timeRow = await addTransaction(page, customer);

    await page.goto(routes.jobs);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: customer.name }).click();
    await expect(page).toHaveURL(/jobsList\/deleteJob$/);
    const deleteJobButton = page.getByRole('button', { name: 'Delete Job', exact: true });
    await expect(deleteJobButton).toBeDisabled();
    await expect(page.getByText('Before deletion, please re-parent the following items:', { exact: true })).toBeVisible();
    // job-router.js's own DELETE /jobs/deleteJob independently refuses this
    // (Transactions are linked to this job...) even if the disabled button
    // were somehow bypassed — the grid below is the same backend-computed
    // link the disabled state relies on.
    await expect(page.getByText('Linked Transactions', { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `${prefix} Time` })).toBeVisible();

    // Clear the guard by deleting the transaction first (unbilled — UI delete
    // is available), then the job becomes deletable.
    await page.goto(routes.transactions);
    await page.getByPlaceholder('Search transactions').fill(prefix);
    await timeRow.click();
    await page.getByRole('button', { name: 'Delete Transaction', exact: true }).click();
    await submit(page, page.getByRole('dialog'), '/transactions/delete', 'Delete');

    await page.goto(routes.jobs);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: customer.name }).click();
    await expect(page).toHaveURL(/jobsList\/deleteJob$/);
    await expect(page.getByText('Before deletion, please re-parent the following items:', { exact: true })).toHaveCount(0);
    await expect(deleteJobButton).toBeEnabled();
    await deleteJobButton.click();
    await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete this job?');
    await submit(page, page.getByRole('dialog'), '/jobs/delete', 'Delete');
    await expect(page).toHaveURL(/jobsList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: customer.name })).toHaveCount(0);

    await deleteCustomer(page, customer);
  });
});

test.describe('Jobs list: edit', () => {
  // FIXED: editJob route is no longer commented out (JobSubRoutes.js) —
  // EditJob.js (renaming via Type Of Job/Job Notes, toggling "Is Job
  // Complete?", and reassigning to a different customer, which exercises the
  // backend reassign guard in job-router.js:145-198: "Cannot reassign this
  // job to a different customer: transactions are linked to it...") is
  // reachable via the "Edit Job" tab in PageNavigationHeader, alongside
  // "Delete Job". A row click still lands on the delete view first
  // (routeToPass is unchanged — the active delete-guard test above depends
  // on that), so reach edit the same way a real user now would: click the
  // row, then switch tabs.
  test('edit a job (rename, mark complete) through the UI', async ({ page, prefix }) => {
    const customer = await createCustomer(page, prefix);
    await createJob(page, customer);
    await page.goto(routes.jobs);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: customer.name }).click();
    await expect(page).toHaveURL(/jobsList\/deleteJob$/);
    await page.getByRole('tab', { name: 'Edit Job', exact: true }).click();
    await expect(page).toHaveURL(/jobsList\/editJob$/);
    // Lands on an editable job form pre-filled from the clicked row
    // (NewJobSelections, same fields createJob() uses), toggle completion,
    // and submit.
    await expect(page.getByLabel('Job Notes', { exact: true })).toHaveValue(prefix);
    await page.getByLabel('Is Job Complete?', { exact: true }).check();
    await submit(page, page, '/jobs/updateJob/', 'Submit');
    await expect(page).toHaveURL(/jobsList$/);
  });
});
