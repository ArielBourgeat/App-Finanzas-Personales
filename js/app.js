import { load, save, uid, exportJson, importJson, clearAll, createInitialState, DEFAULT_EXPENSE_CATEGORIES } from "./storage.js";
import { drawDonut, drawBars, drawWeekBars } from "./charts.js";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const WEEKDAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

let db = load();
const ui = {
  view: "dashboard",
  type: "expense",
  categoryId: "",
  month: ymNow(),
  reportPeriod: "month",
  reportAnchor: todayISO(),
  setupStep: 0,
  setup: null
};

const $ = (id) => document.getElementById(id);

function ymNow() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function todayISO() {
  return toISO(new Date());
}

function toISO(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
}

function persist() {
  save(db);
}

function money(n) {
  const value = Number(n) || 0;
  try {
    return new Intl.NumberFormat(db.settings.locale || "es-AR", {
      style: "currency",
      currency: db.settings.currency || "ARS",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  } catch {
    return "$ " + Math.round(value).toLocaleString("es-AR");
  }
}

function parseAmount(str) {
  if (str == null) return NaN;
  let s = String(str).trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
}

function cats(type) {
  return db.categories.filter((c) => c.type === type);
}

function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start, end, from: toISO(start), to: toISO(end) };
}

function inRange(iso, from, to) {
  return iso >= from && iso <= to;
}

function movementsInMonth(ym, type) {
  const { from, to } = monthRange(ym);
  return db.movements.filter((m) => inRange(m.date, from, to) && (!type || m.type === type));
}

function sum(list, key = "amount") {
  return list.reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function feature(name) {
  return db.settings.features?.[name] !== false;
}

function categoryById(id) {
  return db.categories.find((c) => c.id === id);
}

function formatLongDate(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(db.settings.locale || "es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function periodBounds(period, anchorISO) {
  const d = parseISO(anchorISO);
  if (period === "day") return { from: toISO(d), to: toISO(d), title: formatLongDate(anchorISO) };
  if (period === "week") {
    const start = startOfWeek(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toISO(start), to: toISO(end), title: "Semana del " + start.toLocaleDateString("es-AR") };
  }
  if (period === "year") {
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear(), 11, 31);
    return { from: toISO(start), to: toISO(end), title: String(d.getFullYear()) };
  }
  const { from, to } = monthRange(anchorISO.slice(0, 7));
  const dt = parseISO(from);
  return { from, to, title: MONTHS[dt.getMonth()] + " " + dt.getFullYear() };
}

function shiftAnchor(period, iso, dir) {
  const d = parseISO(iso);
  if (period === "day") d.setDate(d.getDate() + dir);
  else if (period === "week") d.setDate(d.getDate() + dir * 7);
  else if (period === "year") d.setFullYear(d.getFullYear() + dir);
  else d.setMonth(d.getMonth() + dir);
  return toISO(d);
}

function salaryUpcoming() {
  if (!db.settings.salary?.enabled || !feature("upcoming") || !feature("income")) return [];
  const items = [];
  const today = todayISO();
  const base = parseISO(today);
  for (let i = 0; i < 2; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, Math.min(db.settings.salary.dayOfMonth || 1, 28));
    const iso = toISO(d);
    if (iso < today) continue;
    const { from, to } = monthRange(iso.slice(0, 7));
    const already = db.movements.some((m) => m.type === "income" && inRange(m.date, from, to) && (m.note === db.settings.salary.label || m.categoryId === "cat_sueldo"));
    const manual = db.upcoming.some((u) => u.type === "income" && u.date === iso);
    if (!already && !manual) {
      items.push({
        id: "salary-" + iso,
        type: "income",
        name: db.settings.salary.label || "Sueldo",
        amount: db.settings.salary.amount || 0,
        date: iso,
        virtual: true
      });
    }
  }
  return items;
}

function unpaidFromMovements() {
  const today = todayISO();
  return db.movements
    .filter((m) => m.type === "expense" && m.paymentDate && m.paymentDate >= today)
    .map((m) => ({
      id: "pay-" + m.id,
      type: "payment",
      name: (categoryById(m.categoryId)?.name || "Pago") + (m.note ? " · " + m.note : ""),
      amount: m.amount,
      date: m.paymentDate,
      virtual: true,
      sourceId: m.id
    }));
}

function expandRecurring() {
  const extras = [];
  db.upcoming.forEach((item) => {
    if (item.recurring !== "monthly") return;
    for (let i = 1; i <= 3; i += 1) {
      const d = parseISO(item.date);
      d.setMonth(d.getMonth() + i);
      extras.push({ ...item, id: item.id + "-r" + i, date: toISO(d), virtual: true });
    }
  });
  return extras;
}

function allUpcoming() {
  const virtual = [...salaryUpcoming(), ...unpaidFromMovements(), ...expandRecurring()];
  return [...db.upcoming, ...virtual].sort((a, b) => a.date.localeCompare(b.date));
}

function prediction() {
  const now = ui.month;
  const [y, m] = now.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const isCurrent = now === ymNow();
  const day = isCurrent ? today.getDate() : daysInMonth;
  const expenses = sum(movementsInMonth(now, "expense"));
  const income = sum(movementsInMonth(now, "income"));
  const avgDaily = day ? expenses / day : 0;
  const projectedExpenses = isCurrent ? avgDaily * daysInMonth : expenses;
  const upcomingIncome = allUpcoming()
    .filter((u) => u.type === "income" && u.date.slice(0, 7) === now && u.date >= todayISO())
    .reduce((acc, u) => acc + Number(u.amount || 0), 0);
  const projectedIncome = income + upcomingIncome;
  const prev = [];
  for (let i = 1; i <= 3; i += 1) prev.push(sum(movementsInMonth(shiftMonth(now, -i), "expense")));
  const avgPrev = prev.reduce((a, b) => a + b, 0) / (prev.filter((v) => v > 0).length || 1);
  return {
    projectedExpenses,
    projectedIncome,
    projectedRemain: projectedIncome - projectedExpenses,
    vsAvg: projectedExpenses - avgPrev,
    avgPrev
  };
}

function setView(view) {
  ui.view = view;
  render();
}

function render() {
  const setup = !db.settings.setupComplete;
  $("onboarding").classList.toggle("hidden", !setup);
  $("app").classList.toggle("hidden", setup);
  if (setup) {
    renderSetup();
    return;
  }
  $("hello").textContent = db.settings.displayName ? "Hola, " + db.settings.displayName : "Tus números";
  const [y, m] = ui.month.split("-").map(Number);
  $("month-label").textContent = MONTHS[m - 1] + " " + y;
  $("today-label").textContent = formatLongDate(todayISO());
  document.querySelectorAll("[data-action='view'][data-feature]").forEach((el) => {
    el.classList.toggle("hidden", !feature(el.dataset.feature));
  });
  document.querySelectorAll(".tab, .mobile-nav button").forEach((el) => {
    el.classList.toggle("on", el.dataset.view === ui.view);
  });
  ["dashboard", "reports", "debts", "upcoming", "settings"].forEach((name) => {
    $("view-" + name).classList.toggle("hidden", ui.view !== name);
  });
  fillForm();
  renderInstall();
  if (ui.view === "dashboard") renderDashboard();
  if (ui.view === "reports") renderReports();
  if (ui.view === "debts") renderDebts();
  if (ui.view === "upcoming") renderUpcoming();
  if (ui.view === "settings") renderSettings();
}

function renderInstall() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
  $("install-banner").classList.toggle("hidden", !(ios && !standalone && !db.ui.installDismissed));
}

function renderChips() {
  const list = cats(ui.type);
  if (!list.some((c) => c.id === ui.categoryId)) ui.categoryId = list[0]?.id || "";
  $("category-chips").innerHTML = list.map((c) => (
    `<button type="button" class="chip ${c.id === ui.categoryId ? "on" : ""}" data-action="cat" data-id="${c.id}">${esc(c.name)}</button>`
  )).join("");
}

function fillForm() {
  if (!feature("income")) ui.type = "expense";
  if (!feature("expenses")) ui.type = "income";
  const typeWrap = $("type-toggle");
  typeWrap.querySelectorAll(".seg").forEach((b) => {
    b.classList.toggle("on", b.dataset.type === ui.type);
    b.classList.toggle("hidden", (b.dataset.type === "income" && !feature("income")) || (b.dataset.type === "expense" && !feature("expenses")));
  });
  $("payment-date-wrap").classList.toggle("hidden", ui.type !== "expense" || !feature("upcoming"));
  const canMove = feature("expenses") || feature("income");
  $("form-card").classList.toggle("hidden", !canMove);
  $("fab").classList.toggle("hidden", !canMove);
  renderChips();
}

function moveItemHtml(m) {
  const cat = categoryById(m.categoryId);
  const extra = [];
  extra.push(parseISO(m.date).toLocaleDateString("es-AR"));
  if (m.paymentDate) extra.push("paga " + parseISO(m.paymentDate).toLocaleDateString("es-AR"));
  if (m.note) extra.push(m.note);
  return `<li>
    <span class="dot" style="background:${cat?.color || "#888"}"></span>
    <div>
      <div class="name">${esc(cat?.name || "Movimiento")}</div>
      <div class="sub">${esc(extra.join(" · "))}</div>
    </div>
    <strong class="amt ${m.type}">${m.type === "income" ? "+" : "-"}${money(m.amount)}</strong>
    <button class="icon-btn" data-action="edit" data-id="${m.id}" aria-label="Editar">✎</button>
  </li>`;
}

function renderDashboard() {
  fillForm();
  const income = sum(movementsInMonth(ui.month, "income"));
  const expense = sum(movementsInMonth(ui.month, "expense"));
  $("kpi-income").textContent = money(income);
  $("kpi-expense").textContent = money(expense);
  $("kpi-remain").textContent = money(income - expense);
  $("kpi-remain").style.color = income - expense < 0 ? "var(--danger)" : "";

  const byCat = {};
  movementsInMonth(ui.month, "expense").forEach((m) => {
    byCat[m.categoryId] = (byCat[m.categoryId] || 0) + m.amount;
  });
  const segments = Object.entries(byCat)
    .map(([id, value]) => ({ id, value, name: categoryById(id)?.name || "Otros", color: categoryById(id)?.color || "#888" }))
    .sort((a, b) => b.value - a.value);
  drawDonut($("donut"), segments, money(expense), "gastos");
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  $("legend").innerHTML = segments.map((s) => (
    `<li><span><b style="background:${s.color}"></b>${esc(s.name)}</span><span>${Math.round((s.value / total) * 100)}%</span></li>`
  )).join("") || `<li class="empty">Todavía no hay gastos este mes.</li>`;

  const bars = [];
  for (let i = 5; i >= 0; i -= 1) {
    const ym = shiftMonth(ui.month, -i);
    const dt = parseISO(ym + "-01");
    bars.push({
      label: MONTHS_SHORT[dt.getMonth()],
      value: sum(movementsInMonth(ym, "expense")),
      highlight: i === 0,
      topLabel: i === 0 ? money(sum(movementsInMonth(ym, "expense"))) : ""
    });
  }
  drawBars($("bars"), bars);

  $("predict-card").classList.toggle("hidden", !feature("prediction"));
  if (feature("prediction")) {
    const p = prediction();
    $("predict-value").textContent = money(p.projectedRemain);
    const trend = p.vsAvg > 0 ? "vas un poco arriba del promedio de los últimos meses" : "vas alineado o debajo de tu promedio";
    $("predict-copy").textContent = `Si seguís este ritmo, el mes cerraría con ${money(p.projectedExpenses)} de gastos. ${trend}.`;
  }

  $("budgets-card").classList.toggle("hidden", !feature("budgets") || !feature("expenses"));
  if (feature("budgets")) {
    $("budgets").innerHTML = cats("expense").map((c) => {
      const spent = byCat[c.id] || 0;
      const budget = Number(db.budgets[c.id] || 0);
      const over = budget > 0 && spent > budget;
      const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
      const meta = budget ? `${money(spent)} / ${money(budget)}` : `${money(spent)} · sin tope`;
      return `<div class="budget ${over ? "over" : ""}">
        <header>
          <span>${esc(c.name)}</span>
          <input data-budget="${c.id}" inputmode="decimal" value="${budget || ""}" placeholder="0" />
        </header>
        <div class="bar"><span style="width:${budget ? pct : 0}%"></span></div>
        <div class="meta">${meta}${over ? " · te pasaste" : ""}</div>
      </div>`;
    }).join("");
  }

  const filter = $("move-filter").value;
  let moves = movementsInMonth(ui.month).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (filter === "expense" || filter === "income") moves = moves.filter((m) => m.type === filter);
  if (filter === "unpaid") moves = moves.filter((m) => m.paymentDate && m.paymentDate >= todayISO());
  $("moves").innerHTML = moves.length ? moves.map(moveItemHtml).join("") : `<li class="empty">No hay movimientos en este mes.</li>`;
}

function renderReports() {
  document.querySelectorAll("#report-period .seg").forEach((b) => b.classList.toggle("on", b.dataset.period === ui.reportPeriod));
  const { from, to, title } = periodBounds(ui.reportPeriod, ui.reportAnchor);
  $("report-title").textContent = title;
  const list = db.movements.filter((m) => inRange(m.date, from, to));
  const income = sum(list.filter((m) => m.type === "income"));
  const expense = sum(list.filter((m) => m.type === "expense"));
  $("rep-income").textContent = money(income);
  $("rep-expense").textContent = money(expense);
  $("rep-balance").textContent = money(income - expense);

  if (ui.reportPeriod === "year") {
    const items = [];
    const year = parseISO(from).getFullYear();
    for (let i = 0; i < 12; i += 1) {
      const ym = year + "-" + String(i + 1).padStart(2, "0");
      items.push({ label: MONTHS_SHORT[i], value: sum(movementsInMonth(ym, "expense")), highlight: ym === ymNow() });
    }
    drawBars($("report-chart"), items);
  } else if (ui.reportPeriod === "week") {
    const start = parseISO(from);
    const items = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISO(d);
      items.push({
        label: WEEKDAYS[i],
        value: sum(list.filter((m) => m.type === "expense" && m.date === iso)),
        highlight: iso === todayISO()
      });
    }
    drawWeekBars($("report-chart"), items);
  } else {
    const byCat = {};
    list.filter((m) => m.type === "expense").forEach((m) => {
      byCat[m.categoryId] = (byCat[m.categoryId] || 0) + m.amount;
    });
    const segments = Object.entries(byCat).map(([id, value]) => ({
      value, name: categoryById(id)?.name || "Otros", color: categoryById(id)?.color || "#888"
    }));
    drawDonut($("report-chart"), segments, money(expense), ui.reportPeriod === "day" ? "hoy" : "gastos");
    $("report-legend").innerHTML = segments.map((s) => `<li><span><b style="background:${s.color}"></b>${esc(s.name)}</span><span>${money(s.value)}</span></li>`).join("");
  }
  if (ui.reportPeriod === "year" || ui.reportPeriod === "week") $("report-legend").innerHTML = "";
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  $("report-moves").innerHTML = sorted.length ? sorted.map(moveItemHtml).join("") : `<li class="empty">Sin movimientos en este período.</li>`;
}

function renderDebts() {
  $("debt-list").innerHTML = db.debts.length ? db.debts.map((d) => {
    const pct = d.total ? Math.min(100, ((d.total - d.remaining) / d.total) * 100) : 0;
    const due = d.dueDate ? parseISO(d.dueDate).toLocaleDateString("es-AR") : "sin fecha";
    const late = d.dueDate && d.dueDate < todayISO() && d.remaining > 0;
    return `<li class="debt-item ${late ? "over" : ""}">
      <header>
        <div>
          <strong>${esc(d.name)}</strong>
          <div class="sub">Vence ${due}${d.note ? " · " + esc(d.note) : ""}</div>
        </div>
        <strong>${money(d.remaining)}</strong>
      </header>
      <div class="bar"><span style="width:${pct}%;background:var(--accent)"></span></div>
      <div class="meta">Total ${money(d.total)} · pagado ${money(d.total - d.remaining)}</div>
      <div class="pay-row">
        <input data-pay-amount="${d.id}" inputmode="decimal" placeholder="Pago" />
        <button class="btn compact primary" data-action="pay-debt" data-id="${d.id}">Registrar pago</button>
        <button class="icon-btn" data-action="del-debt" data-id="${d.id}">✕</button>
      </div>
    </li>`;
  }).join("") : `<li class="empty">No cargaste deudas. Podés anotar tarjetas, préstamos o cuotas.</li>`;
}

function renderUpcoming() {
  const items = allUpcoming().filter((u) => u.date >= todayISO());
  $("upcoming-list").innerHTML = items.length ? items.map((u) => {
    const label = u.type === "income" ? "Ingreso próximo" : u.type === "payment" ? "Fecha de pago" : "Gasto esperado";
    return `<li class="up-item">
      <header>
        <div>
          <strong>${esc(u.name)}</strong>
          <div class="sub">${label} · ${parseISO(u.date).toLocaleDateString("es-AR")}${u.recurring ? " · cada mes" : ""}</div>
        </div>
        <strong class="${u.type === "income" ? "income" : ""}">${u.type === "income" ? "+" : "-"}${money(u.amount)}</strong>
      </header>
      <div class="pay-row">
        <button class="btn compact" data-action="confirm-upcoming" data-id="${u.id}">Ya ocurrió</button>
        ${u.virtual ? "" : `<button class="icon-btn" data-action="del-upcoming" data-id="${u.id}">✕</button>`}
      </div>
    </li>`;
  }).join("") : `<li class="empty">No hay ingresos ni pagos próximos.</li>`;
}

function renderSettings() {
  $("set-name").value = db.settings.displayName || "";
  $("set-currency").value = db.settings.currency || "ARS";
  document.querySelectorAll("[data-feature]").forEach((el) => {
    if (el.type === "checkbox") el.checked = feature(el.dataset.feature);
  });
  $("salary-enabled").checked = !!db.settings.salary.enabled;
  $("salary-label").value = db.settings.salary.label || "Sueldo";
  $("salary-amount").value = db.settings.salary.amount || "";
  $("salary-day").value = db.settings.salary.dayOfMonth || 1;
}

function setupState() {
  if (!ui.setup) {
    ui.setup = {
      displayName: db.settings.displayName || "",
      currency: db.settings.currency || "ARS",
      features: { ...db.settings.features },
      categories: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, selected: true })),
      extraCat: "",
      salary: { ...db.settings.salary }
    };
  }
  return ui.setup;
}

function renderSetup() {
  const s = setupState();
  const kicker = $("setup-kicker");
  const box = $("setup-step");
  $("setup-back").classList.toggle("hidden", ui.setupStep === 0);
  $("setup-next").textContent = ui.setupStep === 3 ? "Empezar" : "Seguir";
  if (ui.setupStep === 0) {
    kicker.textContent = "Paso 1 de 4";
    box.innerHTML = `
      <h1>Tus finanzas, en este dispositivo</h1>
      <p class="muted">La info se guarda acá, aunque la app esté en GitHub Pages. Si cerrás Safari y volvés, sigue todo.</p>
      <label class="field"><span>¿Cómo te llamamos?</span><input id="setup-name" value="${esc(s.displayName)}" placeholder="Tu nombre" /></label>
      <label class="field"><span>Moneda</span>
        <select id="setup-currency">
          ${["ARS","USD","EUR","UYU","CLP","MXN","COP","BRL"].map((c) => `<option ${s.currency===c?"selected":""}>${c}</option>`).join("")}
        </select>
      </label>`;
  } else if (ui.setupStep === 1) {
    kicker.textContent = "Paso 2 de 4";
    const opts = [
      ["expenses", "Gastos y categorías"],
      ["income", "Ingresos"],
      ["budgets", "Presupuestos por categoría"],
      ["debts", "Deudas"],
      ["upcoming", "Fechas de pago e ingresos próximos"],
      ["reports", "Reportes diario, semanal, mensual y anual"],
      ["prediction", "Predicción simple del mes"]
    ];
    box.innerHTML = `<h1>¿Qué querés manejar?</h1><p class="muted">Elegí ahora. Después lo podés cambiar en Ajustes.</p>
      <div class="setup-options">${opts.map(([k,l]) => `<label><input type="checkbox" data-setup-feature="${k}" ${s.features[k] !== false ? "checked" : ""}/> ${l}</label>`).join("")}</div>`;
  } else if (ui.setupStep === 2) {
    kicker.textContent = "Paso 3 de 4";
    box.innerHTML = `<h1>Categorías de gastos</h1><p class="muted">Desmarcá las que no uses o sumá una nueva.</p>
      <div class="cat-pick">${s.categories.map((c,i) => `<label><input type="checkbox" data-setup-cat="${i}" ${c.selected?"checked":""}/> ${esc(c.name)}</label>`).join("")}</div>
      <label class="field"><span>Otra categoría</span><input id="setup-extra-cat" value="${esc(s.extraCat)}" placeholder="Ej. Mascotas" /></label>`;
  } else {
    kicker.textContent = "Paso 4 de 4";
    box.innerHTML = `<h1>Ingreso que está por llegar</h1>
      <p class="muted">Si cobrás sueldo un día fijo, lo vamos a mostrar como ingreso próximo hasta que lo registres.</p>
      <label class="check"><input type="checkbox" id="setup-salary-on" ${s.salary.enabled?"checked":""}/> Tengo un ingreso mensual</label>
      <label class="field"><span>Nombre</span><input id="setup-salary-label" value="${esc(s.salary.label || "Sueldo")}" /></label>
      <label class="field"><span>Monto</span><input id="setup-salary-amount" inputmode="decimal" value="${s.salary.amount || ""}" /></label>
      <label class="field"><span>Día del mes</span><input id="setup-salary-day" type="number" min="1" max="28" value="${s.salary.dayOfMonth || 1}" /></label>`;
  }
}

function collectSetup() {
  const s = setupState();
  if (ui.setupStep === 0) {
    s.displayName = $("setup-name")?.value.trim() || "";
    s.currency = $("setup-currency")?.value || "ARS";
  }
  if (ui.setupStep === 1) {
    document.querySelectorAll("[data-setup-feature]").forEach((el) => { s.features[el.dataset.setupFeature] = el.checked; });
  }
  if (ui.setupStep === 2) {
    document.querySelectorAll("[data-setup-cat]").forEach((el) => { s.categories[Number(el.dataset.setupCat)].selected = el.checked; });
    s.extraCat = $("setup-extra-cat")?.value.trim() || "";
  }
  if (ui.setupStep === 3) {
    s.salary.enabled = $("setup-salary-on")?.checked || false;
    s.salary.label = $("setup-salary-label")?.value.trim() || "Sueldo";
    s.salary.amount = parseAmount($("setup-salary-amount")?.value) || 0;
    s.salary.dayOfMonth = Number($("setup-salary-day")?.value) || 1;
  }
}

function finishSetup() {
  collectSetup();
  const s = setupState();
  db.settings.setupComplete = true;
  db.settings.displayName = s.displayName;
  db.settings.currency = s.currency;
  db.settings.features = s.features;
  db.settings.salary = s.salary;
  const picked = s.categories.filter((c) => c.selected).map(({ selected, ...c }) => c);
  if (s.extraCat) {
    picked.push({ id: uid(), name: s.extraCat, type: "expense", color: "#a78bfa" });
  }
  if (!picked.length) picked.push({ id: "cat_otros", name: "Otros", type: "expense", color: "#8a8a8a" });
  db.categories = [...picked, ...db.categories.filter((c) => c.type === "income")];
  persist();
  document.documentElement.dataset.mode = "app";
  toast("Listo. Ya podés cargar movimientos.");
  render();
}

function addMovementFrom(root) {
  const amount = parseAmount(root.querySelector("#amount").value);
  if (!amount || amount <= 0) { toast("Ingresá un monto"); return; }
  if (!ui.categoryId) { toast("Elegí una categoría"); return; }
  const date = root.querySelector("#move-date").value || todayISO();
  const paymentDate = root.querySelector("#payment-date")?.value || "";
  const note = root.querySelector("#note").value.trim();
  db.movements.push({
    id: uid(),
    type: ui.type,
    amount,
    categoryId: ui.categoryId,
    date,
    paymentDate: ui.type === "expense" ? paymentDate : "",
    note,
    createdAt: new Date().toISOString()
  });
  persist();
  root.querySelector("#amount").value = "";
  root.querySelector("#note").value = "";
  toast("Movimiento guardado");
  closeSheet();
  render();
}

function openSheet() {
  $("sheet-panel").appendChild($("form-card"));
  if (!$("move-date").value) $("move-date").value = todayISO();
  fillForm();
  $("sheet").classList.remove("hidden");
}

function closeSheet() {
  const dash = $("view-dashboard");
  dash.insertBefore($("form-card"), dash.firstChild);
  $("sheet").classList.add("hidden");
}

function openEdit(id) {
  const m = db.movements.find((x) => x.id === id);
  if (!m) return;
  const form = $("edit-form");
  form.moveId.value = m.id;
  form.amount.value = m.amount;
  form.date.value = m.date;
  form.paymentDate.value = m.paymentDate || "";
  form.note.value = m.note || "";
  $("edit-dialog").showModal();
}

function bind() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "setup-next") {
      collectSetup();
      if (ui.setupStep < 3) { ui.setupStep += 1; renderSetup(); }
      else finishSetup();
    }
    if (action === "setup-back") { collectSetup(); ui.setupStep = Math.max(0, ui.setupStep - 1); renderSetup(); }
    if (action === "view") setView(btn.dataset.view);
    if (action === "set-type") { ui.type = btn.dataset.type; fillForm(); }
    if (action === "cat") { ui.categoryId = btn.dataset.id; fillForm(); }
    if (action === "add-movement") addMovementFrom(btn.closest(".form-card") || document);
    if (action === "prev-month") { ui.month = shiftMonth(ui.month, -1); render(); }
    if (action === "next-month") { ui.month = shiftMonth(ui.month, 1); render(); }
    if (action === "report-period") { ui.reportPeriod = btn.dataset.period; render(); }
    if (action === "report-prev") { ui.reportAnchor = shiftAnchor(ui.reportPeriod, ui.reportAnchor, -1); render(); }
    if (action === "report-next") { ui.reportAnchor = shiftAnchor(ui.reportPeriod, ui.reportAnchor, 1); render(); }
    if (action === "edit") openEdit(btn.dataset.id);
    if (action === "open-sheet") openSheet();
    if (action === "close-sheet") closeSheet();
    if (action === "dismiss-install") { db.ui.installDismissed = true; persist(); render(); }
    if (action === "pay-debt") {
      const amount = parseAmount(document.querySelector(`[data-pay-amount="${btn.dataset.id}"]`)?.value);
      const debt = db.debts.find((d) => d.id === btn.dataset.id);
      if (!debt || !amount || amount <= 0) { toast("Ingresá el pago"); return; }
      debt.remaining = Math.max(0, debt.remaining - amount);
      db.movements.push({
        id: uid(), type: "expense", amount, categoryId: cats("expense")[0]?.id || "",
        date: todayISO(), paymentDate: todayISO(), note: "Pago deuda: " + debt.name, createdAt: new Date().toISOString()
      });
      persist(); toast("Pago registrado"); render();
    }
    if (action === "del-debt") {
      db.debts = db.debts.filter((d) => d.id !== btn.dataset.id);
      persist(); render();
    }
    if (action === "del-upcoming") {
      db.upcoming = db.upcoming.filter((u) => u.id !== btn.dataset.id);
      persist(); render();
    }
    if (action === "confirm-upcoming") {
      const u = allUpcoming().find((x) => x.id === btn.dataset.id);
      if (!u) return;
      const type = u.type === "income" ? "income" : "expense";
      const cat = (type === "income" ? cats("income").find((c) => c.id === "cat_sueldo") : null) || cats(type)[0];
      db.movements.push({
        id: uid(), type, amount: u.amount, categoryId: cat?.id || "", date: u.date,
        paymentDate: type === "expense" ? u.date : "", note: u.name, createdAt: new Date().toISOString()
      });
      if (!u.virtual) db.upcoming = db.upcoming.filter((x) => x.id !== u.id);
      persist(); toast("Pasó a movimientos"); render();
    }
    if (action === "export") {
      const blob = new Blob([exportJson(db)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "finanzas-backup.json";
      a.click();
    }
    if (action === "reset") {
      if (confirm("Se borra todo lo guardado en este dispositivo. ¿Seguro?")) {
        clearAll();
        db = createInitialState();
        ui.setup = null;
        ui.setupStep = 0;
        document.documentElement.dataset.mode = "setup";
        render();
      }
    }
  });

  $("move-filter").addEventListener("change", () => renderDashboard());
  $("budgets").addEventListener("change", (e) => {
    const id = e.target.dataset.budget;
    if (!id) return;
    const n = parseAmount(e.target.value);
    db.budgets[id] = Number.isFinite(n) ? n : 0;
    persist();
    renderDashboard();
  });
  $("debt-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const total = parseAmount(fd.get("total"));
    const remaining = parseAmount(fd.get("remaining"));
    if (!total) { toast("Monto inválido"); return; }
    db.debts.push({
      id: uid(),
      name: String(fd.get("name")).trim(),
      total,
      remaining: Number.isFinite(remaining) ? remaining : total,
      dueDate: fd.get("dueDate"),
      note: String(fd.get("note") || "").trim(),
      createdAt: new Date().toISOString()
    });
    e.target.reset();
    persist();
    render();
  });
  $("upcoming-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = parseAmount(fd.get("amount"));
    if (!amount) { toast("Monto inválido"); return; }
    db.upcoming.push({
      id: uid(),
      type: fd.get("type"),
      name: String(fd.get("name")).trim(),
      amount,
      date: fd.get("date"),
      recurring: e.target.recurring.checked ? "monthly" : null
    });
    e.target.reset();
    persist();
    render();
  });
  $("set-name").addEventListener("change", () => { db.settings.displayName = $("set-name").value.trim(); persist(); render(); });
  $("set-currency").addEventListener("change", () => { db.settings.currency = $("set-currency").value; persist(); render(); });
  document.querySelectorAll(".features [data-feature]").forEach((el) => {
    el.addEventListener("change", () => {
      db.settings.features[el.dataset.feature] = el.checked;
      persist();
      render();
    });
  });
  ["salary-enabled","salary-label","salary-amount","salary-day"].forEach((id) => {
    $(id).addEventListener("change", () => {
      db.settings.salary.enabled = $("salary-enabled").checked;
      db.settings.salary.label = $("salary-label").value.trim() || "Sueldo";
      db.settings.salary.amount = parseAmount($("salary-amount").value) || 0;
      db.settings.salary.dayOfMonth = Number($("salary-day").value) || 1;
      persist();
    });
  });
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      db = importJson(await file.text());
      document.documentElement.dataset.mode = db.settings.setupComplete ? "app" : "setup";
      toast("Backup restaurado");
      render();
    } catch {
      toast("No se pudo importar");
    }
  });
  $("edit-form").addEventListener("submit", (e) => {
    const value = e.submitter?.value;
    const id = $("edit-form").moveId.value;
    if (value === "delete") {
      db.movements = db.movements.filter((m) => m.id !== id);
      persist();
      toast("Borrado");
    }
    if (value === "save") {
      const m = db.movements.find((x) => x.id === id);
      if (m) {
        const amount = parseAmount($("edit-form").amount.value);
        if (!amount) { e.preventDefault(); toast("Monto inválido"); return; }
        m.amount = amount;
        m.date = $("edit-form").date.value;
        m.paymentDate = $("edit-form").paymentDate.value;
        m.note = $("edit-form").note.value.trim();
        persist();
      }
    }
  });
  $("edit-dialog").addEventListener("close", () => render());
  window.addEventListener("resize", () => {
    if (!$("app").classList.contains("hidden") && ui.view === "dashboard") renderDashboard();
    if (ui.view === "reports") renderReports();
  });
}

function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function boot() {
  $("move-date").value = todayISO();
  const today = new Date();
  $("upcoming-form").date.value = todayISO();
  const debtDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  $("debt-form").dueDate.value = toISO(debtDate);
  bind();
  registerPwa();
  render();
}

boot();
