const { test, expect } = require('../lib/fixtures');
const { trackerBuffer } = require('../lib/tracker');
const { rows, literal } = require('../lib/db');
const { rememberObject } = require('../lib/storage');

test('upload clean XLSX for user 90013 and retain unprocessed entries with AI off', async ({page,prefix},testInfo) => {
  const {buffer,count} = trackerBuffer(prefix);
  await page.goto('/time-tracking/upload');
  await expect(page.getByRole('combobox',{name:'Submitting For'})).toContainText('Admin Person');
  await page.locator('input[type=file]').setInputFiles({name:`${prefix}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  const responsePromise = page.waitForResponse(r => r.url().includes('/time-tracking/upload/9001/90013') && r.request().method()==='POST');
  await page.getByRole('button',{name:`Submit ${prefix}.xlsx`,exact:true}).click();
  const response = await responsePromise;
  const body = await response.json();
  if (body.storedKey) rememberObject(prefix,body.storedKey);
  await testInfo.attach('upload-result',{body:JSON.stringify(body,null,2),contentType:'application/json'});
  expect(response.status(),JSON.stringify(body)).toBe(201);
  await expect(page.getByRole('alert')).toContainText(/validated and uploaded successfully/i);
  expect(Number(body.metadata.submittedForUserId)).toBe(90013);
  const entries = () => rows(`SELECT user_id,is_processed,hold_reason,duration,timesheet_entry_id FROM timesheet_entries WHERE account_id=9001 AND notes LIKE ${literal(prefix+'%')}`);
  await expect.poll(() => entries().length).toBe(count);
  for (const entry of entries()) { expect(entry.user_id).toBe(90013); expect(entry.is_processed).toBe(false); expect(entry.duration).toBeGreaterThan(0); }
  const suggestions = rows(`SELECT s.status FROM ai_time_tracker_transaction_suggestions s JOIN timesheet_entries e USING(timesheet_entry_id) WHERE e.account_id=9001 AND e.notes LIKE ${literal(prefix+'%')}`);
  expect(suggestions.every(s => ['pending','pending_review'].includes(s.status))).toBe(true);
  // The feature flag is off: a null hold_reason with is_processed=false is pending,
  // not an error. AI suggestions need not exist when ingestion never starts.
  expect(rows(`SELECT transaction_id FROM customer_transactions WHERE account_id=9001 AND detailed_work_description LIKE ${literal(prefix+'%')}`)).toHaveLength(0);
  await page.goto('/time-tracking/history');
  await expect(page.getByText(body.fileName,{exact:true})).toBeVisible();
});
