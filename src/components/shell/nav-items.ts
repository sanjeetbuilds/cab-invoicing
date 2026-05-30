import {
  LayoutDashboard,
  Car,
  Receipt,
  FileSignature,
  Users,
  Truck,
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
   * occasional ones (Fleet, Settings) should be secondary.
   */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // Primary — bottom-nav slots (4 items + the More tab = 5 total).
  // Five is the comfortable max for thumb reach on a phone; six
  // wrapped to a second row before this commit.
  { label: "Dashboard",  href: "/",           icon: LayoutDashboard, mobile: true },
  { label: "Trips",      href: "/trips",      icon: Car,             mobile: true },
  { label: "Invoices",   href: "/invoices",   icon: Receipt,         mobile: true },
  { label: "Quotations", href: "/quotations", icon: FileSignature,   mobile: true },
  // Secondary — surface only inside the /more drawer.
  { label: "Clients",    href: "/clients",    icon: Users },
  { label: "Fleet",      href: "/vehicles",   icon: Truck },
  { label: "Settings",   href: "/settings",   icon: Settings },
];

export const MOBILE_PRIMARY = NAV_ITEMS.filter((n) => n.mobile);
export const SECONDARY = NAV_ITEMS.filter((n) => !n.mobile);
