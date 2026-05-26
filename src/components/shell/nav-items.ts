import {
  LayoutDashboard,
  Car,
  ReceiptText,
  FileText,
  Users,
  Truck,
  IndianRupee,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Whether to surface this in the mobile bottom nav. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/",            icon: LayoutDashboard, mobile: true },
  { label: "Trips",       href: "/trips",       icon: Car,             mobile: true },
  { label: "Invoices",    href: "/invoices",    icon: ReceiptText,     mobile: true },
  { label: "Quotations",  href: "/quotations",  icon: FileText,        mobile: true },
  { label: "Clients",     href: "/clients",     icon: Users },
  { label: "Vehicles",    href: "/vehicles",    icon: Truck },
  { label: "Rate cards",  href: "/rate-cards",  icon: IndianRupee },
  { label: "Settings",    href: "/settings",    icon: Settings },
];

export const MOBILE_PRIMARY = NAV_ITEMS.filter((n) => n.mobile);
