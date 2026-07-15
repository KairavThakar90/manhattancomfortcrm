import React from 'react';
import AIAssistant from '../components/AIAssistant';
import { useCRM } from '../hooks/useCRM';
import { useNavigate } from 'react-router-dom';

export default function AIAssistantPage() {
  const { purchaseOrders, vendors, setSelectedPOId } = useCRM();
  const navigate = useNavigate();

  return (
    <AIAssistant
      purchaseOrders={purchaseOrders}
      vendors={vendors}
      onSelectPO={(id) => {
        setSelectedPOId(id);
        navigate('/purchase-orders');
      }}
      onNavigateToTab={(tab) => {
        let path = '/dashboard';
        const routesMap = {
          'purchase-orders': '/purchase-orders',
          vendors: '/sourcing-vendors',
          'email-center': '/sourcing-email-hub',
          chat: '/workspace-team-chat',
          'ai-assistant': '/sop-ai-assistant',
          reports: '/reports-analytics',
          'system-admin': '/security-admin',
        };
        if (routesMap[tab]) path = routesMap[tab];

        if (tab !== 'purchase-orders') setSelectedPOId(null);
        navigate(path);
      }}
    />
  );
}
