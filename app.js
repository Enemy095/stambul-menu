"use strict";

const STORAGE_KEY = "stambul-menu-cart-v1";
const DEFAULT_PHONE = "79292979937";

const CONFIG = {
  restaurantName: "Ресторан-кафе Стамбул",
  cuisine: "Турецкая кухня",
  schedule: "с 10:00 до 23:00",
  whatsappPhone: DEFAULT_PHONE,
  currencyText: "₽"
};

const MENU = Object.freeze([
  { id: "mercimek", category: "Супы", name: "Мерджимек чорбасы", description: "Традиционный крем-суп из красной чечевицы с лимоном", price: 320, image: "./images/dishes/mercimek-corbasi.webp" },
  { id: "iskender", category: "Горячее", name: "Искендер-кебаб", description: "Тонкая говядина, лепёшка, томатный соус и йогурт", price: 690, image: "./images/dishes/iskender-kebab.webp" },
  { id: "adana", category: "Горячее", name: "Адана-кебаб", description: "Пряный кебаб из рубленой баранины с овощами", price: 650, image: "./images/dishes/adana-kebab.webp" },
  { id: "pide", category: "Выпечка", name: "Пиде с сыром и мясом", description: "Турецкая лодочка из тонкого теста с сочной начинкой", price: 520, image: "./images/dishes/pide-cheese-meat.webp" },
  { id: "lahmacun", category: "Выпечка", name: "Лахмаджун", description: "Тонкая лепёшка с мясом, томатами и свежей зеленью", price: 390, image: "./images/dishes/lahmacun.webp" },
  { id: "dolma", category: "Закуски", name: "Долма", description: "Виноградные листья с пряной мясной начинкой", price: 460, image: "./images/dishes/dolma.webp" },
  { id: "meze", category: "Закуски", name: "Ассорти мезе", description: "Хумус, хайдари, бабагануш и свежая лепёшка", price: 580, image: "./images/dishes/meze-assorti.webp" },
  { id: "salad", category: "Салаты", name: "Чобан-салат", description: "Томаты, огурцы, перец, зелень и гранатовый соус", price: 350, image: "./images/dishes/choban-salad.webp" },
  { id: "baklava", category: "Десерты", name: "Пахлава", description: "Слоёное тесто, фисташки и ароматный медовый сироп", price: 330, image: "./images/dishes/baklava.webp" },
  { id: "sutlac", category: "Десерты", name: "Сютлач", description: "Нежный запечённый рисовый пудинг по-турецки", price: 290, image: "./images/dishes/sutlac.webp" },
  { id: "tea", category: "Напитки", name: "Турецкий чай", description: "Крепкий чёрный чай в традиционном стакане", price: 140, image: "./images/dishes/turkish-tea.webp" },
  { id: "ayran", category: "Напитки", name: "Айран", description: "Освежающий кисломолочный напиток", price: 180, image: "./images/dishes/ayran.webp" }
]);

const state = {
  category: "Все",
  cart: new Map(),
  selectedOrderType: "Предзаказ"
};

const elements = {
  categories: document.querySelector("#categories"),
  menuList: document.querySelector("#menuList"),
  dishCount: document.querySelector("#dishCount"),
  cartBadge: document.querySelector("#cartBadge"),
  cartBar: document.querySelector("#cartBar"),
  cartBarCount: document.querySelector("#cartBarCount"),
  cartBarTotal: document.querySelector("#cartBarTotal"),
  backdrop: document.querySelector("#cartBackdrop"),
  cartItems: document.querySelector("#cartItems"),
  cartTotal: document.querySelector("#cartTotal"),
  orderForm: document.querySelector("#orderForm"),
  phoneField: document.querySelector("#phoneField"),
  customerPhone: document.querySelector("#customerPhone"),
  addressField: document.querySelector("#addressField"),
  deliveryAddress: document.querySelector("#deliveryAddress"),
  customerName: document.querySelector("#customerName"),
  guestCount: document.querySelector("#guestCount"),
  orderComment: document.querySelector("#orderComment"),
  toast: document.querySelector("#toast"),
  testResults: document.querySelector("#testResults")
};

init();

function init() {
  applyQueryParams();
  restoreState();
  renderRestaurantInfo();
  renderCategories();
  renderMenu();
  restoreFormFields();
  updateOrderTypeUI();
  updateCartSummary();
  bindEvents();

  if (new URLSearchParams(window.location.search).get("test") === "1") {
    runSelfTests();
  }
}

function bindEvents() {
  elements.categories.addEventListener("click", handleCategoryClick);
  elements.menuList.addEventListener("pointerdown", handleQuantityPointerDown);
  elements.cartItems.addEventListener("pointerdown", handleQuantityPointerDown);
  elements.menuList.addEventListener("click", handleQuantityClick);
  elements.cartItems.addEventListener("click", handleQuantityClick);
  document.querySelector("#headerCart").addEventListener("click", openCart);
  elements.cartBar.addEventListener("click", openCart);
  document.querySelector("#closeCart").addEventListener("click", closeCart);
  document.querySelector("#clearCart").addEventListener("click", clearCart);
  elements.backdrop.addEventListener("click", event => {
    if (event.target === elements.backdrop) closeCart();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCart();
  });
  elements.orderForm.addEventListener("change", handleFormChange);
  elements.orderForm.addEventListener("input", handleFormInput);
  elements.orderForm.addEventListener("submit", sendOrder);
  elements.customerPhone.addEventListener("blur", handleCustomerPhoneBlur);
}

function applyQueryParams() {
  const phone = new URLSearchParams(window.location.search).get("phone");
  if (phone) CONFIG.whatsappPhone = normalizePhone(phone) || DEFAULT_PHONE;
}

function renderRestaurantInfo() {
  document.querySelector("#restaurantName").textContent = CONFIG.restaurantName;
  document.querySelector("#cuisineText").textContent = CONFIG.cuisine;
  document.querySelector("#scheduleText").textContent = CONFIG.schedule;
  document.title = `${CONFIG.restaurantName} — электронное меню`;
}

function renderCategories() {
  const categories = ["Все", ...new Set(MENU.map(item => item.category))];
  elements.categories.innerHTML = categories.map(category => `
    <button class="category-button ${category === state.category ? "active" : ""}"
      type="button" data-category="${category}">${category}</button>
  `).join("");
}

function renderMenu() {
  elements.menuList.innerHTML = MENU.map(item => {
    const quantity = state.cart.get(item.id) || 0;
    return `
      <article class="dish-card" data-dish-id="${item.id}" data-category="${item.category}">
        <div class="dish-visual">
          <img src="${item.image}" alt="${item.name}" width="1000" height="750" loading="lazy">
        </div>
        <div class="dish-body">
          <p class="dish-category">${item.category}</p>
          <h3 class="dish-title">${item.name}</h3>
          <p class="dish-description">${item.description}</p>
          <div class="dish-footer">
            <strong class="price">${formatMoney(item.price)}</strong>
            ${quantityControl(item.id, quantity)}
          </div>
        </div>
      </article>`;
  }).join("");
  applyCategoryFilter();
}

function quantityControl(id, quantity) {
  return `<div class="quantity" aria-label="Количество">
    <button type="button" data-action="decrease" data-id="${id}" ${quantity === 0 ? "disabled" : ""} aria-label="Уменьшить количество">−</button>
    <span data-quantity-value>${quantity}</span>
    <button type="button" data-action="increase" data-id="${id}" aria-label="Увеличить количество">+</button>
  </div>`;
}

function handleCategoryClick(event) {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  elements.categories.querySelectorAll("[data-category]").forEach(categoryButton => {
    categoryButton.classList.toggle("active", categoryButton.dataset.category === state.category);
  });
  applyCategoryFilter();
}

function applyCategoryFilter() {
  let visibleCount = 0;
  elements.menuList.querySelectorAll(".dish-card").forEach(card => {
    const isVisible = state.category === "Все" || card.dataset.category === state.category;
    card.classList.toggle("is-hidden", !isVisible);
    if (isVisible) visibleCount += 1;
  });
  elements.dishCount.textContent = `${visibleCount} ${plural(visibleCount, "позиция", "позиции", "позиций")}`;
}

function updateDishCardQuantity(id) {
  const card = elements.menuList.querySelector(`[data-dish-id="${id}"]`);
  if (!card) return;
  const quantity = state.cart.get(id) || 0;
  const value = card.querySelector("[data-quantity-value]");
  const decreaseButton = card.querySelector('[data-action="decrease"]');
  if (value) value.textContent = quantity;
  if (decreaseButton) decreaseButton.disabled = quantity === 0;
  card.classList.toggle("is-selected", quantity > 0);
}

let lastQuantityPointerActionAt = 0;
let lastQuantityPointerActionKey = "";

function handleQuantityPointerDown(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled || event.button > 0) return;
  event.preventDefault();
  lastQuantityPointerActionAt = Date.now();
  lastQuantityPointerActionKey = `${button.dataset.action}:${button.dataset.id}`;
  applyQuantityAction(button);
}

function handleQuantityClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const actionKey = `${button.dataset.action}:${button.dataset.id}`;
  if (actionKey === lastQuantityPointerActionKey && Date.now() - lastQuantityPointerActionAt < 500) return;
  applyQuantityAction(button);
}

function applyQuantityAction(button) {
  changeQuantity(button.dataset.id, button.dataset.action === "increase" ? 1 : -1);
}

function changeQuantity(id, delta) {
  if (!MENU.some(item => item.id === id)) return;
  updateCartQuantity(state.cart, id, delta);
  saveState();
  updateDishCardQuantity(id);
  updateCartSummary();
  if (elements.backdrop.classList.contains("open")) renderCart();
}

function updateCartQuantity(cart, id, delta) {
  const current = cart.get(id) || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) cart.delete(id);
  else cart.set(id, next);
  return next;
}

function getCartLines(cart = state.cart) {
  return [...cart].map(([id, quantity]) => {
    const item = MENU.find(entry => entry.id === id);
    return item ? { ...item, quantity, total: item.price * quantity } : null;
  }).filter(Boolean);
}

function getCartCount(cart = state.cart) {
  return [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
}

function getCartTotal(cart = state.cart) {
  return getCartLines(cart).reduce((sum, item) => sum + item.total, 0);
}

function updateCartSummary() {
  const count = getCartCount();
  const total = formatMoney(getCartTotal());
  elements.cartBadge.textContent = count;
  elements.cartBarCount.textContent = count;
  elements.cartBarTotal.textContent = total;
  elements.cartTotal.textContent = total;
  elements.cartBar.hidden = count === 0;
}

function openCart() {
  if (getCartCount() === 0) {
    showToast("Добавьте хотя бы одно блюдо");
    return;
  }
  renderCart();
  elements.backdrop.classList.add("open");
  elements.backdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.querySelector("#closeCart").focus();
}

function closeCart() {
  if (!elements.backdrop.classList.contains("open")) return;
  elements.backdrop.classList.remove("open");
  elements.backdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderCart() {
  const lines = getCartLines();
  elements.cartItems.innerHTML = lines.map(item => `
    <div class="cart-item">
      <div class="cart-item__main">
        <p class="cart-item__name">${item.name}</p>
        <small class="cart-item__formula">${formatMoney(item.price)} × ${item.quantity} =</small>
      </div>
      <strong class="cart-item__line-total">${formatMoney(item.total)}</strong>
      <div class="cart-item__controls">${quantityControl(item.id, item.quantity)}</div>
    </div>
  `).join("");
  updateCartSummary();
  if (!lines.length) closeCart();
}

function clearCart() {
  state.cart.clear();
  elements.customerPhone.value = "";
  elements.phoneField.classList.remove("invalid");
  saveState();
  MENU.forEach(item => updateDishCardQuantity(item.id));
  updateCartSummary();
  closeCart();
  showToast("Корзина очищена");
}

function handleFormChange(event) {
  if (event.target.name === "orderType") {
    state.selectedOrderType = event.target.value;
    updateOrderTypeUI();
  }
  saveState();
}

function handleFormInput(event) {
  if (event.target === elements.customerPhone) {
    elements.phoneField.classList.remove("invalid");
  }
  if (event.target === elements.deliveryAddress) {
    elements.addressField.classList.remove("invalid");
  }
  saveState();
}

function handleCustomerPhoneBlur() {
  const normalized = normalizeCustomerPhone(elements.customerPhone.value);
  if (!normalized) return;
  elements.customerPhone.value = formatCustomerPhoneForDisplay(normalized);
  elements.phoneField.classList.remove("invalid");
  saveState();
}

function updateOrderTypeUI() {
  const radio = elements.orderForm.querySelector(`input[name="orderType"][value="${state.selectedOrderType}"]`);
  if (radio) radio.checked = true;
  const needsAddress = state.selectedOrderType === "Доставка";
  elements.addressField.hidden = !needsAddress;
  elements.addressField.classList.remove("invalid");
}

function readOrderData() {
  return {
    type: state.selectedOrderType,
    customerPhone: elements.customerPhone.value.trim(),
    customerName: elements.customerName.value.trim(),
    guestCount: elements.guestCount.value.trim(),
    deliveryAddress: elements.deliveryAddress.value.trim(),
    orderComment: elements.orderComment.value.trim(),
    cart: state.cart
  };
}

function validateOrder(order = readOrderData()) {
  if (getCartCount(order.cart) === 0) {
    return { valid: false, field: "cart", message: "Добавьте хотя бы одно блюдо" };
  }
  if (!["Предзаказ", "Доставка", "Самовывоз"].includes(order.type)) {
    return { valid: false, field: "orderType", message: "Выберите тип заказа" };
  }
  if (!normalizeCustomerPhone(order.customerPhone)) {
    return { valid: false, field: "customerPhone", message: "Укажите корректный номер для связи" };
  }
  if (order.type === "Доставка" && !order.deliveryAddress) {
    return { valid: false, field: "deliveryAddress", message: "Укажите адрес доставки" };
  }
  if (!normalizePhone(CONFIG.whatsappPhone)) {
    return { valid: false, field: "managerPhone", message: "Не задан номер менеджера" };
  }
  return { valid: true };
}

function sendOrder(event) {
  event.preventDefault();
  const order = readOrderData();
  const validation = validateOrder(order);
  if (!validation.valid) {
    if (validation.field === "customerPhone") {
      elements.phoneField.classList.add("invalid");
      elements.customerPhone.focus();
    } else if (validation.field === "deliveryAddress") {
      elements.addressField.classList.add("invalid");
      elements.deliveryAddress.focus();
    }
    showToast(validation.message);
    return;
  }
  const message = buildWhatsAppMessage(order);
  window.location.href = buildWhatsAppUrl(CONFIG.whatsappPhone, message);
}

function buildWhatsAppMessage(order = readOrderData()) {
  const orderLines = getCartLines(order.cart).map(buildWhatsAppOrderItemLine).join("\n");
  const codeFence = "```";
  const details = [
    `*Тип заказа: ${order.type.toUpperCase()}*`,
    `Номер для связи: ${normalizeCustomerPhone(order.customerPhone)}`,
    order.customerName ? `Имя: ${order.customerName}` : "",
    order.guestCount ? `Количество гостей: ${order.guestCount}` : "",
    order.type === "Доставка" && order.deliveryAddress ? `Адрес доставки: ${order.deliveryAddress}` : ""
  ].filter(Boolean).join("\n");
  const comment = order.orderComment ? `\n\nКомментарий: ${order.orderComment}` : "";

  return `*${CONFIG.restaurantName}*\n*Заказ с электронного меню*\n\n${details}\n\n*Заказ:*\n${codeFence}\n${orderLines}\n${codeFence}${comment}\n\n*Сумма: ${formatMoney(getCartTotal(order.cart))}*`;
}

function buildWhatsAppOrderItemLine(item, index) {
  const firstLine = `${index + 1}. ${item.name} — ${formatMoney(item.price)} × ${item.quantity} =`;
  const secondLine = formatMoney(item.total).padStart(36);
  return `${firstLine}\n${secondLine}`;
}

function buildWhatsAppUrl(phone, message) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function normalizeCustomerPhone(value) {
  let digits = String(value || "").replace(/[^\d]/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `7${digits}`;
  }
  return /^7\d{10}$/.test(digits) ? `+${digits}` : "";
}

function formatCustomerPhoneForDisplay(phone) {
  const normalized = normalizeCustomerPhone(phone);
  if (!normalized) return "";
  return normalized.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 ($1) $2-$3-$4");
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("ru-RU")} ${CONFIG.currencyText}`;
}

function saveState() {
  const data = {
    cart: Object.fromEntries(state.cart),
    selectedOrderType: state.selectedOrderType,
    customerPhone: elements.customerPhone.value,
    customerName: elements.customerName.value,
    guestCount: elements.guestCount.value,
    deliveryAddress: elements.deliveryAddress.value,
    orderComment: elements.orderComment.value
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Не удалось сохранить корзину:", error);
  }
}

function restoreState() {
  let saved;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Некорректный формат");
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    console.warn("Повреждённое сохранение корзины очищено");
    return;
  }

  const validOrderTypes = ["Предзаказ", "Доставка", "Самовывоз"];
  if (validOrderTypes.includes(saved.selectedOrderType)) {
    state.selectedOrderType = saved.selectedOrderType;
  }
  if (saved.cart && typeof saved.cart === "object" && !Array.isArray(saved.cart)) {
    Object.entries(saved.cart).forEach(([id, quantity]) => {
      if (MENU.some(item => item.id === id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) {
        state.cart.set(id, quantity);
      }
    });
  }
  state.savedFields = {
    customerPhone: typeof saved.customerPhone === "string" ? saved.customerPhone : "",
    customerName: typeof saved.customerName === "string" ? saved.customerName : "",
    guestCount: typeof saved.guestCount === "string" ? saved.guestCount : "",
    deliveryAddress: typeof saved.deliveryAddress === "string" ? saved.deliveryAddress : "",
    orderComment: typeof saved.orderComment === "string" ? saved.orderComment : ""
  };
}

function restoreFormFields() {
  const saved = state.savedFields || {};
  elements.customerPhone.value = saved.customerPhone || "";
  elements.customerName.value = saved.customerName || "";
  elements.guestCount.value = saved.guestCount || "";
  elements.deliveryAddress.value = saved.deliveryAddress || "";
  elements.orderComment.value = saved.orderComment || "";
}

function plural(number, one, few, many) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function runSelfTests() {
  const testCart = new Map([["mercimek", 3], ["ayran", 1]]);
  const messageFormatCart = new Map([
    ["iskender", 2],
    ["pide", 6],
    ["adana", 4],
    ["lahmacun", 2],
    ["dolma", 2]
  ]);
  const quantityTestCart = new Map();
  for (let index = 0; index < 5; index += 1) {
    updateCartQuantity(quantityTestCart, "mercimek", 1);
  }
  const baseOrder = {
    type: "Предзаказ",
    customerPhone: "+7 (999) 123-45-67",
    customerName: "",
    guestCount: "",
    deliveryAddress: "",
    orderComment: "",
    cart: testCart
  };
  const deliveryOrder = { ...baseOrder, type: "Доставка", deliveryAddress: "ул. Ленина, 10" };
  const emptyOrder = { ...baseOrder, cart: new Map() };
  const preOrderMessage = buildWhatsAppMessage(baseOrder);
  const deliveryMessage = buildWhatsAppMessage(deliveryOrder);
  const messageFormatOrder = { ...baseOrder, customerName: "Пор", cart: messageFormatCart };
  const messageFormatExample = buildWhatsAppMessage(messageFormatOrder);
  const orderBlockMarker = "*Заказ:*\n```\n";
  const orderBlock = messageFormatExample.split(orderBlockMarker)[1]?.split("\n```")[0] || "";
  const orderBlockLines = orderBlock.split("\n");
  const tests = [
    ["normalizePhone форматирует номер", normalizePhone("+7 (929) 297-99-37") === "79292979937"],
    ["normalizePhone сохраняет цифры", normalizePhone("79292979937") === "79292979937"],
    ["номер клиента нормализуется из +7", normalizeCustomerPhone("+7 (999) 123-45-67") === "+79991234567"],
    ["номер клиента нормализуется из 8", normalizeCustomerPhone("8 999 123-45-67") === "+79991234567"],
    ["номер клиента нормализуется из 7", normalizeCustomerPhone("79991234567") === "+79991234567"],
    ["номер клиента нормализуется из 10 цифр", normalizeCustomerPhone("9991234567") === "+79991234567"],
    ["номер клиента нормализуется с дефисами", normalizeCustomerPhone("8999-123-45-67") === "+79991234567"],
    ["короткий номер клиента отклоняется", normalizeCustomerPhone("123") === ""],
    ["номер форматируется для поля", formatCustomerPhoneForDisplay("89991234567") === "+7 (999) 123-45-67"],
    ["formatMoney форматирует рубли со знаком ₽", formatMoney(1800).replace(/\u00a0/g, " ") === "1 800 ₽"],
    ["пустую корзину нельзя отправить", !validateOrder(emptyOrder).valid],
    ["пустой номер клиента отклоняется", !validateOrder({ ...baseOrder, customerPhone: "" }).valid],
    ["невалидный номер клиента отклоняется", !validateOrder({ ...baseOrder, customerPhone: "123" }).valid],
    ["валидный номер клиента проходит проверку", validateOrder(baseOrder).valid],
    ["доставка требует адрес", !validateOrder({ ...deliveryOrder, deliveryAddress: "" }).valid],
    ["предзаказ проходит валидацию", validateOrder(baseOrder).valid],
    ["самовывоз проходит валидацию", validateOrder({ ...baseOrder, type: "Самовывоз" }).valid],
    ["сообщение содержит ресторан", preOrderMessage.includes("Ресторан-кафе Стамбул")],
    ["сообщение содержит источник", preOrderMessage.includes("Заказ с электронного меню")],
    ["сообщение содержит ПРЕДЗАКАЗ", preOrderMessage.includes("ПРЕДЗАКАЗ")],
    ["сообщение содержит ДОСТАВКА", deliveryMessage.includes("ДОСТАВКА")],
    ["доставка содержит адрес", deliveryMessage.includes("ул. Ленина, 10")],
    ["сообщение содержит позиции", preOrderMessage.includes("Мерджимек чорбасы") && preOrderMessage.includes("Айран")],
    ["сообщение содержит двухстрочную формулу позиции", preOrderMessage.includes("320 ₽ × 3 =\n") && preOrderMessage.includes("960 ₽")],
    ["сообщение содержит сумму", preOrderMessage.includes(`Сумма: ${formatMoney(getCartTotal(testCart))}`)],
    ["сообщение содержит номер клиента", preOrderMessage.includes("Номер для связи: +79991234567")],
    ["номер клиента не используется как wa.me-ссылка", !preOrderMessage.includes("wa.me/79991234567")],
    ["номер клиента не используется как tel-ссылка", !preOrderMessage.includes("tel:+79991234567")],
    ["заказ отправляется менеджеру", buildWhatsAppUrl(CONFIG.whatsappPhone, "Заказ").startsWith(`https://wa.me/${DEFAULT_PHONE}?text=`)],
    ["пять увеличений дают количество пять", quantityTestCart.get("mercimek") === 5],
    ["изменение количества не вызывает renderMenu", !changeQuantity.toString().includes("renderMenu(")],
    ["сообщение содержит заголовок заказа", messageFormatExample.includes("*Заказ:*")],
    ["список заказа находится в monospace-блоке", messageFormatExample.includes(orderBlockMarker)],
    ["первая строка позиции содержит формулу", orderBlock.includes("1. Искендер-кебаб — 690 ₽ × 2 =")],
    ["итог позиции находится на следующей строке", orderBlockLines[1]?.trim().replace(/\u00a0/g, " ") === "1 380 ₽" && orderBlockLines[1].startsWith(" ")],
    ["между позициями нет пустых строк", !orderBlock.includes("\n\n")],
    ["сумма находится вне monospace-блока", messageFormatExample.indexOf("*Сумма:") > messageFormatExample.lastIndexOf("```")],
    ["номер клиента находится вне monospace-блока", messageFormatExample.indexOf("Номер для связи:") < messageFormatExample.indexOf("```")],
    ["WhatsApp URL кодирует текст", buildWhatsAppUrl(DEFAULT_PHONE, "Тест заказа") === `https://wa.me/${DEFAULT_PHONE}?text=${encodeURIComponent("Тест заказа")}`]
  ];
  const passed = tests.filter(([, result]) => result).length;
  console.group(`Самопроверка меню «Стамбул»: ${passed}/${tests.length}`);
  tests.forEach(([name, result]) => console[result ? "log" : "error"](`${result ? "✓" : "✗"} ${name}`));
  console.groupEnd();

  elements.testResults.hidden = false;
  elements.testResults.innerHTML = `<strong>Самопроверка: ${passed}/${tests.length}</strong>` +
    tests.map(([name, result]) => `<p>${result ? "✓" : "✗"} ${name}</p>`).join("");
}
