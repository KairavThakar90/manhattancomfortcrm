import React from 'react';
import AIAssistant from '../components/AIAssistant';
import { useCRM } from '../hooks/useCRM';
import { useNavigate } from 'react-router-dom';
import { navPathsMap } from '../utils/navigation';

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
        if (navPathsMap[tab]) path = navPathsMap[tab];

        if (tab !== 'purchase-orders') setSelectedPOId(null);
        navigate(path);
      }}
    />
  );
}
