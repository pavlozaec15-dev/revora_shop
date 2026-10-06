exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { statusCode: 500, body: "Telegram settings missing" };
    }

    const order = JSON.parse(event.body || "{}");

    const clean = (value) =>
      String(value ?? "").replace(/[<>]/g, "").slice(0, 500);

    const products = Array.isArray(order.items) ? order.items : [];

    const productText = products
      .slice(0, 30)
      .map(
        (item) =>
          `• ${clean(item.name)} | Розмір: ${clean(item.size)} | ${Number(item.qty) || 1} шт. | ${Number(item.price) || 0} ₴`
      )
      .join("\n");

    const text = [
      "🛍️ НОВЕ ЗАМОВЛЕННЯ REVORA",
      "",
      `📋 #${clean(order.number)}`,
      `👤 ${clean(order.customer?.name)}`,
      `📞 ${clean(order.customer?.phone)}`,
      "",
      "📦 ТОВАРИ:",
      productText,
      "",
      `💰 Сума: ${Number(order.total) || 0} ₴`,
      `💳 Оплата: ${
        order.customer?.payment === "card"
          ? "Visa / Mastercard / Google Pay"
          : "Післяплата"
      }`,
      "",
      "🚚 Nova Poshta",
      `🏙️ ${clean(order.customer?.city)}`,
      `${order.customer?.delivery === "locker" ? "📮 Поштомат" : "🏤 Відділення"}: ${clean(order.customer?.warehouse)}`,
      order.customer?.comment
        ? `💬 Коментар: ${clean(order.customer.comment)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Telegram error");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false }),
    };
  }
};
