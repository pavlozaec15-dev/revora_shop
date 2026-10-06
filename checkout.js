const cMoney = n => n.toLocaleString("uk-UA") + " ₴";

let checkoutCart = JSON.parse(
  localStorage.getItem("revoraCartItems") || "[]"
);

const items = document.querySelector("#checkoutItems");
const totals = document.querySelector("#checkoutTotals");

function renderCheckout() {
  if (!checkoutCart.length) {
    items.innerHTML =
      '<div class="emptyCheckout"><p>Кошик порожній.</p><a href="catalog.html">ПЕРЕЙТИ В КАТАЛОГ</a></div>';

    totals.innerHTML = "";
    document.querySelector(".placeOrder").disabled = true;
    return;
  }

  items.innerHTML = checkoutCart.map(x => `
    <div class="checkoutItem">
      <div class="miniPhoto">REVORA</div>
      <div>
        <b>${x.name}</b>
        <small>Розмір: ${x.size}</small>

        <div class="checkoutQty">
          <button type="button" data-minus="${x.id}|${x.size}">−</button>
          <span>${x.qty}</span>
          <button type="button" data-plus="${x.id}|${x.size}">+</button>
        </div>
      </div>

      <strong>${cMoney(x.price * x.qty)}</strong>
    </div>
  `).join("");

  const subtotal = checkoutCart.reduce(
    (a, x) => a + x.price * x.qty,
    0
  );

  const delivery = subtotal >= 8000 ? 0 : null;

  totals.innerHTML = `
    <div class="sumLine">
      <span>Товари</span>
      <b>${cMoney(subtotal)}</b>
    </div>

    <div class="sumLine">
      <span>Доставка</span>
      <b>${delivery === 0 ? "Безкоштовно" : "За тарифами Nova Poshta"}</b>
    </div>

    ${
      subtotal < 8000
        ? `<p class="freeHint">
            До безкоштовної доставки ще ${cMoney(8000 - subtotal)}
           </p>`
        : ""
    }

    <div class="sumLine grand">
      <span>Разом</span>
      <b>${cMoney(subtotal)}</b>
    </div>
  `;

  items.querySelectorAll("[data-minus]").forEach(
    b => b.onclick = () => change(b.dataset.minus, -1)
  );

  items.querySelectorAll("[data-plus]").forEach(
    b => b.onclick = () => change(b.dataset.plus, 1)
  );
}

function change(key, d) {
  const [id, size] = key.split("|");

  const x = checkoutCart.find(
    z => z.id === id && z.size === size
  );

  if (!x) return;

  x.qty += d;

  if (x.qty <= 0) {
    checkoutCart = checkoutCart.filter(z => z !== x);
  }

  localStorage.setItem(
    "revoraCartItems",
    JSON.stringify(checkoutCart)
  );

  if (typeof cart !== "undefined") cart = checkoutCart;
  if (typeof save === "function") save();

  renderCheckout();
}

document.querySelector("#checkoutForm").onsubmit = async e => {
  e.preventDefault();

  if (!checkoutCart.length) return;

  const btn = document.querySelector(".placeOrder");

  btn.disabled = true;
  btn.textContent = "НАДСИЛАЄМО…";

  const fd = new FormData(e.target);

  const num = "RV" + String(Date.now()).slice(-6);

  const order = {
    number: num,
    date: new Date().toISOString(),
    customer: Object.fromEntries(fd),
    items: checkoutCart,
    total: checkoutCart.reduce(
      (a, x) => a + x.price * x.qty,
      0
    ),
    status: "Прийнято"
  };

  try {
    const response = await fetch(
      "/.netlify/functions/new-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(order)
      }
    );

    if (!response.ok) {
      throw new Error("Order send failed");
    }

    const orders = JSON.parse(
      localStorage.getItem("revoraOrders") || "[]"
    );

    orders.unshift(order);

    localStorage.setItem(
      "revoraOrders",
      JSON.stringify(orders)
    );

    localStorage.removeItem("revoraCartItems");

    checkoutCart = [];

    if (typeof cart !== "undefined") cart = [];
    if (typeof save === "function") save();

    document.querySelector("#successText").innerHTML =
      `Номер вашого замовлення: <b>#${num}</b><br>
       Сума: <b>${cMoney(order.total)}</b><br><br>
       Замовлення успішно передано менеджеру REVORA.`;

    document
      .querySelector("#orderSuccess")
      .classList.add("show");

  } catch (error) {
    alert(
      "Не вдалося надіслати замовлення. Спробуйте ще раз."
    );

    btn.disabled = false;
    btn.textContent = "ПІДТВЕРДИТИ ЗАМОВЛЕННЯ";
  }
};

renderCheckout();
