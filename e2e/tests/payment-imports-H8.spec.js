const {test,expect}=require('../lib/fixtures');
const {rows}=require('../lib/db');
const audit=()=>rows('SELECT count(*)::int AS events,max(event_id)::text AS last FROM audit_events WHERE account_id=9001');
for(const [tab,status,message] of [
 ['New payments','new','No new payments to review. Use Upload to add a payment file.'],
 ['Processed','processed','No processed payments for this month. Choose another month to see earlier payments.'],
 ['All payments','all','No imported payments. Use Upload to add a payment file.']
])test(`payment imports ${status}: errors are visible, reload recovers, and no money is written`,async({page})=>{
 const before=audit();let failed=true;
 await page.route('**/pending-payments/list/**',route=>{
  if(new URL(route.request().url()).searchParams.get('status')!==status)return route.continue();
  return failed?route.fulfill({status:503,json:{status:503,message:'Synthetic unavailable list'}}):route.fulfill({json:{status:200,payments:[],pagination:{totalItems:0}}});
 });
 await page.goto('/payments/imports');if(status!=='new')await page.getByRole('tab',{name:tab,exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Payments could not be loaded. Reload the list to try again.');
 await expect(page.getByRole('grid')).toHaveCount(0);await expect(page.getByText(message,{exact:true})).toHaveCount(0);
 expect(audit()).toEqual(before);failed=false;await page.getByRole('button',{name:'Reload payments',exact:true}).click();
 await expect(page.getByText(message,{exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Name on payment',exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Matched client',exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'OCR Name',exact:true})).toHaveCount(0);
 expect(audit()).toEqual(before);
});
test('payment imports keep the selected month when an earlier request finishes last',async({page})=>{
 const before=audit();let first=true,releaseOld,signalStarted;
 const started=new Promise(resolve=>{signalStarted=resolve;});
 await page.route('**/pending-payments/list/**',async route=>{
  if(new URL(route.request().url()).searchParams.get('status')!=='processed')return route.continue();
  const old=first;first=false;
  if(old){signalStarted();await new Promise(resolve=>{releaseOld=resolve;});}
  await route.fulfill({json:{status:200,payments:[{payment_id:old?2147483001:2147483002,customer_name:old?'Older payer':'Latest payer',matched_customer_name:'Synthetic client',payment_amount:10}],pagination:{totalItems:1}}});
 });
 await page.goto('/payments/imports');await page.getByRole('tab',{name:'Processed',exact:true}).click();await started;
 await page.getByRole('combobox',{name:'Month',exact:true}).click();await page.getByRole('option').nth(1).click();
 await expect(page.getByText('Latest payer',{exact:true})).toBeVisible();
 const oldResponse=page.waitForResponse(r=>r.url().includes('/pending-payments/list/') && r.url().includes('status=processed'));
 releaseOld();await oldResponse;await page.waitForLoadState('networkidle');
 await expect(page.getByText('Latest payer',{exact:true})).toBeVisible();await expect(page.getByText('Older payer',{exact:true})).toHaveCount(0);
 expect(audit()).toEqual(before);
});
test('payment imports preserve page two while its rows load',async({page})=>{
 const before=audit();let releaseSecond,signalStarted;const started=new Promise(resolve=>{signalStarted=resolve;});
 await page.route('**/pending-payments/list/**',async route=>{
  const params=new URL(route.request().url()).searchParams;if(params.get('status')!=='all')return route.continue();
  const second=params.get('page')==='2';if(second){signalStarted();await new Promise(resolve=>{releaseSecond=resolve;});}
  const payments=second?[{payment_id:2147483101,customer_name:'Second page payer'}]:Array.from({length:20},(_,i)=>({payment_id:2147483001+i,customer_name:'First page payer '+i}));
  await route.fulfill({json:{status:200,payments,pagination:{totalItems:21}}});
 });
 await page.goto('/payments/imports');await page.getByRole('tab',{name:'All payments',exact:true}).click();await expect(page.getByText('First page payer 0',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Go to next page',exact:true}).click();await started;releaseSecond();
 await expect(page.getByText('Second page payer',{exact:true})).toBeVisible();await expect(page.getByText('First page payer 0',{exact:true})).toHaveCount(0);
 await expect(page.getByText('21–21 of 21',{exact:true})).toBeVisible();expect(audit()).toEqual(before);
});
