// Public catalogue: only published products, never expose admin credentials.
export async function onRequestGet({ env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: 'Каталог тимчасово недоступний.' }, {status:503});
  }
  try {
    const url = env.SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/products?published=eq.true&select=id,name,category,description,price,old_price,sizes,image_urls,badge&order=created_at.desc&limit=300';
    const response = await fetch(url, {
      headers: {apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY},
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw Error('Products query failed: ' + response.status);
    const data = await response.json();
    const products = data.map(p=>({
      id: p.id, name: p.name, category: p.category, desc: p.description || '',
      price: Number(p.price), old: p.old_price == null ? null : Number(p.old_price),
      sizes: p.sizes || [], images: p.image_urls || [], badge: p.badge || ''
    }));
    return Response.json({ok:true,products},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    console.error('PUBLIC PRODUCTS ERROR', e.message);
    return Response.json({ok:false,error:'Не вдалося завантажити каталог.'},{status:502});
  }
}
