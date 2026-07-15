import {
  Check,
  X,
  AlertTriangle,
  Info,
  Menu,
  Home,
  Users,
  ShoppingCart,
  Package,
  Settings,
  LogOut,
  Search,
  Loader2,
} from 'lucide-react';

// Maps semantic icon names to their respective visual lucide components
const IconMap = {
  check: Check,
  close: X,
  warning: AlertTriangle,
  info: Info,
  menu: Menu,
  dashboard: Home,
  customers: Users,
  orders: ShoppingCart,
  products: Package,
  settings: Settings,
  logout: LogOut,
  search: Search,
  spinner: Loader2,
};

export default function Icon({ name, className = '', ...props }) {
  const LucideIcon = IconMap[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in IconMap.`);
    return null;
  }

  return <LucideIcon className={className} {...props} />;
}
