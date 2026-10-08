export async function onRequestPost({request,env}) {
 const send=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 let body;
 try {body=await request.json()}catch{return send({ok:false,error:'Неправильний запит.'},400)}
 const code=String(body?.code||'').trim().toUpperCase();
 const subtotal=Number(body?.subtotal);
 if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!Number.isFinite(subtotal)||subtotal<0||subtotal>100000000)return send({ok:false,error:'Перевірте промокод і суму.'},400);
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return send({ok:false,error:'Перевірка промокодів тимчасово недоступна.'},503);
 try{
  const url=env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/promo_codes?code=eq.'+encodeURIComponent(code)+'&select=code,discount_type,amount,min_order,active,expires_at';
  const response=await fetch(url,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Database '+response.status);
  const p=(await response.json())[0];
  if(!p||!p.active||(p.expires_at&&Date.parse(p.expires_at)<=Date.now())||subtotal<Number(p.min_order))return send({ok:false,error:'Промокод недійсний або не підходить для цієї суми.'},400);
  const amount=Number(p.amount);
  const discount=Math.min(subtotal,Math.max(0,Math.round((p.discount_type==='percent'?subtotal*amount/100:amount)*100)/100));
  return send({ok:true,code,discount,total:Math.round((subtotal-discount)*100)/100});
 }catch(e){console.error('Promo preview error',e.message);return send({ok:false,error:'Не вдалося перевірити промокод.'},502)}
}
