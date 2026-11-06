import { Shirt, UtensilsCrossed, Briefcase, Building2, Users, Package, CalendarCheck, type LucideIcon } from "lucide-react";

export type Template = {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  prompt: string;
  tags: string[];
};

export const TEMPLATES: Template[] = [
  {
    id: "clothing-shop",
    name: "Clothing Shop",
    tagline: "Online storefront with inventory and customer accounts",
    icon: Shirt,
    tags: ["E-commerce", "Inventory"],
    prompt: "I run a small clothing boutique and need an online shop with product catalog, sizes and variants, stock tracking, customer accounts, order checkout, and basic marketing email tools.",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    tagline: "Menu, online ordering, and table reservations",
    icon: UtensilsCrossed,
    tags: ["Booking", "Menu"],
    prompt: "I own a restaurant and need a website with our menu, online ordering with pickup and delivery options, table reservation booking, and a simple admin panel for staff to manage orders.",
  },
  {
    id: "freelancer-portfolio",
    name: "Freelancer Portfolio",
    tagline: "Showcase work and capture leads",
    icon: Briefcase,
    tags: ["Website", "Lead capture"],
    prompt: "I'm a freelance designer and need a portfolio website showcasing my projects with case studies, an about section, a contact form that emails me leads, and a simple blog.",
  },
  {
    id: "agency-website",
    name: "Agency Website",
    tagline: "Services, case studies, and lead funnel",
    icon: Building2,
    tags: ["Website", "Marketing"],
    prompt: "I run a marketing agency and need a website with our services, team bios, client case studies, testimonials, pricing tiers, a contact form, and a newsletter signup.",
  },
  {
    id: "crm",
    name: "CRM",
    tagline: "Contacts, deals, and follow-ups in one place",
    icon: Users,
    tags: ["Sales", "Pipeline"],
    prompt: "I need a lightweight CRM to track customers, manage a sales pipeline with deal stages, log activities and notes, set follow-up reminders, and share access with my small team.",
  },
  {
    id: "inventory",
    name: "Inventory Management",
    tagline: "Track stock, suppliers, and low-stock alerts",
    icon: Package,
    tags: ["Inventory", "Operations"],
    prompt: "I need an inventory management tool to track SKUs across locations, manage suppliers and purchase orders, get low-stock alerts, and export reports as CSV.",
  },
  {
    id: "booking",
    name: "Appointment Booking",
    tagline: "Let customers self-book your time",
    icon: CalendarCheck,
    tags: ["Booking", "Calendar"],
    prompt: "I need an appointment booking system where customers pick a service and time slot, get email and SMS reminders, with calendar sync and configurable buffer times between appointments.",
  },
];
