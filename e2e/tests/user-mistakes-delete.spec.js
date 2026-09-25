require('../lib/scenario-safety').assertLocalUI();
const {test,expect}=require('../lib/fixtures');
const {createCustomer,createJob,billedCustomer,finalize,submit,closeForm,fillQuickFilter,routes}=require('../lib/ui');
const {types,prepare,saved,financial}=require('../lib/mistakes');
const {rows}=require('../lib/db');
const cases=[
 ['payment','payment_id','Delete Payment','Search payments','/payments/deletePayment/'],
 ['writeoff','writeoff_id','Delete Write-off','Search write-offs','/writeOffs/deleteWriteOffs/'],
 ['retainer','retainer_id','Delete Retainer',null,'/retainers/deleteRetainer/'],
 ['charge','transaction_id','Delete Transaction','Search transactions','/transactions/deleteTransaction/']
];
async function setup(page,prefix,type){
 const c=['payment','writeoff'].includes(type)?await billedCustomer(page,prefix):await createCustomer(page,prefix);
 if(['payment','writeoff'].includes(type))await finalize(page,c);
 if(type==='charge')await createJob(page,c);
 const d=await prepare(page,c,type);await submit(page,d,types[type].endpoint);await closeForm(page);return c;
}
async function detail(page,c,type,id,search){
 const [row]=saved(type,c);await page.goto(types[type].route);
 if(search)await page.getByPlaceholder(search).fill(c.prefix);else await fillQuickFilter(page,c.prefix);
 await page.locator(`[role=row][data-id="${row[id]}"]`).click();
}
for(const [type,id,label,search,endpoint] of cases)test(`${type}: cancel and failed delete preserve money; explicit retry removes only the eligible entry`,async({page,prefix})=>{
 const c=await setup(page,prefix,type);await detail(page,c,type,id,search);
 const before=financial(c);const button=page.getByRole('button',{name:label,exact:true});
 await expect(button).toBeEnabled();await button.click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 expect(financial(c)).toEqual(before);
 const pattern=`**${endpoint}**`;await page.route(pattern,route=>route.abort('failed'));
 await button.click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText(/network|unable|failed|error/i);await expect(button).toBeEnabled();expect(financial(c)).toEqual(before);
 await page.unroute(pattern);await button.click();
 const response=page.waitForResponse(r=>r.request().method()==='DELETE' && r.url().includes(endpoint));
 await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
 const r=await response;expect(r.status()).toBe(200);expect((await r.json()).status).toBe(200);
 await expect(page).toHaveURL(types[type].route);expect(saved(type,c)).toHaveLength(0);
 if(['payment','writeoff'].includes(type))expect(rows(`SELECT remaining_balance_on_invoice FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id}`).map(r=>Number(r.remaining_balance_on_invoice))).toEqual([22.5]);
});
test('retainer linked-payment lookup failure refuses deletion until a successful reload',async({page,prefix})=>{
 const c=await setup(page,prefix,'retainer');const before=financial(c);
 const pattern=`**/customer/activeCustomers/customerByID/9001/90013/${c.id}`;
 await page.route(pattern,route=>route.abort('failed'));
 await detail(page,c,'retainer','retainer_id',null);
 await expect(page.getByRole('alert')).toContainText(/linked payments|Network Error/i);
 await expect(page.getByRole('button',{name:'Delete Retainer',exact:true})).toBeDisabled();expect(financial(c)).toEqual(before);
 await page.unroute(pattern);await page.reload();
 await expect(page.getByRole('button',{name:'Delete Retainer',exact:true})).toBeEnabled();expect(financial(c)).toEqual(before);
});

test('used retainer cannot be deleted: root dependency guidance and draw refusal preserve $5 credit',async({page,prefix})=>{
 const c=await setup(page,prefix,'retainer');const [root]=saved('retainer',c);
 await createJob(page,c);const d=await prepare(page,c,'charge');
 await d.getByRole('combobox',{name:'Apply Retainer or Pre-Payment',exact:true}).fill(prefix);
 await page.getByRole('option').filter({hasText:prefix}).click();
 await submit(page,d,types.charge.endpoint);await closeForm(page);
 const [work]=saved('charge',c),[payment]=saved('payment',c);const retainers=saved('retainer',c);
 const draw=retainers.find(r=>r.parent_retainer_id===root.retainer_id);
 expect(Number(work.total_transaction)).toBe(20);expect(Number(payment.payment_amount)).toBe(-20);
 expect(Number(work.total_transaction)+Number(payment.payment_amount)).toBe(0);
 expect(retainers.map(r=>Number(r.current_amount))).toEqual([-25,-5]);
 expect(work.retainer_id).toBe(draw.retainer_id);expect(payment.retainer_id).toBe(root.retainer_id);
 expect(payment.note).toBe(`[retainer_draw:${draw.retainer_id}]`);expect(saved('payment',c)).toHaveLength(1);
 const before=financial(c);
 await detail(page,c,'retainer','retainer_id',null);
 await expect(page.getByText('Before deletion, please remove the following items:',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Delete Retainer',exact:true})).toBeDisabled();
 await expect(page.getByRole('grid')).toBeVisible();expect(financial(c)).toEqual(before);
 await page.goto(routes.retainers);await fillQuickFilter(page,prefix);
 await page.locator(`[role=row][data-id="${root.retainer_id}"] [data-field=retainer_id]`).getByRole('button').click();
 await page.locator(`[role=row][data-id="${draw.retainer_id}"]`).click();
 await page.getByRole('button',{name:'Delete Retainer',exact:true}).click();
 const response=page.waitForResponse(r=>r.request().method()==='DELETE' && r.url().includes('/retainers/deleteRetainer/'));
 await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
 const refusal=await(await response).json();expect(refusal.status).toBe(500);expect(refusal.message).toMatch(/draw-down entry.*Delete the payment or time\/charge entry/);
 await expect(page.getByRole('alert')).toContainText(refusal.message);expect(financial(c)).toEqual(before);
});
