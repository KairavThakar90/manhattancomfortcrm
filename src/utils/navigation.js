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
} from 'lucide-react';

export const navItems = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Executive Dashboard',
    icon: BarChart3,
    comingSoon: true,
  },
  {
    id: 'purchase-orders',
    path: '/purchase-orders',
    label: 'Purchase Orders',
    icon: FileSpreadsheet,
  },
  {
    id: 'container-flow',
    path: '/container-flow',
    label: 'Container Management',
    icon: Package,
  },
  {
    id: 'vendors',
    path: '/sourcing-vendors',
    label: 'Sourcing Vendors',
    icon: Users,
    comingSoon: true,
  },
  {
    id: 'email-center',
    path: '/sourcing-email-hub',
    label: 'Sourcing Email Hub',
    icon: Mail,
    comingSoon: true,
  },
  {
    id: 'chat',
    path: '/workspace-team-chat',
    label: 'Workspace Team Chat',
    icon: MessageSquare,
    comingSoon: true,
  },
  {
    id: 'ai-assistant',
    path: '/sop-ai-assistant',
    label: 'S&OP AI Assistant',
    icon: Sparkles,
    comingSoon: true,
  },
  {
    id: 'reports',
    path: '/reports-analytics',
    label: 'Reports & BI Analytics',
    icon: TrendingUp,
    comingSoon: true,
  },
  {
    id: 'system-admin',
    path: '/security-admin',
    label: 'Security Admin Panel',
    icon: Shield,
    comingSoon: true,
  },
  {
    id: 'user-management',
    path: '/user-management',
    label: 'User Management',
    icon: UserCog,
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
