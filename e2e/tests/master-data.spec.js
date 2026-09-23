const { test, expect } = require('../lib/fixtures');
const { openForm, submit, closeForm, choose, fillQuickFilter } = require('../lib/ui');
const { rows, literal } = require('../lib/db');

// Job Categories, Job Types and Work Descriptions all share one product
// pattern worth noting up front: each grid's row click (DataGridTable's
// routeToPass) navigates straight to that type's DELETE view, same as
// before — that part is unchanged and still covered by the active
// (non-edit) tests below. What WAS broken: Edit* components exist in the
// codebase (EditJobCategory.js, EditJobTypes.js, EditWorkDescription.js) but
// their routes were commented out in the matching *SubRoutes.js file, with
// no way to reach them at all. Fixed by uncommenting each editX Route and
// its matching PageNavigationHeader menu option, so "Edit ..." now sits
// alongside "Delete ..." as a tab once you've clicked into a row — the
// dedicated edit tests below click the row (still lands on delete, per the
// unchanged routeToPass) and then that Edit tab. Add + Delete are real,
// wired features and are covered as normal active tests.
//
// IMPORTANT Playwright quirk: test.fixme(condition, reason) called directly
// inside a test.describe() body marks EVERY test in that ENTIRE describe
// block as fixme — including ones declared before the call — not just the
// next test() (confirmed empirically). Any fixme'd test in this file must
// therefore live in its own single-test describe so it can't swallow its
// neighbors.
//
// None of the three underlying tables (customer_job_categories,
// customer_job_types, customer_general_work_descriptions) has a unique
// constraint on its name column, and none of the three create routers
// (jobCategories-router.js, jobType-router.js, workDescriptions-router.js)
// checks for an existing duplicate before inserting — confirmed by reading
// all three. So "duplicate-name refusal shown in the UI where the backend
// refuses it" does not apply to any of these three master-data types: the
// backend does not refuse a duplicate name. The Job Categories test below
// verifies the real (non-refusing) behavior instead of asserting a refusal
// that would never happen.

test.describe('Job Categories', () => {
  test('add a job category, confirm no duplicate-name refusal exists, then delete', async ({ page, prefix }) => {
    const name = `${prefix} Category`;
    let dialog = await openForm(page, '/jobs/jobCategoriesList', 'Add a New Job Category');
    await dialog.getByLabel('New Job Category', { exact: true }).fill(name);
    await submit(page, dialog, '/jobCategories/createJobCategory/');
    await closeForm(page);
    // This grid (DataGridTable, pageSize=5) now carries ~20 pre-existing rows
    // from concurrent activity on this shared sandbox — without narrowing,
    // a freshly-created row (sorted after all of them) can land on a page
    // that isn't shown by default. Quick-filter to just this run's prefix.
    await fillQuickFilter(page, prefix);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    const created = () => rows(`SELECT customer_job_category_id, is_job_category_active FROM customer_job_categories WHERE account_id=9001 AND customer_job_category=${literal(name)} ORDER BY customer_job_category_id`);
    expect(created()).toHaveLength(1);
    expect(created()[0].is_job_category_active).toBe(true);

    // Submitting the identical name again succeeds a second time rather than
    // being refused — real behavior given no uniqueness is enforced anywhere.
    dialog = await openForm(page, '/jobs/jobCategoriesList', 'Add a New Job Category');
    await dialog.getByLabel('New Job Category', { exact: true }).fill(name);
    await submit(page, dialog, '/jobCategories/createJobCategory/');
    await closeForm(page);
    await fillQuickFilter(page, prefix);
    expect(created()).toHaveLength(2);

    // DeleteJobCategory.js:107's button used to read "Delete Job Type" and
    // :134's confirmation used to read "Are you sure you want to delete this
    // job type?" — both copy/pasted from DeleteJobTypes.js. Fixed to say
    // "Job Category" — assert the corrected labels below.
    await row.first().click();
    await expect(page).toHaveURL(/jobCategoriesList\/deleteJobCategory$/);
    await expect(page.getByRole('table')).toContainText(name);
    const deleteButton = page.getByRole('button', { name: 'Delete Job Category', exact: true });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete this job category?');
    await submit(page, page.getByRole('dialog'), '/jobCategories/deleteJobCategory/', 'Delete');
    await expect(page).toHaveURL(/jobCategoriesList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1); // one of the two duplicates remains
  });
});

test.describe('Job Categories: edit', () => {
  // FIXED: editJobCategory route is no longer commented out
  // (JobCategorySubRoutes.js) — EditJobCategory.js is reachable via the
  // "Edit Job Category" tab in PageNavigationHeader, which now sits
  // alongside "Delete Job Category". The grid's own row click still lands on
  // the delete view first (routeToPass is unchanged, and the active "Job
  // Categories" test above depends on that), so this test reaches edit the
  // same way a real user now would: click the row, then switch tabs.
  test('edit a job category through the UI', async ({ page, prefix }) => {
    const name = `${prefix} Category`;
    const renamed = `${prefix} Category Renamed`;
    const dialog = await openForm(page, '/jobs/jobCategoriesList', 'Add a New Job Category');
    await dialog.getByLabel('New Job Category', { exact: true }).fill(name);
    await submit(page, dialog, '/jobCategories/createJobCategory/');
    await closeForm(page);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: name }).click();
    await expect(page).toHaveURL(/jobCategoriesList\/deleteJobCategory$/);
    await page.getByRole('tab', { name: 'Edit Job Category', exact: true }).click();
    await expect(page).toHaveURL(/jobCategoriesList\/editJobCategory$/);
    await expect(page.getByLabel('New Job Category', { exact: true })).toHaveValue(name);
    await page.getByLabel('New Job Category', { exact: true }).fill(renamed);
    await submit(page, page, '/jobCategories/updateJobCategory/', 'Submit');
    await expect(page).toHaveURL(/jobCategoriesList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: renamed })).toBeVisible();
  });
});

async function addCategory(page, name) {
  const dialog = await openForm(page, '/jobs/jobCategoriesList', 'Add a New Job Category');
  await dialog.getByLabel('New Job Category', { exact: true }).fill(name);
  await submit(page, dialog, '/jobCategories/createJobCategory/');
  await closeForm(page);
}

test.describe('Job Types', () => {
  test('add and delete a job type through the UI', async ({ page, prefix }) => {
    const categoryName = `${prefix} Category`;
    await addCategory(page, categoryName);

    const typeName = `${prefix} Type`;
    const dialog = await openForm(page, '/jobs/jobTypesList', 'Add New Type of Job');
    await dialog.getByLabel('Job Description', { exact: true }).fill(typeName);
    await choose(page, dialog, 'Job Category', categoryName);
    await dialog.getByLabel('Book Rate', { exact: true }).fill('150');
    await dialog.getByLabel('Estimated Time In Hours', { exact: true }).fill('3');
    await submit(page, dialog, '/jobTypes/createJobType/');
    await closeForm(page);
    await fillQuickFilter(page, prefix);
    const row = page.getByRole('row').filter({ hasText: typeName });
    await expect(row).toBeVisible();
    const [created] = rows(`SELECT job_type_id, is_job_type_active, book_rate, estimated_straight_time FROM customer_job_types WHERE account_id=9001 AND job_description=${literal(typeName)}`);
    expect(created).toBeTruthy();
    expect(created.is_job_type_active).toBe(true);
    expect(Number(created.book_rate)).toBe(150);
    expect(Number(created.estimated_straight_time)).toBe(3);

    await row.click();
    await expect(page).toHaveURL(/jobTypesList\/deleteJobType$/);
    await expect(page.getByRole('table')).toContainText(typeName);
    await page.getByRole('button', { name: 'Delete Job Type', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete this job type?');
    await submit(page, page.getByRole('dialog'), '/jobTypes/deleteJobType/', 'Delete');
    await expect(page).toHaveURL(/jobTypesList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: typeName })).toHaveCount(0);
  });
});

test.describe('Job Types: edit', () => {
  // FIXED: editJobType route is no longer commented out (JobTypeSubRoutes.js)
  // — same "row click still opens delete first, Edit sits alongside it in
  // PageNavigationHeader" shape as Job Categories above.
  test('edit a job type through the UI', async ({ page, prefix }) => {
    const categoryName = `${prefix} Category`;
    await addCategory(page, categoryName);
    const typeName = `${prefix} Type`;
    const renamed = `${prefix} Type Renamed`;
    const dialog = await openForm(page, '/jobs/jobTypesList', 'Add New Type of Job');
    await dialog.getByLabel('Job Description', { exact: true }).fill(typeName);
    await choose(page, dialog, 'Job Category', categoryName);
    await submit(page, dialog, '/jobTypes/createJobType/');
    await closeForm(page);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: typeName }).click();
    await expect(page).toHaveURL(/jobTypesList\/deleteJobType$/);
    await page.getByRole('tab', { name: 'Edit Job Type', exact: true }).click();
    await expect(page).toHaveURL(/jobTypesList\/editJobType$/);
    await expect(page.getByLabel('Job Description', { exact: true })).toHaveValue(typeName);
    await page.getByLabel('Job Description', { exact: true }).fill(renamed);
    await submit(page, page, '/jobTypes/updateJobType/', 'Submit');
    await expect(page).toHaveURL(/jobTypesList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: renamed })).toBeVisible();
  });
});

test.describe('Work Descriptions', () => {
  test('add and delete a work description through the UI', async ({ page, prefix }) => {
    const name = `${prefix} Work Description`;
    const dialog = await openForm(page, '/jobs/workDescriptionsList', 'Add Work Description');
    await dialog.getByLabel('Generalized Work Description', { exact: true }).fill(name);
    await dialog.getByLabel('Estimated Time For Task', { exact: true }).fill('2');
    await submit(page, dialog, '/workDescriptions/createWorkDescription/');
    await closeForm(page);
    // This grid also now carries ~20 pre-existing rows from concurrent
    // activity on this shared sandbox (pageSize=5) — narrow before looking.
    await fillQuickFilter(page, prefix);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    const [created] = rows(`SELECT general_work_description_id, is_general_work_description_active, estimated_time FROM customer_general_work_descriptions WHERE account_id=9001 AND general_work_description=${literal(name)}`);
    expect(created).toBeTruthy();
    expect(created.is_general_work_description_active).toBe(true);
    expect(Number(created.estimated_time)).toBe(2);

    await row.click();
    await expect(page).toHaveURL(/workDescriptionsList\/deleteWorkDescription$/);
    await expect(page.getByRole('table')).toContainText(name);
    await page.getByRole('button', { name: 'Delete Work Description', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete this work description?');
    await submit(page, page.getByRole('dialog'), '/workDescriptions/deleteWorkDescription/', 'Delete');
    await expect(page).toHaveURL(/workDescriptionsList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  });
});

test.describe('Work Descriptions: edit', () => {
  // FIXED: editWorkDescription route is no longer commented out
  // (WorkDescriptionSubRoutes.js) — same shape as the two above.
  test('edit a work description through the UI', async ({ page, prefix }) => {
    const name = `${prefix} Work Description`;
    const renamed = `${prefix} Work Description Renamed`;
    const dialog = await openForm(page, '/jobs/workDescriptionsList', 'Add Work Description');
    await dialog.getByLabel('Generalized Work Description', { exact: true }).fill(name);
    await dialog.getByLabel('Estimated Time For Task', { exact: true }).fill('2');
    await submit(page, dialog, '/workDescriptions/createWorkDescription/');
    await closeForm(page);
    await fillQuickFilter(page, prefix);
    await page.getByRole('row').filter({ hasText: name }).click();
    await expect(page).toHaveURL(/workDescriptionsList\/deleteWorkDescription$/);
    await page.getByRole('tab', { name: 'Edit Work Description', exact: true }).click();
    await expect(page).toHaveURL(/workDescriptionsList\/editWorkDescription$/);
    await expect(page.getByLabel('Generalized Work Description', { exact: true })).toHaveValue(name);
    await page.getByLabel('Generalized Work Description', { exact: true }).fill(renamed);
    await submit(page, page, '/workDescriptions/updateWorkDescription/', 'Submit');
    await expect(page).toHaveURL(/workDescriptionsList$/);
    await fillQuickFilter(page, prefix);
    await expect(page.getByRole('row').filter({ hasText: renamed })).toBeVisible();
  });
});

test.describe('Work Descriptions: failed submission', () => {
  // FIXED: AddWorkDescription.js:23 used to call setPostStatus() with no
  // argument (instead of setPostStatus(postedItem)) right after every
  // submit, so a failed create never showed its error Alert — the sibling
  // Add forms (NewJobCategory.js, NewJobType.js) always called
  // setPostStatus(postedItem) correctly. Reproduced with a fractional
  // "Estimated Time For Task" (estimated_time is an integer column with no
  // rounding in restoreDataTypesWorkDescriptionTableOnCreate, so Postgres
  // rejects the insert) and confirmed via network response below.
  test('a failed submission shows its error message', async ({ page, prefix }) => {
    const name = `${prefix} Bad Work Description`;
    const dialog = await openForm(page, '/jobs/workDescriptionsList', 'Add Work Description');
    await dialog.getByLabel('Generalized Work Description', { exact: true }).fill(name);
    await dialog.getByLabel('Estimated Time For Task', { exact: true }).fill('1.5');
    const responsePromise = page.waitForResponse(r => r.url().includes('/workDescriptions/createWorkDescription/') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
    const body = await (await responsePromise).json();
    expect(body.status).not.toBe(200);
    await expect(dialog.getByRole('alert')).toContainText(body.message);
  });
});
