const {test,expect}=require('../lib/workspace-fixtures');
const {authenticate}=require('../lib/auth');
const groups=require('../../src/Routes/navigation.json');
const markers={
 '/work/duplicates':['heading','Possible duplicates'], '/reports/account-audit':['heading','Account Audit'],
 '/reports/time-allocation':['heading','Time Allocation'], '/reports/client-rates':['heading','Client Rates'],
 '/reports/wip-aging':['heading','WIP / Unbilled Aging'], '/reports/job-budgets':['heading','Job Budgets'],
 '/reports/tax-capacity':['heading','Tax Season Capacity'],
 '/clients':['placeholder','Search customers'], '/work/entries':['placeholder','Search transactions'],
 '/work/review':['heading','Transaction Review'], '/work/review/entities':['heading','Business assignments needing review'],
 '/billing/create':['heading','Create New Invoices'], '/payments/receive':['heading','Receive payment'],
 '/payments/receipts':['heading','Payment receipts'], '/payments/credits':['heading','Client credits and refunds'],
 '/payments/refunds':['heading','Money returned to clients'], '/payments/transfers':['heading','Credit transfers between businesses'],
 '/billing/credit-memos':['heading','Credit memos'], '/receivables/aging':['heading','Accounts receivable'],
 '/time-tracking/upload':['heading','Submit Your Time Tracker'], '/time-tracking/history':['heading','Time Tracker History'],
 '/time-tracking/trackingAdministration':['heading','Employee Time Trackers'], '/settings/tracker':['heading','Time Tracker Staff'],
 '/settings/account':['heading','Account Settings'], '/settings/automations':['heading','Automations'],
 '/settings/entities':['heading','Billing businesses'], '/reports/billing-performance':['heading','Billing performance']
};
for(const group of groups)for(const leaf of group.children){
 test(`sidebar: ${group.title} / ${leaf.title}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const nav=page.getByRole('navigation',{name:'Primary navigation'});
  const button=nav.getByRole('button',{name:group.title,exact:true});
  if(await button.getAttribute('aria-expanded')!=='true')await button.click();
  const link=nav.locator('.MuiCollapse-entered').getByRole('link',{name:leaf.title,exact:true});
  await expect(link).toBeVisible();await link.click();await expect(page).toHaveURL(leaf.path);
  await expect(link).toHaveAttribute('aria-current','page');
  await expect(page.getByTestId('workspace-title')).toHaveText(leaf.title);
  await expect(page.getByRole('navigation',{name:'Breadcrumbs'})).toContainText(group.title);
  await page.waitForLoadState('networkidle');
  if(markers[leaf.path]){const [kind,text]=markers[leaf.path];await expect(kind==='placeholder'?page.getByPlaceholder(text):page.getByRole('heading',{name:text,exact:true})).toBeVisible();}
  else if(leaf.path==='/payments/imports')await expect(page.getByRole('tab',{name:/New payments/})).toBeVisible();
  else if(leaf.path==='/settings/tracker-template')await expect(page.getByText(/Upload|Template/).first()).toBeVisible();
  else await expect(page.getByRole('grid').first()).toBeVisible();
  await expect(page.getByText(/Unauthorized|Something went wrong|Page Not Found/i)).toHaveCount(0);
  await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);expect(errors).toEqual([]);
 });
}
test('cookie session survives reload on the canonical client list',async({page,context})=>{
 await page.goto('/clients');await expect(page.getByPlaceholder('Search customers')).toBeVisible();
 expect((await context.cookies()).find(c=>c.name==='ds2_auth')).toMatchObject({httpOnly:true,sameSite:'Strict',domain:'localhost'});
 expect(await page.evaluate(()=>document.cookie.includes('ds2_auth'))).toBe(false);
 await page.reload();await expect(page.getByPlaceholder('Search customers')).toBeVisible();await expect(page).toHaveURL('/clients');
});
test('expired session marker redirects a protected request to login',async({browser})=>{
 const context=await browser.newContext();try{await authenticate(context,'admin',true);const page=await context.newPage();await page.goto('http://localhost:3003/transactions/customerTransactions');await expect(page).toHaveURL(/\/login$/);await expect(page.getByRole('heading',{name:'Sign in to DS2'})).toBeVisible();}finally{await context.close();}
});
