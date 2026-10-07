export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY;

    if (!apiKey) {
      throw new Error("Nova Poshta API key is missing");
    }

    const { action, search, cityRef } = req.body || {};

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
        return res.status(400).json({
          ok: false,
          error: "cityRef required"
        });
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
      return res.status(400).json({
        ok: false,
        error: "Unknown action"
      });
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

      return res.status(502).json({
        ok: false,
        error: "Nova Poshta API error"
      });
    }

    return res.status(200).json({
      ok: true,
      data: data.data
    });
  } catch (error) {
    console.error(
      "NOVA POSHTA ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
