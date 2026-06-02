import {
  LayoutDashboard,
  Car,
  Receipt,
  FileSignature,
  Users,
  IndianRupee,
  Truck,
  Upload,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Whether to surface this in the mobile bottom nav AND the desktop
   * sidebar's primary section. Secondary items (mobile: false) appear
   * only inside the /more drawer. Daily destinations should be primary;
   * occasional ones (Vehicles, Settings) should be secondary.
   */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // Primary, the four most-used destinations for mobile bottom tabs
  // (plus the More tab they collapse into). Clients earns a slot
  // because every new account adds clients before anything else;
  // Quotations is the rarer move and lives in More.
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard, mobile: true },
  { label: "Trips",      href: "/trips",      icon: Car,             mobile: true },
  { label: "Invoices",   href: "/invoices",   icon: Receipt,         mobile: true },
  { label: "Clients",    href: "/clients",    icon: Users,           mobile: true },
  // Secondary, surfaced in the desktop sidebar and grouped into the
  // mobile More drawer.
  { label: "Quotations",  href: "/quotations",  icon: FileSignature },
  { label: "Rate cards",  href: "/rate-cards",  icon: IndianRupee },
  { label: "Vehicles",    href: "/vehicles",    icon: Truck },
  { label: "Bulk import", href: "/bulk-import", icon: Upload },
  { label: "Settings",    href: "/settings",    icon: Settings },
];

export const MOBILE_PRIMARY = NAV_ITEMS.filter((n) => n.mobile);
export const SECONDARY = NAV_ITEMS.filter((n) => !n.mobile);
