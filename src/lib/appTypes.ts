import type { ModuleKind } from "./modules";

/**
 * Verified application templates. Each entry is a production recipe: the exact
 * module set that makes a complete, usable app for that business type.
 * The AI selects/extends one of these instead of inventing structure.
 */
export type AppType = {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  modules: ModuleKind[];
};

const D: ModuleKind = "dashboard";
const S: ModuleKind = "settings";
const R: ModuleKind = "reports";

const t = (
  id: string,
  label: string,
  category: string,
  keywords: string[],
  modules: ModuleKind[],
): AppType => ({ id, label, category, keywords, modules: [D, ...modules, R, S] });

export const APP_TYPES: AppType[] = [
  // Commerce & retail
  t("ecommerce", "E-commerce store", "Commerce", ["ecommerce", "e-commerce", "online store", "shop", "storefront", "clothing", "apparel", "boutique"], ["products", "orders", "customers", "inventory", "payments", "reviews"]),
  t("retail_pos", "Retail / POS", "Commerce", ["retail", "pos", "point of sale", "shop counter", "grocery", "supermarket", "kirana"], ["products", "sales", "inventory", "customers", "suppliers", "expenses"]),
  t("wholesale", "Wholesale & distribution", "Commerce", ["wholesale", "distribution", "distributor", "b2b supply"], ["products", "orders", "customers", "suppliers", "purchases", "warehouse", "invoices"]),
  t("inventory", "Inventory management", "Commerce", ["inventory", "stock", "stock management", "warehouse management"], ["products", "inventory", "suppliers", "purchases", "warehouse", "orders"]),
  t("marketplace", "Marketplace", "Commerce", ["marketplace", "multi vendor", "vendors platform"], ["products", "orders", "customers", "companies", "payments", "reviews"]),

  // Finance & billing
  t("bill_manager", "Bill / invoice manager", "Finance", ["bill manager", "billing", "invoice", "invoicing", "gst", "receipts"], ["customers", "products", "invoices", "payments", "expenses"]),
  t("accounting", "Accounting & bookkeeping", "Finance", ["accounting", "bookkeeping", "ledger", "chartered accountant", "tally"], ["transactions", "invoices", "expenses", "budgets", "customers"]),
  t("expense_tracker", "Expense tracker", "Finance", ["expense tracker", "spending", "personal finance", "budget app"], ["expenses", "transactions", "budgets"]),
  t("subscription_billing", "Subscription billing", "Finance", ["subscription", "recurring billing", "saas billing", "membership billing"], ["customers", "plans", "subscriptions", "payments", "invoices"]),
  t("lending", "Loans & lending", "Finance", ["loan", "lending", "microfinance", "emi", "credit"], ["customers", "contracts", "payments", "transactions", "documents"]),

  // Sales & marketing
  t("crm", "CRM / sales pipeline", "Sales", ["crm", "sales pipeline", "lead management", "deals", "sales team"], ["leads", "customers", "companies", "deals", "tasks", "notes", "quotes"]),
  t("agency", "Agency / studio", "Sales", ["agency", "studio", "marketing agency", "design agency"], ["leads", "customers", "portfolio", "tasks", "timesheets", "invoices", "expenses"]),
  t("freelancer", "Freelancer business", "Sales", ["freelancer", "freelance", "consultant", "solo"], ["customers", "portfolio", "tasks", "timesheets", "invoices", "expenses"]),
  t("marketing", "Marketing campaigns", "Sales", ["marketing", "campaign", "ads", "email marketing", "growth"], ["campaigns", "leads", "customers", "notifications", "analytics"]),
  t("call_center", "Call center / support desk", "Sales", ["call center", "support desk", "helpdesk", "customer support", "service desk"], ["tickets", "customers", "knowledge_base", "staff", "reviews"]),

  // Hospitality & food
  t("restaurant", "Restaurant", "Hospitality", ["restaurant", "cafe", "diner", "food", "bistro", "dhaba"], ["menu", "orders", "tables", "kitchen", "reservations", "staff", "expenses"]),
  t("cloud_kitchen", "Cloud kitchen / delivery", "Hospitality", ["cloud kitchen", "food delivery", "takeaway", "tiffin"], ["menu", "orders", "customers", "kitchen", "shipments", "expenses"]),
  t("bakery", "Bakery / catering", "Hospitality", ["bakery", "catering", "cake", "sweets"], ["products", "orders", "customers", "inventory", "invoices", "expenses"]),
  t("hotel", "Hotel / guesthouse", "Hospitality", ["hotel", "guesthouse", "hostel", "resort", "bnb", "rooms"], ["rooms", "bookings", "customers", "invoices", "staff", "maintenance"]),
  t("bar", "Bar / brewery", "Hospitality", ["bar", "pub", "brewery", "cocktail"], ["menu", "orders", "inventory", "tables", "staff", "expenses"]),

  // Services & appointments
  t("appointments", "Appointment booking", "Services", ["appointment", "booking", "scheduling", "calendar booking"], ["bookings", "customers", "staff", "availability", "payments", "notifications"]),
  t("salon", "Salon / spa", "Services", ["salon", "spa", "barber", "beauty", "parlour"], ["bookings", "customers", "staff", "availability", "products", "payments"]),
  t("fitness", "Gym / fitness studio", "Services", ["gym", "fitness", "yoga", "crossfit", "trainer"], ["members", "plans", "bookings", "staff", "payments", "attendance"]),
  t("repair_shop", "Repair / workshop", "Services", ["repair", "workshop", "garage", "service center", "mechanic"], ["tickets", "customers", "products", "invoices", "staff", "inventory"]),
  t("cleaning", "Cleaning / home services", "Services", ["cleaning", "home service", "plumber", "electrician", "handyman", "pest control"], ["bookings", "customers", "staff", "availability", "invoices", "reviews"]),
  t("photography", "Photography / creative", "Services", ["photography", "photographer", "videographer", "creative"], ["bookings", "customers", "portfolio", "quotes", "invoices", "documents"]),

  // Healthcare
  t("clinic", "Clinic / doctor practice", "Healthcare", ["clinic", "doctor", "practice", "physician", "opd"], ["patients", "doctors", "bookings", "prescriptions", "invoices", "payments"]),
  t("hospital", "Hospital", "Healthcare", ["hospital", "nursing home", "multi speciality"], ["patients", "doctors", "bookings", "rooms", "prescriptions", "lab_tests", "invoices", "staff"]),
  t("dental", "Dental clinic", "Healthcare", ["dental", "dentist", "orthodontist"], ["patients", "doctors", "bookings", "prescriptions", "invoices", "payments"]),
  t("diagnostics", "Diagnostics / lab", "Healthcare", ["diagnostic", "pathology", "lab", "radiology", "scan center"], ["patients", "lab_tests", "doctors", "invoices", "payments", "documents"]),
  t("pharmacy", "Pharmacy", "Healthcare", ["pharmacy", "chemist", "medical store", "drugstore"], ["medicines", "sales", "customers", "suppliers", "purchases", "expenses"]),
  t("veterinary", "Veterinary clinic", "Healthcare", ["vet", "veterinary", "animal clinic", "pet clinic"], ["patients", "doctors", "bookings", "prescriptions", "invoices", "medicines"]),
  t("therapy", "Therapy / counselling", "Healthcare", ["therapy", "counselling", "psychologist", "mental health"], ["patients", "bookings", "notes", "invoices", "payments", "documents"]),

  // Education
  t("school", "School", "Education", ["school", "k-12", "primary school", "high school"], ["students", "teachers", "classes", "attendance", "grades", "fees", "documents"]),
  t("coaching", "Coaching / tuition centre", "Education", ["coaching", "tuition", "institute", "test prep", "classes"], ["students", "courses", "classes", "attendance", "fees", "teachers"]),
  t("online_course", "Online course platform", "Education", ["online course", "lms", "e-learning", "elearning", "course platform"], ["courses", "students", "plans", "subscriptions", "payments", "reviews"]),
  t("university", "College / university", "Education", ["college", "university", "campus", "degree"], ["students", "teachers", "courses", "classes", "grades", "fees", "attendance"]),
  t("daycare", "Daycare / preschool", "Education", ["daycare", "preschool", "creche", "kindergarten"], ["students", "attendance", "staff", "fees", "notifications"]),

  // Property, logistics & fleet
  t("real_estate", "Real estate agency", "Property", ["real estate", "realtor", "property dealer", "broker", "listings"], ["properties", "leads", "customers", "bookings", "contracts", "documents"]),
  t("property_mgmt", "Property management", "Property", ["property management", "landlord", "rental management", "society"], ["properties", "tenants", "leases", "maintenance", "payments", "expenses"]),
  t("coworking", "Coworking space", "Property", ["coworking", "shared office", "workspace rental"], ["members", "plans", "rooms", "bookings", "invoices", "maintenance"]),
  t("logistics", "Logistics / courier", "Logistics", ["logistics", "courier", "delivery", "shipping", "transport"], ["shipments", "routes", "vehicles", "customers", "invoices", "staff"]),
  t("fleet", "Fleet / vehicle rental", "Logistics", ["fleet", "car rental", "vehicle rental", "taxi", "cab"], ["vehicles", "bookings", "customers", "maintenance", "invoices", "staff"]),
  t("moving", "Movers & packers", "Logistics", ["movers", "packers", "relocation", "moving company"], ["quotes", "bookings", "customers", "vehicles", "staff", "invoices"]),

  // Internal / HR / ops
  t("hr", "HR management", "Operations", ["hr", "human resources", "employee management", "people ops"], ["employees", "attendance", "payroll", "timesheets", "documents", "assets"]),
  t("project_mgmt", "Project management", "Operations", ["project management", "tasks", "team work", "kanban", "sprint"], ["tasks", "customers", "timesheets", "documents", "notes", "calendar"]),
  t("asset_mgmt", "Asset management", "Operations", ["asset", "equipment tracking", "it asset"], ["assets", "employees", "maintenance", "suppliers", "documents"]),
  t("manufacturing", "Manufacturing / production", "Operations", ["manufacturing", "factory", "production", "workshop unit"], ["products", "inventory", "purchases", "suppliers", "orders", "employees", "warehouse"]),
  t("construction", "Construction / contracting", "Operations", ["construction", "contractor", "builder", "civil"], ["quotes", "contracts", "customers", "tasks", "expenses", "employees", "invoices"]),

  // Community & content
  t("nonprofit", "Nonprofit / NGO", "Community", ["nonprofit", "ngo", "charity", "fundraising", "donation"], ["donations", "campaigns", "customers", "events", "documents", "expenses"]),
  t("events", "Event management", "Community", ["event", "conference", "wedding planner", "ticketing"], ["events", "attendees", "customers", "payments", "staff", "expenses"]),
  t("membership_club", "Club / association", "Community", ["club", "association", "society", "community members"], ["members", "plans", "events", "payments", "notifications"]),
  t("content_site", "Blog / content site", "Community", ["blog", "magazine", "news site", "content site", "publisher"], ["blog", "website", "documents", "campaigns", "reviews"]),
  t("saas", "SaaS product", "Community", ["saas", "software product", "app business", "startup product"], ["customers", "plans", "subscriptions", "payments", "tickets", "knowledge_base"]),
];

export const APP_TYPE_LABELS = APP_TYPES.map((a) => a.label);

/** Deterministic keyword detection of the best matching verified template. */
export function detectAppType(prompt: string): AppType | null {
  const p = ` ${prompt.toLowerCase()} `;
  let best: { type: AppType; score: number } | null = null;
  for (const type of APP_TYPES) {
    let score = 0;
    for (const kw of type.keywords) {
      if (p.includes(` ${kw} `) || p.includes(kw)) score += kw.includes(" ") ? 3 : 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { type, score };
  }
  return best?.type ?? null;
}

export function appTypesByCategory(): { category: string; types: AppType[] }[] {
  const map = new Map<string, AppType[]>();
  for (const t2 of APP_TYPES) {
    const list = map.get(t2.category) ?? [];
    list.push(t2);
    map.set(t2.category, list);
  }
  return [...map.entries()].map(([category, types]) => ({ category, types }));
}
