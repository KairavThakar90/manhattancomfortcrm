import {
  BarChart3,
  FileSpreadsheet,
  Users,
  Mail,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Shield,
  Package,
  UserCog,
  Activity,
  Truck,
} from 'lucide-react';

export const navItems = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Executive Dashboard',
    icon: BarChart3,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'purchase-orders',
    path: '/purchase-orders',
    label: 'Purchase Orders',
    icon: FileSpreadsheet,
    roles: ['Administrator', 'Purchasing', 'Finance', 'Vendor'],
  },
  {
    id: 'container-flow',
    path: '/container-flow',
    label: 'Container Management',
    icon: Package,
    roles: ['Administrator', 'Purchasing', 'Warehouse', 'Finance'],
  },
  {
    id: 'vendors',
    path: '/sourcing-vendors',
    label: 'Sourcing Vendors',
    icon: Users,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'email-center',
    path: '/sourcing-email-hub',
    label: 'Sourcing Email Hub',
    icon: Mail,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'chat',
    path: '/workspace-team-chat',
    label: 'Workspace Team Chat',
    icon: MessageSquare,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'ai-assistant',
    path: '/sop-ai-assistant',
    label: 'S&OP AI Assistant',
    icon: Sparkles,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'reports',
    path: '/reports-analytics',
    label: 'Reports & BI Analytics',
    icon: TrendingUp,
    comingSoon: true,
    roles: ['Administrator', 'Purchasing', 'Finance'],
  },
  {
    id: 'system-admin',
    path: '/security-admin',
    label: 'Security Admin Panel',
    icon: Shield,
    comingSoon: true,
    roles: ['Administrator'],
  },
  {
    id: 'user-management',
    path: '/user-management',
    label: 'User Management',
    icon: UserCog,
    roles: ['Administrator'],
  },
  // {
  //   id: 'tracker-logistics',
  //   path: '/tracker-logistics',
  //   label: 'Tracker Logistics',
  //   icon: Truck,
  //   roles: ['Administrator', 'Office'],
  // },
  {
    id: 'user-activities',
    path: '/user-activities',
    label: 'Activity Tracking',
    icon: Activity,
  },
];

// Key-value pair map of navigation paths by ID
export const navPathsMap = navItems.reduce((acc, item) => {
  acc[item.id] = item.path;
  return acc;
}, {});

// Full item key-value map by ID
export const navItemsMap = navItems.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
