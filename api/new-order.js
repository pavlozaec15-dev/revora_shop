export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Telegram environment variables are missing");
    }

    const order = req.body || {};
    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];

    const products = items.length
      ? items.map((item, index) => {
          return (
            `${index + 1}. ${item.name || "Товар"}\n` +
            `Розмір: ${item.size || "—"}\n` +
            `Кількість: ${item.qty || 1}\n` +
            `Ціна: ${Number(item.price || 0).toLocaleString("uk-UA")} грн`
          );
        }).join("\n\n")
      : "Товари не вказані";

    const paymentNames = {
      cod: "Післяплата",
      card: "Картка / Google Pay"
    };

    const deliveryNames = {
      branch: "Відділення",
      locker: "Поштомат"
    };

    const message =
`🛍 НОВЕ ЗАМОВЛЕННЯ REVORA

🔢 № ${order.number || "—"}

👤 Клієнт:
${customer.name || ""} ${customer.surname || ""}
📞 ${customer.phone || "—"}

📍 Доставка:
Місто: ${customer.city || "—"}
Тип: ${deliveryNames[customer.delivery] || customer.delivery || "—"}
Nova Poshta: ${customer.warehouse || "—"}

💳 Оплата:
${paymentNames[customer.payment] || customer.payment || "—"}

📦 Товари:
${products}

💰 Разом: ${Number(order.total || 0).toLocaleString("uk-UA")} грн

💬 Коментар:
${customer.comment || "Немає"}`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || telegramData.ok !== true) {
      console.error("TELEGRAM API ERROR:", telegramData);
      return res.status(502).json({
        ok: false,
        error: "Telegram API error"
      });
    }

    // Persist the order when server-side Supabase access is configured.
    // Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let stored = false;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const record = {
          number: String(order.number || ""),
          customer_name: [customer.name, customer.surname].filter(Boolean).join(" "),
          customer_phone: String(customer.phone || ""),
          customer_city: String(customer.city || ""),
          delivery_type: String(customer.delivery || ""),
          warehouse: String(customer.warehouse || ""),
          payment_method: String(customer.payment || ""),
          comment: String(customer.comment || ""),
          items: items.map(item => ({
            id: item.id, name: item.name, size: item.size,
            qty: Number(item.qty || 1), price: Number(item.price || 0)
          })),
          total: Number(order.total || 0),
          status: "Прийнято"
        };
        const dbResponse = await fetch(supabaseUrl.replace(/\/$/, "") + "/rest/v1/orders?on_conflict=number", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": serviceRoleKey,
            "Authorization": "Bearer " + serviceRoleKey,
            "Prefer": "resolution=ignore-duplicates,return=minimal"
          },
          body: JSON.stringify(record)
        });
        if (!dbResponse.ok) throw new Error("Database rejected order: " + dbResponse.status);
        stored = true;
      } catch (dbError) {
        console.error("ORDER DB SAVE FAILED:", dbError?.message || dbError);
      }
    }
    return res.status(200).json({ ok: true, stored });
  } catch (error) {
    console.error("NEW ORDER ERROR:", error?.message || error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
