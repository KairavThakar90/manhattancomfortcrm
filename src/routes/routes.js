import React, { lazy } from 'react';

// Lazy loading the pages
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const POManagementPage = lazy(
  () => import('../features/purchaseOrders/pages/POManagementPage'),
);
const ContainerFlowPage = lazy(
  () => import('../features/containers/pages/ContainerFlowPage'),
);
const VendorManagementPage = lazy(
  () => import('../pages/VendorManagementPage'),
);
const EmailCenterPage = lazy(() => import('../pages/EmailCenterPage'));
const TeamChatPage = lazy(() => import('../pages/TeamChatPage'));
const AIAssistantPage = lazy(() => import('../pages/AIAssistantPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const AdminPanelPage = lazy(() => import('../pages/AdminPanelPage'));
const UserManagementPage = lazy(
  () => import('../features/users/pages/UserManagementPage'),
);

export const appRoutes = [
  { path: '/dashboard', element: React.createElement(DashboardPage) },
  { path: '/purchase-orders', element: React.createElement(POManagementPage) },
  {
    path: '/purchase-orders/:poId',
    element: React.createElement(POManagementPage),
  },
  { path: '/container-flow', element: React.createElement(ContainerFlowPage) },
  {
    path: '/sourcing-vendors',
    element: React.createElement(VendorManagementPage),
  },
  {
    path: '/sourcing-email-hub',
    element: React.createElement(EmailCenterPage),
  },
  { path: '/workspace-team-chat', element: React.createElement(TeamChatPage) },
  { path: '/sop-ai-assistant', element: React.createElement(AIAssistantPage) },
  { path: '/reports-analytics', element: React.createElement(ReportsPage) },
  { path: '/security-admin', element: React.createElement(AdminPanelPage) },
  {
    path: '/user-management',
    element: React.createElement(UserManagementPage),
  },
];
