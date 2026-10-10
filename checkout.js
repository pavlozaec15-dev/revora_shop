const cMoney = n =>
  Number(n || 0).toLocaleString("uk-UA") + " ₴";

let checkoutCart = JSON.parse(
  localStorage.getItem("revoraCartItems") || "[]"
);

const items = document.querySelector("#checkoutItems");
const totals = document.querySelector("#checkoutTotals");
const form = document.querySelector("#checkoutForm");

let selectedCityRef = "";
let novaPoshtaUnavailable = false;
let cityTimer;
let warehouseTimer;
let appliedPromo = null;
let storeCheckoutSettings=null;
async function loadCheckoutSettings(){
 const btn=document.querySelector('.placeOrder');
 try{
  const response=await fetch('/api/new-order',{cache:'no-store'});
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error(result.error||'Налаштування недоступні');
  storeCheckoutSettings=result.settings;
  const deliveryAllowed=storeCheckoutSettings.delivery_enabled!=='false';
  const codAllowed=storeCheckoutSettings.cod_enabled!=='false';
  const cod=document.querySelector('input[name="payment"][value="cod"]');
  if(cod)cod.disabled=!codAllowed;
  if(btn)btn.disabled=!deliveryAllowed||!codAllowed||!checkoutCart.length;
  let notice=document.getElementById('checkoutSettingsNotice');
  if(!notice){notice=document.createElement('p');notice.id='checkoutSettingsNotice';notice.setAttribute('role','status');form.prepend(notice)}
  notice.textContent=!deliveryAllowed?'Доставку тимчасово вимкнено.':!codAllowed?'Післяплата тимчасово недоступна.':'';
 }catch(e){
  storeCheckoutSettings=null;
  // Keep checkout available if the settings endpoint is temporarily unreachable.
  // The order API still validates settings and the order server-side.
  if(btn)btn.disabled=!checkoutCart.length;
  let notice=document.getElementById('checkoutSettingsNotice');
  if(!notice){notice=document.createElement('p');notice.id='checkoutSettingsNotice';notice.setAttribute('role','status');form.prepend(notice)}
  notice.textContent='Не вдалося завантажити налаштування. Ви можете спробувати оформити замовлення — сервер перевірить його перед збереженням.';
 }
}



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
        ${(()=>{const p=(typeof P!=='undefined'?P:[]).find(p=>String(p.id)===String(x.id));const photo=p?.images?.[0]||x.image;return photo?'<img src="'+String(photo).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'" alt="" loading="lazy">':'REVORA'})()}
      </div>

      <div>
        <b>${x.name}</b>

        <small>
          ${x.size ? `Розмір: ${x.size}` : "Без розміру"}
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

  const discount = appliedPromo?.subtotal===subtotal ? appliedPromo.discount : 0;
  if (appliedPromo && appliedPromo.subtotal !== subtotal) {
    appliedPromo = null;
    const msg=document.querySelector('#promoMessage');
    if(msg)msg.textContent='Сума змінилася. Застосуй промокод ще раз.';
  }
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

    ${discount ? '<div class="sumLine"><span>Знижка '+appliedPromo.code+'</span><b>−'+cMoney(discount)+'</b></div>' : ''}
    <div class="sumLine grand">
      <span>Товари до оплати при отриманні</span>
      <b>${cMoney(subtotal-discount)}</b>
    </div>
    <div class="sumLine"><span>Окрема передоплата постачальнику (після узгодження з менеджером)</span><b>200 ₴</b></div><div class="sumLine grand"><span>Загалом, без доставки</span><b>${cMoney(subtotal-discount+200)}</b></div><p class="formHint">200 грн не входять у вартість товару та не віднімаються від суми післяплати. Зараз сайт не приймає платежі. Умови повернення передоплати уточнюйте до оплати.</p>
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
      [result?.error, ...(Array.isArray(result?.details) ? result.details : [])].filter(Boolean).join(' ') ||
      'Помилка підключення до Нової пошти.'
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

          novaPoshtaUnavailable = false;
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

          novaPoshtaUnavailable = true;
          cityResults.innerHTML = `
            <div class="npLoading">Автопошук тимчасово недоступний. Впиши місто вручну, а потім номер або адресу відділення. ${String(error.message).replace(/[&<>]/g, '')}</div>
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
        ${novaPoshtaUnavailable ? "Впиши номер або адресу відділення вручну" : "Спочатку виберіть місто зі списку"}
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
      form.querySelector('[name="delivery"]')?.value;

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

    novaPoshtaUnavailable = true;
    warehouseResults.innerHTML = `
      <div class="npLoading">Автопошук відділень тимчасово недоступний. Впиши номер або адресу вручну.</div>
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

/* ПРОМОКОДИ */
const promoInput=document.querySelector('#promoCode');
const promoMessage=document.querySelector('#promoMessage');
if(promoInput){
 promoInput.addEventListener('input',()=>{
  appliedPromo=null;promoMessage.textContent='';renderCheckout();
 });
 document.querySelector('#applyPromo').onclick=async()=>{
  const code=promoInput.value.trim().toUpperCase();
  if(!code){promoMessage.textContent='Введіть промокод.';return}
  const subtotal=checkoutCart.reduce((sum,x)=>sum+Number(x.price)*Number(x.qty),0);
  promoMessage.textContent='Перевіряємо…';
  try{
   const response=await fetch('/api/validate-promo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,subtotal})});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'Не вдалося застосувати промокод.');
   appliedPromo={code:data.code,discount:data.discount,subtotal};
   promoInput.value=data.code;promoMessage.textContent='✅ Промокод застосовано: −'+cMoney(data.discount);
   renderCheckout();
  }catch(e){appliedPromo=null;promoMessage.textContent=e.message;renderCheckout()}
 };
}

/* =========================
   ЗАМОВЛЕННЯ
========================= */

let pendingOrderNumber = null;

form.querySelector('[name="phone"]')?.addEventListener("input", event => event.target.setCustomValidity(""));

form.onsubmit =
  async event => {

    event.preventDefault();

    if (!checkoutCart.length) {
      return;
    }
    if(storeCheckoutSettings&&(storeCheckoutSettings.delivery_enabled==='false'||storeCheckoutSettings.cod_enabled==='false')){alert('Оформлення замовлення зараз недоступне. Спробуйте пізніше.');return}

    // Validate contact phone before sending an order to the manager.
    const phoneField = form.querySelector('[name="phone"]');
    const digits = (phoneField?.value || "").replace(/\D/g, "");
    const validPhone = /^0\d{9}$/.test(digits) || /^380\d{9}$/.test(digits);
    if (!validPhone) {
      phoneField.setCustomValidity("Введіть український номер: 0XXXXXXXXX або +380XXXXXXXXX");
      phoneField.reportValidity();
      phoneField.focus();
      return;
    }
    phoneField.setCustomValidity("");

    if (!selectedCityRef && !novaPoshtaUnavailable) {

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

      promo_code: appliedPromo?.code || "",

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

      const result = await response.json().catch(() => null);

      if (
        !response.ok ||
        result?.ok !== true ||
        result?.stored !== true
      ) {
        throw new Error(
          result?.error ||
          `Помилка сервера (${response.status}). Спробуйте ще раз.`
        );
      }

      order.total = result.total;
      order.discount = result.discount || 0;
      order.items = result.items;
      pendingOrderNumber = null;
      appliedPromo = null;

      // The server has confirmed the order. Browser storage errors must never
      // turn a successful purchase into an apparent failed submission.
      try {
        let orders;
        try { orders = JSON.parse(localStorage.getItem("revoraOrders") || "[]"); }
        catch { orders = []; }
        if (!Array.isArray(orders)) orders = [];
        orders.unshift(order);
        localStorage.setItem("revoraOrders", JSON.stringify(orders));
      } catch (storageError) { console.warn("Local order history unavailable", storageError); }
      try { localStorage.removeItem("revoraCartItems"); }
      catch (storageError) { console.warn("Cart storage unavailable", storageError); }
      checkoutCart = [];

      const successText =
        document.querySelector(
          "#successText"
        );

      if (successText) {
        successText.innerHTML = `
          Номер замовлення: <b>#${number}</b><br>
          Товар при отриманні: <b>${cMoney(order.total)}</b><br>
          Окрема передоплата: <b>200 грн</b><br>
          Загалом без доставки: <b>${cMoney(Number(order.total) + 200)}</b><br><br>
          Замовлення отримано менеджером REVORA.<br>
          Дочекайтеся підтвердження наявності товару та інструкцій щодо передоплати.
          На сайті оплату не проведено.
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
        error?.message || "Не вдалося надіслати замовлення. Спробуйте ще раз."
      );

      btn.disabled = false;

      btn.textContent =
        "ПІДТВЕРДИТИ ЗАМОВЛЕННЯ";
    }
  };

renderCheckout();
loadCheckoutSettings();
