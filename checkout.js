const cMoney = n =>
  Number(n || 0).toLocaleString("uk-UA") + " ₴";

let checkoutCart = JSON.parse(
  localStorage.getItem("revoraCartItems") || "[]"
);

const items = document.querySelector("#checkoutItems");
const totals = document.querySelector("#checkoutTotals");
const form = document.querySelector("#checkoutForm");

let selectedCityRef = "";
let cityTimer;
let warehouseTimer;

/* =========================
   КОШИК
========================= */

function renderCheckout() {
  if (!checkoutCart.length) {
    items.innerHTML = `
      <div class="emptyCheckout">
        <p>Кошик порожній.</p>
        <a href="catalog.html">ПЕРЕЙТИ В КАТАЛОГ</a>
      </div>
    `;

    totals.innerHTML = "";

    const btn = document.querySelector(".placeOrder");
    if (btn) btn.disabled = true;

    return;
  }

  items.innerHTML = checkoutCart.map(x => `
    <div class="checkoutItem">

      <div class="miniPhoto">
        REVORA
      </div>

      <div>
        <b>${x.name}</b>

        <small>
          Розмір: ${x.size}
        </small>

        <div class="checkoutQty">

          <button
            type="button"
            data-minus="${x.id}|${x.size}"
          >
            −
          </button>

          <span>${x.qty}</span>

          <button
            type="button"
            data-plus="${x.id}|${x.size}"
          >
            +
          </button>

        </div>
      </div>

      <strong>
        ${cMoney(x.price * x.qty)}
      </strong>

    </div>
  `).join("");

  const subtotal = checkoutCart.reduce(
    (sum, x) =>
      sum + Number(x.price) * Number(x.qty),
    0
  );

  totals.innerHTML = `
    <div class="sumLine">
      <span>Товари</span>
      <b>${cMoney(subtotal)}</b>
    </div>

    <div class="sumLine">
      <span>Доставка</span>

      <b>
        ${
          subtotal >= 8000
            ? "Безкоштовно"
            : "За тарифами Nova Poshta"
        }
      </b>
    </div>

    ${
      subtotal < 8000
        ? `
          <p class="freeHint">
            До безкоштовної доставки ще
            ${cMoney(8000 - subtotal)}
          </p>
        `
        : ""
    }

    <div class="sumLine grand">
      <span>Разом</span>
      <b>${cMoney(subtotal)}</b>
    </div>
  `;

  items
    .querySelectorAll("[data-minus]")
    .forEach(btn => {
      btn.onclick = () =>
        changeQty(btn.dataset.minus, -1);
    });

  items
    .querySelectorAll("[data-plus]")
    .forEach(btn => {
      btn.onclick = () =>
        changeQty(btn.dataset.plus, 1);
    });
}

function changeQty(key, delta) {
  const [id, size] = key.split("|");

  const product = checkoutCart.find(
    x =>
      String(x.id) === String(id) &&
      String(x.size) === String(size)
  );

  if (!product) return;

  product.qty =
    Number(product.qty || 1) + delta;

  if (product.qty <= 0) {
    checkoutCart =
      checkoutCart.filter(x => x !== product);
  }

  localStorage.setItem(
    "revoraCartItems",
    JSON.stringify(checkoutCart)
  );

  renderCheckout();
}

/* =========================
   NOVA POSHTA
========================= */

const cityInput =
  form.querySelector('[name="city"]');

const warehouseInput =
  form.querySelector('[name="warehouse"]');

function createResultsBox(input, className) {
  const box =
    document.createElement("div");

  box.className = className;
  box.style.display = "none";

  input.parentElement.style.position =
    "relative";

  input.parentElement.appendChild(box);

  return box;
}

const cityResults =
  createResultsBox(
    cityInput,
    "npResults npCityResults"
  );

const warehouseResults =
  createResultsBox(
    warehouseInput,
    "npResults npWarehouseResults"
  );

async function novaRequest(payload) {
  const response = await fetch(
    "/api/nova-poshta",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(payload)
    }
  );

  const result =
    await response.json();

  if (!response.ok || !result.ok) {
    console.error(
      "Nova Poshta error:",
      result
    );

    throw new Error(
      "Nova Poshta request failed"
    );
  }

  return result.data;
}

function closeResults(box) {
  box.style.display = "none";
  box.innerHTML = "";
}

cityInput.setAttribute(
  "autocomplete",
  "off"
);

warehouseInput.setAttribute(
  "autocomplete",
  "off"
);

/* ПОШУК МІСТА */

cityInput.addEventListener(
  "input",
  () => {

    clearTimeout(cityTimer);

    selectedCityRef = "";

    warehouseInput.value = "";

    closeResults(
      warehouseResults
    );

    const search =
      cityInput.value.trim();

    if (search.length < 2) {
      closeResults(
        cityResults
      );

      return;
    }

    cityTimer = setTimeout(
      async () => {

        try {
          cityResults.innerHTML = `
            <div class="npLoading">
              Шукаємо місто…
            </div>
          `;

          cityResults.style.display =
            "block";

          const data =
            await novaRequest({
              action: "cities",
              search
            });

          let addresses = [];

          if (Array.isArray(data)) {
            data.forEach(group => {
              if (
                Array.isArray(
                  group?.Addresses
                )
              ) {
                addresses.push(
                  ...group.Addresses
                );
              }
            });
          }

          if (!addresses.length) {
            cityResults.innerHTML = `
              <div class="npLoading">
                Нічого не знайдено
              </div>
            `;

            return;
          }

          cityResults.innerHTML =
            addresses.map(city => {

              const name =
                city.Present ||
                city.MainDescription ||
                city.Description ||
                "Населений пункт";

              const ref =
                city.DeliveryCity ||
                city.Ref ||
                city.SettlementRef ||
                "";

              return `
                <button
                  type="button"
                  class="npOption"
                  data-city-ref="${ref}"
                  data-city-name="${String(name)
                    .replace(
                      /"/g,
                      "&quot;"
                    )}"
                >
                  ${name}
                </button>
              `;
            }).join("");

          cityResults
            .querySelectorAll(
              ".npOption"
            )
            .forEach(btn => {

              btn.onclick = () => {

                selectedCityRef =
                  btn.dataset.cityRef;

                cityInput.value =
                  btn.dataset.cityName;

                closeResults(
                  cityResults
                );

                warehouseInput.value =
                  "";

                warehouseInput.focus();
              };
            });

        } catch (error) {

          console.error(error);

          cityResults.innerHTML = `
            <div class="npLoading">
              Помилка завантаження міст
            </div>
          `;
        }

      },
      350
    );
  }
);

/* ВІДДІЛЕННЯ / ПОШТОМАТИ */

async function loadWarehouses(
  search = ""
) {

  if (!selectedCityRef) {

    warehouseResults.innerHTML = `
      <div class="npLoading">
        Спочатку виберіть місто зі списку
      </div>
    `;

    warehouseResults.style.display =
      "block";

    return;
  }

  try {

    warehouseResults.innerHTML = `
      <div class="npLoading">
        Завантажуємо відділення…
      </div>
    `;

    warehouseResults.style.display =
      "block";

    const data =
      await novaRequest({
        action: "warehouses",
        cityRef: selectedCityRef,
        search
      });

    const deliveryType =
      form.querySelector(
        '[name="delivery"]:checked'
      )?.value;

    let warehouses =
      Array.isArray(data)
        ? data
        : [];

    /* ПОШТОМАТ */

    if (deliveryType === "locker") {

      warehouses =
        warehouses.filter(x => {

          const description =
            String(
              x.Description || ""
            ).toLowerCase();

          const category =
            String(
              x.CategoryOfWarehouse ||
              ""
            ).toLowerCase();

          return (
            description.includes(
              "поштомат"
            ) ||
            category.includes(
              "поштомат"
            )
          );
        });

    }

    /* ВІДДІЛЕННЯ */

    else {

      warehouses =
        warehouses.filter(x => {

          const description =
            String(
              x.Description || ""
            ).toLowerCase();

          const category =
            String(
              x.CategoryOfWarehouse ||
              ""
            ).toLowerCase();

          return !(
            description.includes(
              "поштомат"
            ) ||
            category.includes(
              "поштомат"
            )
          );
        });

    }

    if (!warehouses.length) {

      warehouseResults.innerHTML = `
        <div class="npLoading">
          Нічого не знайдено
        </div>
      `;

      return;
    }

    warehouseResults.innerHTML =
      warehouses
        .slice(0, 100)
        .map(x => {

          const description =
            x.Description ||
            "Відділення";

          return `
            <button
              type="button"
              class="npOption warehouseOption"
              data-warehouse="${String(
                description
              ).replace(
                /"/g,
                "&quot;"
              )}"
            >
              ${description}
            </button>
          `;
        })
        .join("");

    warehouseResults
      .querySelectorAll(
        ".npOption"
      )
      .forEach(btn => {

        btn.onclick = () => {

          warehouseInput.value =
            btn.dataset.warehouse;

          closeResults(
            warehouseResults
          );
        };
      });

  } catch (error) {

    console.error(error);

    warehouseResults.innerHTML = `
      <div class="npLoading">
        Помилка завантаження відділень
      </div>
    `;
  }
}

/* ФОКУС НА ВІДДІЛЕННЯ */

warehouseInput.addEventListener(
  "focus",
  () => {

    loadWarehouses(
      warehouseInput.value.trim()
    );
  }
);

/* ПОШУК ВІДДІЛЕННЯ */

warehouseInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      warehouseTimer
    );

    warehouseTimer =
      setTimeout(
        () => {

          loadWarehouses(
            warehouseInput.value.trim()
          );

        },
        300
      );
  }
);

/* ЗМІНА ТИПУ ДОСТАВКИ */

form
  .querySelectorAll(
    '[name="delivery"]'
  )
  .forEach(input => {

    input.addEventListener(
      "change",
      () => {

        warehouseInput.value =
          "";

        closeResults(
          warehouseResults
        );

        if (selectedCityRef) {
          loadWarehouses();
        }
      }
    );
  });

/* ЗАКРИТТЯ СПИСКІВ */

document.addEventListener(
  "click",
  event => {

    if (
      !cityInput.contains(
        event.target
      ) &&
      !cityResults.contains(
        event.target
      )
    ) {
      closeResults(
        cityResults
      );
    }

    if (
      !warehouseInput.contains(
        event.target
      ) &&
      !warehouseResults.contains(
        event.target
      )
    ) {
      closeResults(
        warehouseResults
      );
    }
  }
);

/* =========================
   ЗАМОВЛЕННЯ
========================= */

let pendingOrderNumber = null;

form.onsubmit =
  async event => {

    event.preventDefault();

    if (!checkoutCart.length) {
      return;
    }

    if (!selectedCityRef) {

      alert(
        "Будь ласка, виберіть місто Nova Poshta зі списку."
      );

      cityInput.focus();

      return;
    }

    if (
      !warehouseInput.value.trim()
    ) {

      alert(
        "Будь ласка, виберіть відділення або поштомат."
      );

      warehouseInput.focus();

      return;
    }

    const btn =
      document.querySelector(
        ".placeOrder"
      );

    btn.disabled = true;

    btn.textContent =
      "НАДСИЛАЄМО…";

    const fd =
      new FormData(form);

    const number = pendingOrderNumber ||= "RV-" + crypto.randomUUID();

    const order = {

      number,

      date:
        new Date()
          .toISOString(),

      customer:
        Object.fromEntries(fd),

      items:
        checkoutCart,

      total:
        checkoutCart.reduce(
          (sum, x) =>
            sum +
            Number(x.price) *
            Number(x.qty),
          0
        ),

      status:
        "Прийнято"
    };

    try {

      const response =
        await fetch(
          "/api/new-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                order
              )
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.ok !== true ||
        result.stored !== true
      ) {
        throw new Error(
          "Order send failed"
        );
      }

      order.total = result.total;
      order.items = result.items;
      pendingOrderNumber = null;

      const orders =
        JSON.parse(
          localStorage.getItem(
            "revoraOrders"
          ) || "[]"
        );

      orders.unshift(order);

      localStorage.setItem(
        "revoraOrders",
        JSON.stringify(orders)
      );

      localStorage.removeItem(
        "revoraCartItems"
      );

      checkoutCart = [];

      const successText =
        document.querySelector(
          "#successText"
        );

      if (successText) {

        successText.innerHTML = `
          Номер вашого замовлення:
          <b>#${number}</b>
          <br>

          Сума:
          <b>
            ${cMoney(order.total)}
          </b>

          <br><br>

          Замовлення успішно
          передано менеджеру REVORA.
        `;
      }

      const success =
        document.querySelector(
          "#orderSuccess"
        );

      if (success) {
        success.classList.add(
          "show"
        );
      }

    } catch (error) {

      console.error(error);

      alert(
        "Не вдалося надіслати замовлення. Спробуйте ще раз."
      );

      btn.disabled = false;

      btn.textContent =
        "ПІДТВЕРДИТИ ЗАМОВЛЕННЯ";
    }
  };

renderCheckout();
