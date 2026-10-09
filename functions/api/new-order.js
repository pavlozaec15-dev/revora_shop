import { REVORA_PRODUCTS as catalog } from '../_catalog.js';

async function getOrderCatalog(env, orderedItems) {
  const selected = orderedItems || [];
  const staticItems = catalog;
  const needsDynamic = selected.some(item => !staticItems.some(p => p.id === item?.id));
  if (!needsDynamic) return staticItems;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Supabase configuration is missing');
  const endpoint = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/products?published=eq.true&select=id,name,price,sizes&limit=500';
  const response = await fetch(endpoint, {
    headers: { apikey: 'sb_publishable_uzjZ93fo6a0DJJaKUqK6ng_S8SCS7mH' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Product validation unavailable: ' + response.status);
  const active = await response.json();
  return [...staticItems, ...active.map(x => ({ id:x.id, name:x.name, price:Number(x.price), sizes:x.sizes||[] }))];
}

async function readStoreSettings(env) {
 const url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Missing settings configuration');
 const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/store_settings?select=key,value',{headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key})},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Settings HTTP '+response.status);
 const settings={store_name:'REVORA',contact_phone:'',delivery_enabled:'true',cod_enabled:'true',telegram_enabled:'false'};
 for(const row of await response.json())if(Object.hasOwn(settings,row.key))settings[row.key]=row.value;
 return settings;
}
const text = (value, max, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error('Invalid customer details');
  return value.trim();
};

async function handler(req, res, env) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  let record;
  let currentCatalog;
  let storeSettings;
  try {storeSettings=await readStoreSettings(env)}
  catch(e){console.error('STORE SETTINGS:',e.message);return res.status(503).json({ok:false,error:'Не вдалося перевірити налаштування магазину. Спробуйте пізніше.'})}
  if(storeSettings.delivery_enabled==='false')return res.status(403).json({ok:false,error:'Доставку тимчасово вимкнено. Оформлення замовлень недоступне.'});
  if(storeSettings.cod_enabled==='false')return res.status(403).json({ok:false,error:'Післяплату вимкнено. Оформлення замовлень тимчасово недоступне.'});
  let promoCode = '';
  let promoDiscount = 0;
  try { currentCatalog = await getOrderCatalog(env, req.body?.items); }
  catch (error) { console.error('PRODUCT VALIDATION FAILED:', error?.message); return res.status(503).json({ok:false,error:'Не вдалося перевірити товари з Supabase. Звернися до магазину або спробуй пізніше.'}); }
  try {
    const order = req.body;
    const customer = order?.customer;
    if (!customer || !/^RV-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.number)) throw new Error('Invalid order number');
    if (!Array.isArray(order.items) || !order.items.length || order.items.length > 50) throw new Error('Invalid cart');
    const items = order.items.map(item => {
      const product = currentCatalog.find(p => p.id === item?.id);
      if (!product || !product.sizes.includes(item.size) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) throw new Error('Invalid cart item');
      return { id: product.id, name: product.name, size: item.size, qty: item.qty, price: product.price };
    });
    if (!['branch', 'locker'].includes(customer.delivery) || customer.payment !== 'cod') throw new Error('Invalid delivery or unsupported payment');
    const phone = text(customer.phone, 40);
    if (!/^\+?[\d\s()-]{9,40}$/.test(phone) || phone.replace(/\D/g, '').length < 9) throw new Error('Invalid phone');
    record = {
      number: order.number,
      customer_name: text([customer.name, customer.surname].filter(Boolean).join(' '), 200),
      customer_phone: phone,
      delivery_city: text(customer.city, 200),
      delivery_branch: text(customer.warehouse, 500),
      delivery_type: customer.delivery,
      payment_method: customer.payment,
      notes: text(customer.comment ?? '', 2000, false),
      items,
      total_amount: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: 'new'
    };
  } catch {
    return res.status(400).json({ ok: false, error: 'Перевірте контактні дані, доставку та товари.' });
  }
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ ok: false, error: !url ? 'Cloudflare: відсутня змінна SUPABASE_URL.' : 'Cloudflare: відсутня змінна SUPABASE_SERVICE_ROLE_KEY.' });
  const rawPromo = String(req.body?.promo_code || '').trim().toUpperCase();
  if (rawPromo) {
    if (!/^[A-Z0-9_-]{3,30}$/.test(rawPromo)) return res.status(400).json({ok:false,error:'Невірний формат промокоду.'});
    try {
      const purl = url.replace(/\/$/, '') + '/rest/v1/rpc/calculate_promo_discount';
      const pRes = await fetch(purl,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,...(key.startsWith('sb_secret_') ? {} : {Authorization:'Bearer '+key})},body:JSON.stringify({p_code:rawPromo,p_subtotal:record.total_amount}),signal:AbortSignal.timeout(10000)});
      if(!pRes.ok)throw Error('Promo lookup status '+pRes.status);
      const promo = (await pRes.json())[0];
      if(!promo) {
        return res.status(400).json({ok:false,error:'Промокод недійсний, закінчився або не підходить для цієї суми.'});
      }
      promoCode=promo.code;
      promoDiscount=Number(promo.discount);
      record.subtotal_amount=record.total_amount;
      record.discount_amount=promoDiscount;
      record.promo_code=promoCode;
      record.total_amount=Number(promo.total);
    } catch(e) {
      console.error('PROMO VALIDATION ERROR:',e.message);
      return res.status(502).json({ok:false,error:'Не вдалося перевірити промокод. Спробуйте ще раз.'});
    }
  }
  let saved;
  let inserted = false;
  try {
    const headers = { 'Content-Type': 'application/json', apikey: key, ...(key.startsWith('sb_secret_') ? {} : {Authorization: `Bearer ${key}`}) };
    const endpoint = url.replace(/\/$/, '') + '/rest/v1/orders';
    const response = await fetch(endpoint + '?on_conflict=number', {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(record), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Database status ${response.status}`);
    saved = (await response.json())[0];
    inserted = Boolean(saved);
    // Retries return the original order without changing or notifying it again.
    if (!saved) {
      const existing = await fetch(endpoint + '?number=eq.' + encodeURIComponent(record.number) + '&select=number,total_amount,items', {
        headers, signal: AbortSignal.timeout(10000)
      });
      if (!existing.ok) throw new Error(`Database status ${existing.status}`);
      saved = (await existing.json())[0];
    }
    if (!saved) throw new Error('Order persistence not confirmed');
  } catch (error) {
    console.error('ORDER SAVE FAILED:', error.message);
    return res.status(502).json({ ok: false, error: 'Не вдалося зберегти замовлення. Спробуйте ще раз.' });
  }
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (inserted && token && chatId && storeSettings.telegram_enabled==='true') {
    try {
      const message = `🛍 НОВЕ ЗАМОВЛЕННЯ REVORA\n№ ${record.number}\n\n${record.customer_name}\n${record.customer_phone}\n${record.delivery_city}, ${record.delivery_branch}\nДоставка: ${record.delivery_type === 'locker' ? 'Поштомат' : 'Відділення'}\nОплата: Післяплата\n\n${record.items.map(i => `${i.name} · ${i.size} · ${i.qty} шт. · ${i.price} грн`).join('\n')}\n\nРазом: ${record.total_amount} грн${promoCode ? `\nПромокод: ${promoCode} (−${promoDiscount} грн)` : ''}\nКоментар: ${record.notes || 'Немає'}`;
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }), signal: AbortSignal.timeout(5000)
      });
      if (!response.ok || (await response.json()).ok !== true) console.error('ORDER TELEGRAM NOTIFICATION FAILED');
    } catch { console.error('ORDER TELEGRAM NOTIFICATION FAILED'); }
  }
  return res.status(200).json({ ok: true, stored: true, number: saved.number, total: Number(saved.total_amount), discount: promoDiscount, promo_code: promoCode, items: saved.items });
}

export async function onRequest(context) {
 const {request, env}=context;
 const headers=new Headers({'Cache-Control':'no-store'});
 const res={
   setHeader(name,value){headers.set(name,value)},
   status(statusCode){return {json(payload){return new Response(JSON.stringify(payload),{status:statusCode,headers:new Headers([...headers,['Content-Type','application/json; charset=utf-8']])})}}}
 };
 if(request.method==='GET'){
  try{const settings=await readStoreSettings(env);return res.status(200).json({ok:true,settings})}
  catch(e){console.error('STORE SETTINGS:',e.message);return res.status(503).json({ok:false,error:'Налаштування тимчасово недоступні.'})}
 }
 if(request.method!=='POST')return res.status(405).json({ok:false,error:'Method Not Allowed'});
 let body;
 try{body=await request.json()}catch{return res.status(400).json({ok:false,error:'Неправильний формат запиту.'})}
 return handler({method:request.method,body},res,env);
}
