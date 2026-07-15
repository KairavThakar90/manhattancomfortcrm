import React from 'react';
import ExecutiveDashboard from '../components/ExecutiveDashboard';
import { useCRM } from '../hooks/useCRM';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const { purchaseOrders, vendors, syncLogs, handleTriggerSync, userRole, setSelectedPOId } = useCRM();
    const navigate = useNavigate();

    return (
        <ExecutiveDashboard
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            syncLogs={syncLogs}
            onTriggerSync={handleTriggerSync}
            isSyncing={false}
            onNavigateToTab={(tab) => {
                let path = '/dashboard';
                const routesMap = {
                    'purchase-orders': '/purchase-orders',
                    'vendors': '/sourcing-vendors',
                    'email-center': '/sourcing-email-hub',
                    'chat': '/workspace-team-chat',
                    'ai-assistant': '/sop-ai-assistant',
                    'reports': '/reports-analytics',
                    'system-admin': '/security-admin'
                };
                if (routesMap[tab]) path = routesMap[tab];

                if (tab !== 'purchase-orders') setSelectedPOId(null);
                navigate(path);
            }}
            onSelectPO={(id) => {
                setSelectedPOId(id);
                navigate('/purchase-orders');
            }}
            userRole={userRole}
        />
    );
}
