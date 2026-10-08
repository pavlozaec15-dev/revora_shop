export async function onRequestPost({request,env}) {
 const send=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 let body;
 try {body=await request.json()}catch{return send({ok:false,error:'Неправильний запит.'},400)}
 const code=String(body?.code||'').trim().toUpperCase();
 const subtotal=Number(body?.subtotal);
 if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!Number.isFinite(subtotal)||subtotal<0||subtotal>100000000)return send({ok:false,error:'Перевірте промокод і суму.'},400);
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return send({ok:false,error:'Перевірка промокодів тимчасово недоступна.'},503);
 try{
  const url=env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/calculate_promo_discount';
  const response=await fetch(url,{
   method:'POST',
   headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,...(env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_') ? {} : {Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY})},
   body:JSON.stringify({p_code:code,p_subtotal:subtotal}),
   signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('RPC status '+response.status);
  const values=await response.json();
  const p=Array.isArray(values)?values[0]:values;
  if(!p)return send({ok:false,error:'Промокод недійсний або не підходить для цієї суми.'},400);
  return send({ok:true,code:p.code,discount:Number(p.discount),total:Number(p.total)});
 }catch(e){console.error('Promo preview error',e.message);return send({ok:false,error:'Не вдалося перевірити промокод.'},502)}
}
