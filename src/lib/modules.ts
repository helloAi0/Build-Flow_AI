import {
  Globe, Users, Boxes, ShoppingCart, UtensilsCrossed, CalendarClock,
  CalendarCheck, Briefcase, UserPlus, IdCard, BarChart3, FileText,
  Receipt, CreditCard, Wallet, Truck, PackageOpen, Warehouse as WarehouseIcon,
  Building2, Target, CheckSquare, StickyNote, Calendar as CalendarIcon,
  Clock, Bell, Utensils, ChefHat, LineChart, Settings as SettingsIcon,
  Tag,
  HeartPulse, Stethoscope, ClipboardCheck, Pill, FlaskConical,
  GraduationCap, School, BookOpen, Layers, Percent, UserCheck, BadgeDollarSign,
  Home, Users as Users2, FileSignature, Wrench, Car, Ship, Map as MapIcon,
  LifeBuoy, BookMarked, Repeat, ArrowLeftRight, PiggyBank, Timer,
  FolderOpen, Newspaper, PartyPopper, DoorOpen, HandHeart, Megaphone, Star,
  type LucideIcon,
} from "lucide-react";


export type FieldType = "text" | "textarea" | "number" | "date" | "datetime" | "select" | "tags" | "boolean" | "url";

export type ModuleField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

export type ModuleKind =
  | "dashboard" | "website" | "crm" | "customers" | "companies" | "deals"
  | "tasks" | "notes" | "calendar" | "leads"
  | "products" | "inventory" | "suppliers" | "purchases" | "sales"
  | "warehouse" | "orders"
  | "invoices" | "payments" | "expenses"
  | "menu" | "tables" | "kitchen" | "reservations"
  | "bookings" | "staff" | "availability" | "notifications"
  | "employees" | "portfolio"
  // healthcare
  | "patients" | "doctors" | "prescriptions" | "medicines" | "lab_tests"
  // education
  | "students" | "teachers" | "courses" | "classes" | "grades" | "attendance" | "fees"
  // property & assets
  | "properties" | "tenants" | "leases" | "maintenance" | "assets" | "vehicles"
  // logistics & support
  | "shipments" | "routes" | "tickets" | "knowledge_base"
  // membership & finance
  | "members" | "plans" | "subscriptions" | "transactions" | "budgets" | "payroll" | "timesheets"
  // content & events
  | "documents" | "blog" | "events" | "attendees" | "rooms" | "donations" | "campaigns"
  | "quotes" | "contracts" | "reviews"
  | "reports" | "analytics" | "settings";


export type ModuleDef = {
  kind: ModuleKind;
  label: string;
  description: string;
  icon: LucideIcon;
  fields: ModuleField[];
  listColumns: string[];
  defaultConfig: Record<string, unknown>;
  virtual?: boolean; // virtual = no CRUD, custom panel
};



export const MODULE_CATALOG: Record<ModuleKind, ModuleDef> = {
  dashboard: { kind: "dashboard", label: "Dashboard", description: "Live KPIs derived from your data.", icon: BarChart3, fields: [], listColumns: [], defaultConfig: {}, virtual: true },

  website: {
    kind: "website", label: "Website", description: "Public marketing pages.", icon: Globe,
    fields: [
      { key: "title", label: "Page title", type: "text", required: true },
      { key: "slug", label: "URL path", type: "text", placeholder: "/about" },
      { key: "content", label: "Content", type: "textarea" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    listColumns: ["title", "slug", "published"], defaultConfig: { brandName: "", tagline: "" },
  },

  crm: {
    kind: "crm", label: "CRM", description: "Customer relationships and pipeline stages.", icon: Users,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "stage", label: "Stage", type: "select", options: ["new", "contacted", "qualified", "won", "lost"] },
      { key: "tags", label: "Tags", type: "tags" }, { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["name", "email", "stage", "tags"], defaultConfig: {},
  },

  customers: {
    kind: "customers", label: "Customers", description: "Customer database with contact info.", icon: Users,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "address", label: "Address", type: "text" }, { key: "tags", label: "Tags", type: "tags" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["name", "email", "phone", "address"], defaultConfig: {},
  },

  companies: {
    kind: "companies", label: "Companies", description: "Organizations you work with.", icon: Building2,
    fields: [
      { key: "name", label: "Company name", type: "text", required: true },
      { key: "website", label: "Website", type: "url" }, { key: "industry", label: "Industry", type: "text" },
      { key: "size", label: "Size", type: "select", options: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["name", "industry", "size", "website"], defaultConfig: {},
  },

  deals: {
    kind: "deals", label: "Deals", description: "Sales pipeline with value and stage.", icon: Target,
    fields: [
      { key: "title", label: "Deal", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "value", label: "Value", type: "number" },
      { key: "stage", label: "Stage", type: "select", options: ["prospect", "proposal", "negotiation", "won", "lost"] },
      { key: "close_date", label: "Expected close", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["title", "customer", "value", "stage", "close_date"], defaultConfig: {},
  },

  tasks: {
    kind: "tasks", label: "Tasks", description: "To-do items with priority and due dates.", icon: CheckSquare,
    fields: [
      { key: "title", label: "Task", type: "text", required: true },
      { key: "assignee", label: "Assignee", type: "text" },
      { key: "due", label: "Due date", type: "date" },
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"] },
      { key: "status", label: "Status", type: "select", options: ["todo", "in_progress", "done"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["title", "assignee", "due", "priority", "status"], defaultConfig: {},
  },

  notes: {
    kind: "notes", label: "Notes", description: "Rich text notes and meeting minutes.", icon: StickyNote,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "body", label: "Note", type: "textarea", required: true },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    listColumns: ["title", "tags"], defaultConfig: {},
  },

  calendar: {
    kind: "calendar", label: "Calendar", description: "Events and meetings.", icon: CalendarIcon,
    fields: [
      { key: "title", label: "Event", type: "text", required: true },
      { key: "datetime", label: "When", type: "datetime", required: true },
      { key: "duration", label: "Duration (min)", type: "number" },
      { key: "attendees", label: "Attendees", type: "tags" },
      { key: "location", label: "Location", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["title", "datetime", "duration", "location"], defaultConfig: {},
  },

  leads: {
    kind: "leads", label: "Leads", description: "Inbound leads with source and status.", icon: UserPlus,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["new", "contacted", "converted", "closed"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["name", "email", "source", "status"], defaultConfig: {},
  },

  products: {
    kind: "products", label: "Products", description: "Product catalog with SKUs and pricing.", icon: Tag,
    fields: [
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "name", label: "Product name", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "price", label: "Price", type: "number" },
      { key: "cost", label: "Cost", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    listColumns: ["sku", "name", "category", "price"], defaultConfig: { currency: "USD" },
  },

  inventory: {
    kind: "inventory", label: "Inventory", description: "Stock levels per SKU.", icon: Boxes,
    fields: [
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "name", label: "Product", type: "text", required: true },
      { key: "stock", label: "In stock", type: "number" },
      { key: "reorder_level", label: "Reorder level", type: "number" },
      { key: "location", label: "Location", type: "text" },
    ],
    listColumns: ["sku", "name", "stock", "reorder_level", "location"], defaultConfig: { lowStockThreshold: 5 },
  },

  suppliers: {
    kind: "suppliers", label: "Suppliers", description: "Vendor and supplier contacts.", icon: Truck,
    fields: [
      { key: "name", label: "Supplier", type: "text", required: true },
      { key: "contact", label: "Contact person", type: "text" },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "address", label: "Address", type: "text" },
    ],
    listColumns: ["name", "contact", "email", "phone"], defaultConfig: {},
  },

  purchases: {
    kind: "purchases", label: "Purchases", description: "Purchase orders from suppliers.", icon: PackageOpen,
    fields: [
      { key: "po_number", label: "PO #", type: "text", required: true },
      { key: "supplier", label: "Supplier", type: "text" },
      { key: "items", label: "Items", type: "textarea" },
      { key: "total", label: "Total", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["draft", "ordered", "received", "cancelled"] },
      { key: "date", label: "Date", type: "date" },
    ],
    listColumns: ["po_number", "supplier", "total", "status", "date"], defaultConfig: {},
  },

  sales: {
    kind: "sales", label: "Sales", description: "Sales transactions and revenue.", icon: LineChart,
    fields: [
      { key: "reference", label: "Reference", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "items", label: "Items", type: "textarea" },
      { key: "total", label: "Total", type: "number" },
      { key: "date", label: "Date", type: "date" },
    ],
    listColumns: ["reference", "customer", "total", "date"], defaultConfig: {},
  },

  warehouse: {
    kind: "warehouse", label: "Warehouse", description: "Warehouse locations and capacity.", icon: WarehouseIcon,
    fields: [
      { key: "name", label: "Warehouse", type: "text", required: true },
      { key: "address", label: "Address", type: "text" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "manager", label: "Manager", type: "text" },
    ],
    listColumns: ["name", "address", "capacity", "manager"], defaultConfig: {},
  },

  orders: {
    kind: "orders", label: "Orders", description: "Customer orders with status.", icon: ShoppingCart,
    fields: [
      { key: "reference", label: "Order #", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "items", label: "Items", type: "textarea" },
      { key: "total", label: "Total", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["pending", "paid", "shipped", "delivered", "cancelled"] },
      { key: "date", label: "Order date", type: "date" },
    ],
    listColumns: ["reference", "customer", "total", "status", "date"], defaultConfig: {},
  },

  invoices: {
    kind: "invoices", label: "Invoices", description: "Customer invoices with payment status.", icon: Receipt,
    fields: [
      { key: "number", label: "Invoice #", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "items", label: "Items / description", type: "textarea" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "tax", label: "Tax", type: "number" },
      { key: "issued", label: "Issue date", type: "date" },
      { key: "due", label: "Due date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["draft", "sent", "paid", "overdue", "void"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["number", "customer", "amount", "due", "status"], defaultConfig: { currency: "USD" },
  },

  payments: {
    kind: "payments", label: "Payments", description: "Incoming payments and receipts.", icon: CreditCard,
    fields: [
      { key: "reference", label: "Reference", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "invoice", label: "Invoice #", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "method", label: "Method", type: "select", options: ["cash", "card", "bank_transfer", "upi", "paypal", "stripe", "other"] },
      { key: "date", label: "Date", type: "date" },
    ],
    listColumns: ["reference", "customer", "invoice", "amount", "method", "date"], defaultConfig: {},
  },

  expenses: {
    kind: "expenses", label: "Expenses", description: "Outgoing expenses and bills.", icon: Wallet,
    fields: [
      { key: "description", label: "Description", type: "text", required: true },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["rent", "utilities", "salaries", "supplies", "marketing", "software", "travel", "other"] },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["description", "vendor", "category", "amount", "date"], defaultConfig: {},
  },

  menu: {
    kind: "menu", label: "Menu", description: "Restaurant menu items.", icon: UtensilsCrossed,
    fields: [
      { key: "name", label: "Dish", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "price", label: "Price", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "available", label: "Available", type: "boolean" },
    ],
    listColumns: ["name", "category", "price", "available"], defaultConfig: { currency: "USD" },
  },

  tables: {
    kind: "tables", label: "Tables", description: "Restaurant table layout.", icon: Utensils,
    fields: [
      { key: "number", label: "Table #", type: "text", required: true },
      { key: "capacity", label: "Seats", type: "number" },
      { key: "location", label: "Section", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["available", "occupied", "reserved", "cleaning"] },
    ],
    listColumns: ["number", "capacity", "location", "status"], defaultConfig: {},
  },

  kitchen: {
    kind: "kitchen", label: "Kitchen", description: "Live kitchen tickets.", icon: ChefHat,
    fields: [
      { key: "ticket", label: "Ticket #", type: "text", required: true },
      { key: "table", label: "Table", type: "text" },
      { key: "items", label: "Items", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["queued", "cooking", "ready", "served"] },
      { key: "time", label: "Received", type: "datetime" },
    ],
    listColumns: ["ticket", "table", "status", "time"], defaultConfig: {},
  },

  reservations: {
    kind: "reservations", label: "Reservations", description: "Table reservations.", icon: CalendarClock,
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "datetime", label: "Date & time", type: "datetime", required: true },
      { key: "party", label: "Party size", type: "number" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "seated", "cancelled"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["customer", "datetime", "party", "status"], defaultConfig: {},
  },

  bookings: {
    kind: "bookings", label: "Bookings", description: "Appointments and service bookings.", icon: CalendarCheck,
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "service", label: "Service", type: "text" },
      { key: "staff", label: "Staff", type: "text" },
      { key: "datetime", label: "Date & time", type: "datetime", required: true },
      { key: "duration", label: "Duration (min)", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "completed", "cancelled", "no_show"] },
    ],
    listColumns: ["customer", "service", "staff", "datetime", "status"], defaultConfig: {},
  },

  staff: {
    kind: "staff", label: "Staff", description: "Staff members and their roles.", icon: IdCard,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "services", label: "Services", type: "tags" },
    ],
    listColumns: ["name", "role", "email", "services"], defaultConfig: {},
  },

  availability: {
    kind: "availability", label: "Availability", description: "Staff schedules and time slots.", icon: Clock,
    fields: [
      { key: "staff", label: "Staff", type: "text", required: true },
      { key: "day", label: "Day", type: "select", options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      { key: "from", label: "From", type: "text", placeholder: "09:00" },
      { key: "to", label: "To", type: "text", placeholder: "17:00" },
      { key: "available", label: "Available", type: "boolean" },
    ],
    listColumns: ["staff", "day", "from", "to", "available"], defaultConfig: {},
  },

  notifications: {
    kind: "notifications", label: "Notifications", description: "Outgoing notification templates & log.", icon: Bell,
    fields: [
      { key: "channel", label: "Channel", type: "select", options: ["email", "sms", "whatsapp", "push"] },
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea" },
      { key: "audience", label: "Audience", type: "text" },
      { key: "sent_at", label: "Sent at", type: "datetime" },
    ],
    listColumns: ["channel", "subject", "audience", "sent_at"], defaultConfig: {},
  },

  employees: {
    kind: "employees", label: "Employees", description: "Team members with salary and role.", icon: IdCard,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" },
      { key: "salary", label: "Salary", type: "number" },
      { key: "joined", label: "Joined", type: "date" },
    ],
    listColumns: ["name", "role", "email", "salary"], defaultConfig: {},
  },

  portfolio: {
    kind: "portfolio", label: "Portfolio", description: "Showcase of past work.", icon: Briefcase,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "url", label: "URL", type: "url" }, { key: "image", label: "Image URL", type: "url" },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    listColumns: ["title", "tags", "url"], defaultConfig: {},
  },

  /* ---------------- Healthcare ---------------- */
  patients: {
    kind: "patients", label: "Patients", description: "Patient records and medical history.", icon: HeartPulse,
    fields: [
      { key: "name", label: "Patient name", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "dob", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender", type: "select", options: ["male", "female", "other"] },
      { key: "blood_group", label: "Blood group", type: "text" },
      { key: "conditions", label: "Conditions", type: "tags" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["name", "phone", "dob", "blood_group"], defaultConfig: {},
  },
  doctors: {
    kind: "doctors", label: "Doctors", description: "Practitioners, specialities and fees.", icon: Stethoscope,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "speciality", label: "Speciality", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "fee", label: "Consultation fee", type: "number" },
      { key: "available", label: "Accepting patients", type: "boolean" },
    ],
    listColumns: ["name", "speciality", "fee", "available"], defaultConfig: {},
  },
  prescriptions: {
    kind: "prescriptions", label: "Prescriptions", description: "Prescribed medication per visit.", icon: ClipboardCheck,
    fields: [
      { key: "patient", label: "Patient", type: "text", required: true },
      { key: "doctor", label: "Doctor", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "medication", label: "Medication", type: "textarea" },
      { key: "dosage", label: "Dosage", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["patient", "doctor", "date", "dosage"], defaultConfig: {},
  },
  medicines: {
    kind: "medicines", label: "Pharmacy", description: "Medicine stock and expiry tracking.", icon: Pill,
    fields: [
      { key: "name", label: "Medicine", type: "text", required: true },
      { key: "batch", label: "Batch", type: "text" },
      { key: "stock", label: "Stock", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "expiry", label: "Expiry", type: "date" },
    ],
    listColumns: ["name", "batch", "stock", "price", "expiry"], defaultConfig: {},
  },
  lab_tests: {
    kind: "lab_tests", label: "Lab tests", description: "Diagnostic tests and results.", icon: FlaskConical,
    fields: [
      { key: "patient", label: "Patient", type: "text", required: true },
      { key: "test", label: "Test", type: "text", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "result", label: "Result", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["ordered", "collected", "completed", "cancelled"] },
      { key: "price", label: "Price", type: "number" },
    ],
    listColumns: ["patient", "test", "date", "status", "price"], defaultConfig: {},
  },

  /* ---------------- Education ---------------- */
  students: {
    kind: "students", label: "Students", description: "Enrolled students and their class.", icon: GraduationCap,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "roll_no", label: "Roll no", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "guardian", label: "Guardian", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "enrolled", label: "Enrolled", type: "date" },
    ],
    listColumns: ["name", "roll_no", "class", "phone"], defaultConfig: {},
  },
  teachers: {
    kind: "teachers", label: "Teachers", description: "Teaching staff and subjects.", icon: School,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "subjects", label: "Subjects", type: "tags" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "salary", label: "Salary", type: "number" },
    ],
    listColumns: ["name", "subjects", "email", "salary"], defaultConfig: {},
  },
  courses: {
    kind: "courses", label: "Courses", description: "Courses with duration and price.", icon: BookOpen,
    fields: [
      { key: "title", label: "Course", type: "text", required: true },
      { key: "instructor", label: "Instructor", type: "text" },
      { key: "duration", label: "Duration", type: "text" },
      { key: "price", label: "Price", type: "number" },
      { key: "seats", label: "Seats", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    listColumns: ["title", "instructor", "duration", "price", "seats"], defaultConfig: {},
  },
  classes: {
    kind: "classes", label: "Classes", description: "Class sections and timetable.", icon: Layers,
    fields: [
      { key: "name", label: "Class", type: "text", required: true },
      { key: "teacher", label: "Class teacher", type: "text" },
      { key: "room", label: "Room", type: "text" },
      { key: "schedule", label: "Schedule", type: "text", placeholder: "Mon/Wed 09:00" },
      { key: "capacity", label: "Capacity", type: "number" },
    ],
    listColumns: ["name", "teacher", "room", "schedule"], defaultConfig: {},
  },
  grades: {
    kind: "grades", label: "Grades", description: "Assessment results per student.", icon: Percent,
    fields: [
      { key: "student", label: "Student", type: "text", required: true },
      { key: "subject", label: "Subject", type: "text" },
      { key: "assessment", label: "Assessment", type: "text" },
      { key: "score", label: "Score", type: "number" },
      { key: "max_score", label: "Out of", type: "number" },
      { key: "date", label: "Date", type: "date" },
    ],
    listColumns: ["student", "subject", "assessment", "score", "date"], defaultConfig: {},
  },
  attendance: {
    kind: "attendance", label: "Attendance", description: "Daily attendance log.", icon: UserCheck,
    fields: [
      { key: "person", label: "Name", type: "text", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["present", "absent", "late", "excused"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
    listColumns: ["person", "date", "status", "notes"], defaultConfig: {},
  },
  fees: {
    kind: "fees", label: "Fees", description: "Tuition and fee collection.", icon: BadgeDollarSign,
    fields: [
      { key: "student", label: "Student", type: "text", required: true },
      { key: "term", label: "Term", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "due", label: "Due date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["pending", "paid", "partial", "waived"] },
    ],
    listColumns: ["student", "term", "amount", "due", "status"], defaultConfig: {},
  },

  /* ---------------- Property & assets ---------------- */
  properties: {
    kind: "properties", label: "Properties", description: "Property listings and status.", icon: Home,
    fields: [
      { key: "title", label: "Property", type: "text", required: true },
      { key: "address", label: "Address", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["apartment", "house", "office", "retail", "land"] },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "area", label: "Area (sqft)", type: "number" },
      { key: "price", label: "Price / rent", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["available", "reserved", "rented", "sold"] },
    ],
    listColumns: ["title", "address", "type", "price", "status"], defaultConfig: {},
  },
  tenants: {
    kind: "tenants", label: "Tenants", description: "Tenants and their unit.", icon: Users2,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "unit", label: "Unit / property", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "rent", label: "Monthly rent", type: "number" },
      { key: "since", label: "Tenant since", type: "date" },
    ],
    listColumns: ["name", "unit", "rent", "since"], defaultConfig: {},
  },
  leases: {
    kind: "leases", label: "Leases", description: "Lease agreements and renewals.", icon: FileSignature,
    fields: [
      { key: "reference", label: "Lease #", type: "text", required: true },
      { key: "tenant", label: "Tenant", type: "text" },
      { key: "property", label: "Property", type: "text" },
      { key: "start", label: "Start", type: "date" },
      { key: "end", label: "End", type: "date" },
      { key: "rent", label: "Rent", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "expiring", "expired", "terminated"] },
    ],
    listColumns: ["reference", "tenant", "property", "end", "status"], defaultConfig: {},
  },
  maintenance: {
    kind: "maintenance", label: "Maintenance", description: "Repair and maintenance requests.", icon: Wrench,
    fields: [
      { key: "title", label: "Issue", type: "text", required: true },
      { key: "location", label: "Property / unit", type: "text" },
      { key: "reported_by", label: "Reported by", type: "text" },
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"] },
      { key: "status", label: "Status", type: "select", options: ["open", "assigned", "in_progress", "resolved"] },
      { key: "cost", label: "Cost", type: "number" },
      { key: "date", label: "Reported", type: "date" },
    ],
    listColumns: ["title", "location", "priority", "status", "cost"], defaultConfig: {},
  },
  assets: {
    kind: "assets", label: "Assets", description: "Company assets and assignments.", icon: PackageOpen,
    fields: [
      { key: "name", label: "Asset", type: "text", required: true },
      { key: "tag", label: "Asset tag", type: "text" },
      { key: "assigned_to", label: "Assigned to", type: "text" },
      { key: "value", label: "Value", type: "number" },
      { key: "purchased", label: "Purchased", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["in_use", "available", "repair", "retired"] },
    ],
    listColumns: ["name", "tag", "assigned_to", "value", "status"], defaultConfig: {},
  },
  vehicles: {
    kind: "vehicles", label: "Vehicles", description: "Fleet vehicles and availability.", icon: Car,
    fields: [
      { key: "name", label: "Vehicle", type: "text", required: true },
      { key: "plate", label: "Plate", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "driver", label: "Driver", type: "text" },
      { key: "rate", label: "Rate / day", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["available", "rented", "maintenance", "out_of_service"] },
    ],
    listColumns: ["name", "plate", "driver", "rate", "status"], defaultConfig: {},
  },

  /* ---------------- Logistics & support ---------------- */
  shipments: {
    kind: "shipments", label: "Shipments", description: "Deliveries and tracking status.", icon: Ship,
    fields: [
      { key: "tracking", label: "Tracking #", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "origin", label: "Origin", type: "text" },
      { key: "destination", label: "Destination", type: "text" },
      { key: "carrier", label: "Carrier", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["pending", "in_transit", "out_for_delivery", "delivered", "returned"] },
      { key: "eta", label: "ETA", type: "date" },
      { key: "cost", label: "Cost", type: "number" },
    ],
    listColumns: ["tracking", "customer", "destination", "status", "eta"], defaultConfig: {},
  },
  routes: {
    kind: "routes", label: "Routes", description: "Delivery routes and drivers.", icon: MapIcon,
    fields: [
      { key: "name", label: "Route", type: "text", required: true },
      { key: "driver", label: "Driver", type: "text" },
      { key: "stops", label: "Stops", type: "number" },
      { key: "distance", label: "Distance (km)", type: "number" },
      { key: "date", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["planned", "active", "completed"] },
    ],
    listColumns: ["name", "driver", "stops", "date", "status"], defaultConfig: {},
  },
  tickets: {
    kind: "tickets", label: "Support tickets", description: "Customer support queue.", icon: LifeBuoy,
    fields: [
      { key: "reference", label: "Ticket #", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"] },
      { key: "status", label: "Status", type: "select", options: ["open", "pending", "resolved", "closed"] },
      { key: "assignee", label: "Assignee", type: "text" },
      { key: "created", label: "Created", type: "date" },
    ],
    listColumns: ["reference", "subject", "customer", "priority", "status"], defaultConfig: {},
  },
  knowledge_base: {
    kind: "knowledge_base", label: "Knowledge base", description: "Help articles for customers.", icon: BookMarked,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "body", label: "Article", type: "textarea" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    listColumns: ["title", "category", "published"], defaultConfig: {},
  },

  /* ---------------- Membership & finance ---------------- */
  members: {
    kind: "members", label: "Members", description: "Memberships and renewal dates.", icon: UserCheck,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "plan", label: "Plan", type: "text" },
      { key: "joined", label: "Joined", type: "date" },
      { key: "renews", label: "Renews", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["active", "paused", "expired", "cancelled"] },
    ],
    listColumns: ["name", "plan", "renews", "status"], defaultConfig: {},
  },
  plans: {
    kind: "plans", label: "Plans", description: "Pricing plans and features.", icon: Tag,
    fields: [
      { key: "name", label: "Plan", type: "text", required: true },
      { key: "price", label: "Price", type: "number" },
      { key: "interval", label: "Interval", type: "select", options: ["monthly", "quarterly", "yearly", "one_time"] },
      { key: "features", label: "Features", type: "tags" },
      { key: "active", label: "Active", type: "boolean" },
    ],
    listColumns: ["name", "price", "interval", "active"], defaultConfig: {},
  },
  subscriptions: {
    kind: "subscriptions", label: "Subscriptions", description: "Recurring customer subscriptions.", icon: Repeat,
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "plan", label: "Plan", type: "text" },
      { key: "amount", label: "Amount", type: "number" },
      { key: "started", label: "Started", type: "date" },
      { key: "renews", label: "Renews", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["trialing", "active", "past_due", "cancelled"] },
    ],
    listColumns: ["customer", "plan", "amount", "renews", "status"], defaultConfig: {},
  },
  transactions: {
    kind: "transactions", label: "Transactions", description: "Ledger of money in and out.", icon: ArrowLeftRight,
    fields: [
      { key: "reference", label: "Reference", type: "text", required: true },
      { key: "type", label: "Type", type: "select", options: ["income", "expense", "transfer"] },
      { key: "category", label: "Category", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "account", label: "Account", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["reference", "type", "category", "amount", "date"], defaultConfig: {},
  },
  budgets: {
    kind: "budgets", label: "Budgets", description: "Budget per category and period.", icon: PiggyBank,
    fields: [
      { key: "category", label: "Category", type: "text", required: true },
      { key: "period", label: "Period", type: "text", placeholder: "2026-01" },
      { key: "planned", label: "Planned", type: "number" },
      { key: "actual", label: "Actual", type: "number" },
    ],
    listColumns: ["category", "period", "planned", "actual"], defaultConfig: {},
  },
  payroll: {
    kind: "payroll", label: "Payroll", description: "Salary runs per employee.", icon: Wallet,
    fields: [
      { key: "employee", label: "Employee", type: "text", required: true },
      { key: "period", label: "Period", type: "text", placeholder: "2026-01" },
      { key: "gross", label: "Gross", type: "number" },
      { key: "deductions", label: "Deductions", type: "number" },
      { key: "net", label: "Net pay", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["draft", "approved", "paid"] },
    ],
    listColumns: ["employee", "period", "net", "status"], defaultConfig: {},
  },
  timesheets: {
    kind: "timesheets", label: "Timesheets", description: "Logged hours per person.", icon: Timer,
    fields: [
      { key: "person", label: "Person", type: "text", required: true },
      { key: "project", label: "Project / task", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "hours", label: "Hours", type: "number" },
      { key: "billable", label: "Billable", type: "boolean" },
    ],
    listColumns: ["person", "project", "date", "hours", "billable"], defaultConfig: {},
  },

  /* ---------------- Content & events ---------------- */
  documents: {
    kind: "documents", label: "Documents", description: "Files and document links.", icon: FolderOpen,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "url", label: "Link", type: "url" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "updated", label: "Updated", type: "date" },
    ],
    listColumns: ["title", "category", "owner", "updated"], defaultConfig: {},
  },
  blog: {
    kind: "blog", label: "Blog", description: "Articles and publishing status.", icon: Newspaper,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "author", label: "Author", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "published", label: "Published", type: "boolean" },
      { key: "date", label: "Date", type: "date" },
    ],
    listColumns: ["title", "author", "tags", "published", "date"], defaultConfig: {},
  },
  events: {
    kind: "events", label: "Events", description: "Events with venue and capacity.", icon: PartyPopper,
    fields: [
      { key: "title", label: "Event", type: "text", required: true },
      { key: "venue", label: "Venue", type: "text" },
      { key: "datetime", label: "Date & time", type: "datetime" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "ticket_price", label: "Ticket price", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published", "sold_out", "completed", "cancelled"] },
    ],
    listColumns: ["title", "venue", "datetime", "ticket_price", "status"], defaultConfig: {},
  },
  attendees: {
    kind: "attendees", label: "Attendees", description: "Event registrations.", icon: Users2,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "event", label: "Event", type: "text" },
      { key: "tickets", label: "Tickets", type: "number" },
      { key: "paid", label: "Paid", type: "boolean" },
      { key: "checked_in", label: "Checked in", type: "boolean" },
    ],
    listColumns: ["name", "event", "tickets", "paid", "checked_in"], defaultConfig: {},
  },
  rooms: {
    kind: "rooms", label: "Rooms", description: "Rooms or spaces and nightly rate.", icon: DoorOpen,
    fields: [
      { key: "name", label: "Room", type: "text", required: true },
      { key: "type", label: "Type", type: "text" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "rate", label: "Rate", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["available", "occupied", "cleaning", "maintenance"] },
    ],
    listColumns: ["name", "type", "capacity", "rate", "status"], defaultConfig: {},
  },
  donations: {
    kind: "donations", label: "Donations", description: "Donor contributions.", icon: HandHeart,
    fields: [
      { key: "donor", label: "Donor", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "campaign", label: "Campaign", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "recurring", label: "Recurring", type: "boolean" },
    ],
    listColumns: ["donor", "amount", "campaign", "date"], defaultConfig: {},
  },
  campaigns: {
    kind: "campaigns", label: "Campaigns", description: "Marketing or fundraising campaigns.", icon: Megaphone,
    fields: [
      { key: "name", label: "Campaign", type: "text", required: true },
      { key: "channel", label: "Channel", type: "select", options: ["email", "social", "ads", "events", "referral", "other"] },
      { key: "budget", label: "Budget", type: "number" },
      { key: "goal", label: "Goal", type: "number" },
      { key: "raised", label: "Raised / revenue", type: "number" },
      { key: "start", label: "Start", type: "date" },
      { key: "end", label: "End", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["planned", "running", "paused", "completed"] },
    ],
    listColumns: ["name", "channel", "budget", "raised", "status"], defaultConfig: {},
  },
  quotes: {
    kind: "quotes", label: "Quotes", description: "Estimates sent to prospects.", icon: FileText,
    fields: [
      { key: "number", label: "Quote #", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "items", label: "Scope / items", type: "textarea" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "valid_until", label: "Valid until", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["draft", "sent", "accepted", "declined", "expired"] },
    ],
    listColumns: ["number", "customer", "amount", "valid_until", "status"], defaultConfig: {},
  },
  contracts: {
    kind: "contracts", label: "Contracts", description: "Signed agreements and renewals.", icon: FileSignature,
    fields: [
      { key: "title", label: "Contract", type: "text", required: true },
      { key: "party", label: "Counterparty", type: "text" },
      { key: "value", label: "Value", type: "number" },
      { key: "start", label: "Start", type: "date" },
      { key: "end", label: "End", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["draft", "sent", "signed", "expired", "terminated"] },
    ],
    listColumns: ["title", "party", "value", "end", "status"], defaultConfig: {},
  },
  reviews: {
    kind: "reviews", label: "Reviews", description: "Customer feedback and ratings.", icon: Star,
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "subject", label: "About", type: "text" },
      { key: "rating", label: "Rating (1-5)", type: "number" },
      { key: "comment", label: "Comment", type: "textarea" },
      { key: "date", label: "Date", type: "date" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    listColumns: ["customer", "subject", "rating", "date", "published"], defaultConfig: {},
  },

  reports: { kind: "reports", label: "Reports", description: "Cross-module summary reports.", icon: FileText, fields: [], listColumns: [], defaultConfig: {}, virtual: true },

  analytics: { kind: "analytics", label: "Analytics", description: "Charts across your workspace.", icon: BarChart3, fields: [], listColumns: [], defaultConfig: {}, virtual: true },
  settings: {
    kind: "settings", label: "Settings", description: "Preferences and configuration.", icon: SettingsIcon,
    fields: [
      { key: "key", label: "Setting", type: "text", required: true },
      { key: "value", label: "Value", type: "text", required: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    listColumns: ["key", "value", "notes"], defaultConfig: {},
  },
};


export const ALL_MODULE_KINDS = Object.keys(MODULE_CATALOG) as ModuleKind[];

export function getModule(kind: string): ModuleDef | undefined {
  return MODULE_CATALOG[kind as ModuleKind];
}

// Which numeric field represents "revenue-ish" total for a record?
const AMOUNT_KEYS: Partial<Record<ModuleKind, string>> = {
  invoices: "amount", payments: "amount", sales: "total", orders: "total",
  deals: "value", purchases: "total", expenses: "amount",
  fees: "amount", transactions: "amount", donations: "amount",
  subscriptions: "amount", quotes: "amount", payroll: "net",
  shipments: "cost", lab_tests: "price", maintenance: "cost",
  events: "ticket_price", contracts: "value", campaigns: "raised",
};

export function amountKey(kind: string): string | undefined {
  return AMOUNT_KEYS[kind as ModuleKind];
}
