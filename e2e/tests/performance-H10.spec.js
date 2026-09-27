const {test,expect}=require('@playwright/test');
const {authenticate}=require('../lib/auth');
const fs=require('fs'),path=require('path'),{BACKEND_DIR}=require('../lib/paths');
const results=[];
test.afterAll(()=>fs.writeFileSync(path.join(BACKEND_DIR,'docs/decisions/evidence/run-H10/browser-budgets.json'),JSON.stringify(results,null,2)));
async function setup(page,context){
 await authenticate(context,'readonly');
 await page.route('**/recurringCustomer/prepare',async route=>{
  const {entityId}=route.request().postDataJSON();
  const response=await page.request.get('http://localhost:8003/recurringCustomer/due?entityId='+entityId);
  expect(response.ok()).toBeTruthy();const due=await response.json();
  await route.fulfill({status:200,json:{...due,generated:0,generatedPeriods:[],remaining:due.plans.reduce((n,p)=>n+p.remaining,0),catchUpRequired:due.plans.some(p=>p.catchUpRequired)}});
 });
 await page.goto('/work/jobs');await page.waitForLoadState('networkidle');
}
async function leave(page){await page.locator('a[href="/work/jobs"]').first().click();await expect(page.getByText('Jobs',{exact:true}).first()).toBeVisible();await page.waitForLoadState('networkidle');}
const ready={
 create:async page=>{await expect(page.getByText('Create New Invoices',{exact:true})).toBeVisible();await expect(page.getByRole('grid').locator('[role="row"][data-id]').first()).toBeVisible();},
 ar:async page=>{await expect(page.getByRole('heading',{name:'Accounts receivable',exact:true})).toBeVisible();await expect(page.locator('tbody tr').first()).toContainText(/\$[\d,]+\.\d{2}/);},
 audit:async page=>{await expect(page.getByRole('heading',{name:'Account Audit',exact:true})).toBeVisible();await expect(page.locator('tbody tr').first()).toContainText(/\$[\d,]+\.\d{2}/);},
 billingPerformance:page=>expect(page.getByText(/^Cost basis:/)).toBeVisible(),
 clientRates:page=>expect(page.getByRole('grid').locator('[role="row"][data-id]').first()).toBeVisible(),
 timeAllocation:page=>expect(page.getByText('Total Hours',{exact:true}).first()).toBeVisible(),
 wipAging:page=>expect(page.getByText('Total Unbilled',{exact:true}).first()).toBeVisible(),
 jobBudgets:page=>expect(page.getByText(/No jobs have an agreed amount yet/)).toBeVisible(),
 taxSeasonCapacity:page=>expect(page.getByText(`Total Hours ${new Date().getFullYear()}`,{exact:true}).first()).toBeVisible()
};
for(const [name,route,endpoint,budget] of [
 ['create','/billing/create','/invoices/createInvoice/AccountsWithBalance/1/21',1000],
 ['ar','/receivables/aging','/accountsReceivable/aging/1/21',1000],
 ['audit','/reports/account-audit','/accountAudit/customers/1/21',1500],
 ...[['billingPerformance','billing-performance'],['clientRates','client-rates'],['timeAllocation','time-allocation'],['wipAging','wip-aging'],['jobBudgets','job-budgets'],['taxSeasonCapacity','tax-capacity']].map(([api,url])=>[api,'/reports/'+url,'/analytics/'+api+'/1/21',2000])
])test(`H10 account-scale ${name}: visible correct data within ${budget} ms`,async({page,context})=>{
 await setup(page,context);const samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<4;i++){
  const response=page.waitForResponse(r=>r.url().includes(endpoint)&&r.request().method()==='GET');
  const link=page.locator(`a[href="${route}"]`).first();
  if(!await link.isVisible())await page.getByRole('button',{name:route.startsWith('/reports/')?'Reports':route.startsWith('/receivables/')?'Receivables':'Billing',exact:true}).click();
  const start=Date.now();await link.click();
  const r=await response;expect(r.ok()).toBeTruthy();const body=await r.json();expect(body.status).toBe(200);
  await ready[name](page);const firstRowsMs=Date.now()-start;
  if(name==='create')await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
  const allReadyMs=Date.now()-start;
  await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
  samples.push({firstRowsMs,allReadyMs,warmup:i===0});await leave(page);
 }
 const median=key=>samples.slice(1).map(s=>s[key]).sort((a,b)=>a-b)[1];
 results.push({name,route,budget,measurement:'Navigation from a loaded workspace; one warmup and three samples, real account 1 GETs. Preparation uses the read-only due preview.',samples,firstRowsMedianMs:median('firstRowsMs'),allReadyMedianMs:median('allReadyMs')});
 expect(errors).toEqual([]);expect(median('firstRowsMs')).toBeLessThanOrEqual(budget);
 if(name==='create')expect(median('allReadyMs')).toBeLessThanOrEqual(1500);
});
