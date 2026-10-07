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

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("NEW ORDER ERROR:", error?.message || error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}
