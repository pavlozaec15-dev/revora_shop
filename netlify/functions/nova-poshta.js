exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY;

    if (!apiKey) {
      throw new Error("Nova Poshta API key is missing");
    }

    const body = JSON.parse(event.body || "{}");
    const { action, search, cityRef, warehouseType } = body;

    let modelName;
    let calledMethod;
    let methodProperties = {};

    if (action === "cities") {
      modelName = "Address";
      calledMethod = "searchSettlements";
      methodProperties = {
        CityName: String(search || "").slice(0, 100),
        Limit: "20",
        Page: "1"
      };
    } else if (action === "warehouses") {
      if (!cityRef) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: "cityRef required" })
        };
      }

      modelName = "AddressGeneral";
      calledMethod = "getWarehouses";
      methodProperties = {
        SettlementRef: String(cityRef).slice(0, 100),
        Page: "1",
        Limit: "100"
      };

      if (search) {
        methodProperties.FindByString =
          String(search).slice(0, 100);
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Unknown action" })
      };
    }

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

    const data = await response.json();

    if (!response.ok || data.success !== true) {
      console.error("NOVA POSHTA API ERROR:", data);

      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Nova Poshta API error"
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        data: data.data
      })
    };
  } catch (error) {
    console.error("NOVA POSHTA ERROR:", error?.message || error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Internal server error"
      })
    };
  }
};
