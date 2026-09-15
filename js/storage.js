const STORAGE_KEY = "finanzas-app-v1";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "cat_super", name: "Supermercado", type: "expense", color: "#e85c2a" },
  { id: "cat_comida", name: "Comidas afuera", type: "expense", color: "#f0a05a" },
  { id: "cat_trans", name: "Transporte", type: "expense", color: "#4aa3df" },
  { id: "cat_alquiler", name: "Alquiler y servicios", type: "expense", color: "#c45c8a" },
  { id: "cat_salud", name: "Salud", type: "expense", color: "#5ecf8a" },
  { id: "cat_sub", name: "Suscripciones", type: "expense", color: "#8b7cf6" },
  { id: "cat_ropa", name: "Ropa", type: "expense", color: "#e8c547" },
  { id: "cat_ocio", name: "Ocio", type: "expense", color: "#ff6b8a" },
  { id: "cat_ahorro", name: "Ahorro", type: "expense", color: "#3dba9c" },
  { id: "cat_otros", name: "Otros", type: "expense", color: "#8a8a8a" }
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: "cat_sueldo", name: "Sueldo", type: "income", color: "#5ecf8a" },
  { id: "cat_free", name: "Freelance", type: "income", color: "#4aa3df" },
  { id: "cat_ing_otros", name: "Otros ingresos", type: "income", color: "#e8c547" }
];

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2);
}

export function createInitialState() {
  return {
    version: 1,
    settings: {
      setupComplete: false,
      displayName: "",
      currency: "ARS",
      locale: "es-AR",
      features: {
        expenses: true,
        income: true,
        debts: true,
        budgets: true,
        upcoming: true,
        reports: true,
        prediction: true
      },
      salary: {
        enabled: false,
        amount: 0,
        dayOfMonth: 1,
        label: "Sueldo"
      }
    },
    categories: [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES],
    movements: [],
    budgets: {},
    debts: [],
    upcoming: [],
    ui: {
      installDismissed: false
    }
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return createInitialState();
  }
}

export function save(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function exportJson(db) {
  return JSON.stringify(db, null, 2);
}

export function importJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("Archivo inválido");
  const db = migrate(parsed);
  save(db);
  return db;
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

function migrate(data) {
  const base = createInitialState();
  const db = {
    ...base,
    ...data,
    settings: { ...base.settings, ...(data.settings || {}) },
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : base.categories,
    movements: Array.isArray(data.movements) ? data.movements : [],
    budgets: data.budgets && typeof data.budgets === "object" ? data.budgets : {},
    debts: Array.isArray(data.debts) ? data.debts : [],
    upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
    ui: { ...base.ui, ...(data.ui || {}) }
  };
  db.settings.features = { ...base.settings.features, ...(data.settings?.features || {}) };
  db.settings.salary = { ...base.settings.salary, ...(data.settings?.salary || {}) };
  db.version = 1;
  return db;
}
