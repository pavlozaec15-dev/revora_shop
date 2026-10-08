import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// Import the Vercel ESM handler in isolation; products.js remains browser/CommonJS compatible.
const catalog = createRequire(import.meta.url)('../products.js');
const source = readFileSync(new URL('../api/new-order.js', import.meta.url), 'utf8').replace("import catalog from '../products.js';", 'const catalog = '+JSON.stringify(catalog)+';');
const { default: handler } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const order = () => ({ number:'RV-12345678-1234-4123-8123-123456789abc', customer:{ name:'Тест',phone:'+380991234567',city:'Київ',warehouse:'№1',delivery:'branch',payment:'cod',comment:'' },items:[{id:'zip',size:'M',qty:2,price:1}],total:2 });
async function invoke(body, fetchImpl, method='POST') {
 const original = globalThis.fetch;
 globalThis.fetch = fetchImpl;
 const res = { setHeader(){}, status(code){this.code=code;return this;},json(body){this.body=body;return this;} };
 try { await handler({method,body},res);return res; } finally {globalThis.fetch=original;}
}
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
test('server calculates prices and stores canonical columns',async()=>{
 const res=await invoke(order(),async(url,opts)=>{const record=JSON.parse(opts.body);assert.equal(record.total_amount,5200);assert.equal(record.delivery_city,'Київ');assert.equal(record.status,'new');assert.equal(record.items[0].price,2600);assert.ok(!('total' in record));return Response.json([record]);});
 assert.equal(res.code,200);assert.equal(res.body.stored,true);assert.equal(res.body.total,5200);
});
test('database failure is not checkout success',async()=>{
 const res=await invoke(order(),async()=>new Response('',{status:500}));assert.equal(res.code,502);assert.equal(res.body.ok,false);
});
test('missing server key fails closed',async()=>{
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 try {const res=await invoke(order(),()=>{throw new Error('must not call');});assert.equal(res.code,503);} finally {process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';}
});
test('invalid cart and card payment rejected before persistence',async()=>{
 for(const body of [{...order(),items:[]},{...order(),items:[{id:'zip',size:'M',qty:-1}]},{...order(),customer:{...order().customer,payment:'card'}}]) {
 const res=await invoke(body,()=>{throw new Error('must not call');});assert.equal(res.code,400);
 }
});
test('retry returns original record and never sends duplicate Telegram',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='test';process.env.TELEGRAM_CHAT_ID='test';let calls=0;
 try {const res=await invoke(order(),async(url,opts)=>{calls++;assert.ok(!url.includes('telegram'));return Response.json(opts.method==='POST'?[]:[{number:order().number,total_amount:5200,items:order().items}]);});assert.equal(calls,2);assert.equal(res.body.stored,true);}finally{delete process.env.TELEGRAM_BOT_TOKEN;delete process.env.TELEGRAM_CHAT_ID;}
});
test('Telegram failure preserves successful database order',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='test';process.env.TELEGRAM_CHAT_ID='test';
 try {const res=await invoke(order(),async(url,opts)=>url.includes('telegram')?new Response('',{status:500}):Response.json([JSON.parse(opts.body)]));assert.equal(res.body.stored,true);assert.equal(res.code,200);}finally{delete process.env.TELEGRAM_BOT_TOKEN;delete process.env.TELEGRAM_CHAT_ID;}
});
test('non-POST cannot create orders',async()=>{const res=await invoke(order(),()=>{throw new Error('must not call');},'GET');assert.equal(res.code,405);});
