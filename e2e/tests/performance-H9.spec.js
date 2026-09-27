const { test, expect } = require('@playwright/test');
const { authenticate } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const { BACKEND_DIR } = require('../lib/paths');
const measurements = [];
test.afterAll(() => {
  fs.writeFileSync(path.join(BACKEND_DIR, 'docs/decisions/evidence/run-H9', process.env.H9_BASELINE ? 'browser-before.json' : 'browser-after.json'), JSON.stringify(measurements, null, 2));
});
for (const [name, route, ready] of [
 ['Create invoices','/billing/create', 'Create New Invoices'],
 ['Enter time','/work/entries?entry=time', 'Select Transaction Date'],
 ['Receive payment','/payments/receive', 'Receive payment'],
 ['Jobs','/work/jobs','Jobs']
]) test(`account-scale ${name} loads`, async ({page,context}) => {
  await authenticate(context, 'readonly');
  const calls=[];
  page.on('response', r => { if(['xhr','fetch'].includes(r.request().resourceType())) calls.push({url:new URL(r.url()).pathname,status:r.status()}); });
  const start=Date.now();
  await page.goto(route);
  if(name==='Enter time') await expect(page.getByRole('dialog')).toBeVisible();
  else await expect(page.getByText(ready,{exact:true}).first()).toBeVisible();
  // Comparable to the original measurement: shell plus network-idle. The
  // readonly identity blocks automatic recurring preparation, so this is
  // not a claim that Create Invoice's financial rows have loaded.
  await page.waitForLoadState('networkidle');
  const elapsed=Date.now()-start;
  const blob=await page.request.get('http://localhost:8003/initialData/initialBlob/1/21');
  const body=await blob.body();
  measurements.push({name,route,interactiveMs:elapsed,readiness:'shell plus networkidle',blobBytes:body.length,calls});
  expect(blob.ok()).toBeTruthy();
  if (!process.env.H9_BASELINE) { expect(body.length).toBeLessThan(1000000); expect(elapsed).toBeLessThan(12000); }
});

test('account-scale Create invoices renders actual balances without preparing or issuing records',async({page,context})=>{
 await authenticate(context,'readonly');const calls=[];let previewed=0;
 // Account 1 cannot be mutated. Substitute ONLY preparation with the real
 // read-only due preview. The balance endpoint and grid remain real.
 await page.route('**/recurringCustomer/prepare',async route=>{
  expect(route.request().method()).toBe('POST');
  const {entityId}=route.request().postDataJSON();
  const response=await page.request.get('http://localhost:8003/recurringCustomer/due?entityId='+encodeURIComponent(entityId));
  expect(response.ok()).toBeTruthy();const due=await response.json();previewed++;
  await route.fulfill({status:200,json:{...due,generated:0,generatedPeriods:[],remaining:due.plans.reduce((n,p)=>n+p.remaining,0),catchUpRequired:due.plans.some(p=>p.catchUpRequired)}});
 });
 page.on('response',r=>{if(['xhr','fetch'].includes(r.request().resourceType()))calls.push({url:new URL(r.url()).pathname,status:r.status()});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const balance=page.waitForResponse(r=>r.url().includes('/invoices/createInvoice/AccountsWithBalance/1/21')&&r.request().method()==='GET');
 const start=Date.now();await page.goto('/billing/create');expect((await balance).ok()).toBeTruthy();
 await expect(page.getByRole('grid').locator('[role="row"][data-id]').first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
 const elapsed=Date.now()-start;
 expect(previewed).toBeGreaterThan(0);expect(errors).toEqual([]);expect(elapsed).toBeLessThan(12000);
 measurements.push({name:'Create invoices data ready',route:'/billing/create',interactiveMs:elapsed,readiness:'actual balance rows and enabled controls; recurring preparation replaced with read-only due preview',calls});
});
