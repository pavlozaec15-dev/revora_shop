async function handler(req, res, env) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const apiKey = env.NOVA_POSHTA_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ ok: false, error: "У Cloudflare не налаштований NOVA_POSHTA_API_KEY." });
    }

    const {
      action,
      search,
      cityRef
    } = req.body || {};

    let modelName;
    let calledMethod;
    let methodProperties = {};

    // =========================
    // ПОШУК МІСТ
    // =========================

    if (action === "cities") {
      modelName = "Address";
      calledMethod = "searchSettlements";

      methodProperties = {
        CityName: String(search || "").slice(0, 100),
        Limit: "20",
        Page: "1"
      };
    }

    // =========================
    // ВІДДІЛЕННЯ / ПОШТОМАТИ
    // =========================

    else if (action === "warehouses") {
      if (!cityRef) {
        return res.status(400).json({
          ok: false,
          error: "cityRef required"
        });
      }

      modelName = "AddressGeneral";
      calledMethod = "getWarehouses";

      methodProperties = {
        CityRef: String(cityRef).slice(0, 100),
        Page: "1",
        Limit: "100"
      };

      if (search) {
        methodProperties.FindByString =
          String(search).slice(0, 100);
      }
    }

    // =========================
    // НЕВІДОМА ДІЯ
    // =========================

    else {
      return res.status(400).json({
        ok: false,
        error: "Unknown action"
      });
    }

    // =========================
    // ЗАПИТ ДО NOVA POSHTA
    // =========================

    const response = await fetch(
      "https://api.novaposhta.ua/v2.0/json/",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          apiKey,
          modelName,
          calledMethod,
          methodProperties
        })
      }
    );

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch {
      console.error("NOVA POSHTA NON-JSON RESPONSE", response.status, raw.length);
      return res.status(502).json({ok:false,error:"Нова пошта повернула некоректну відповідь (HTTP "+response.status+")."});
    }

    // =========================
    // ПЕРЕВІРКА ПОМИЛОК
    // =========================

    if (!response.ok || data.success !== true) {
      console.error(
        "NOVA POSHTA API ERROR:",
        data
      );

      return res.status(502).json({
        ok: false,
        error: "Нова пошта відхилила запит. Перевір API-ключ або спробуй пізніше.",
        details: Array.isArray(data.errors) ? data.errors.map(x=>String(x).slice(0,180)).slice(0,3) : []
      });
    }

    // =========================
    // УСПІШНА ВІДПОВІДЬ
    // =========================

    return res.status(200).json({
      ok: true,
      data: data.data || []
    });

  } catch (error) {
    console.error(
      "NOVA POSHTA ERROR:",
      error?.message || error
    );

    const name = String(error?.name || "Error").slice(0,50);
    const detail = String(error?.message || "").toLowerCase();
    const kind = name === "AbortError" || name === "TimeoutError" ? "timeout" : /fetch|network|connect|certificate|tls|dns/i.test(detail) ? "network" : "unexpected";
    return res.status(502).json({
      ok: false,
      error: kind === "timeout"
        ? "Нова пошта не відповіла вчасно (тайм-аут)."
        : kind === "network"
          ? "Cloudflare не може підключитися до API Нової пошти (помилка мережі)."
          : "Помилка обробки відповіді Нової пошти.",
      error_type: kind
    });
  }
}

export async function onRequest(context) {
 const {request, env}=context;
 const headers=new Headers({'Cache-Control':'no-store'});
 const res={
   setHeader(name,value){headers.set(name,value)},
   status(statusCode){return {json(payload){return new Response(JSON.stringify(payload),{status:statusCode,headers:new Headers([...headers,['Content-Type','application/json; charset=utf-8']])})}}}
 };
 if(request.method!=='POST')return res.status(405).json({ok:false,error:'Method Not Allowed'});
 let body;
 try{body=await request.json()}catch{return res.status(400).json({ok:false,error:'Неправильний формат запиту.'})}
 return handler({method:request.method,body},res,env);
}
