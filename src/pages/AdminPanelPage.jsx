import React from 'react';
import AdminPanel from '../components/AdminPanel';
import { useCRM } from '../hooks/useCRM';

export default function AdminPanelPage() {
    const { activityLogs, auditLogs, syncLogs, userRole, setUserRole, handleAddActivity, handleTriggerSync } = useCRM();

    return (
        <AdminPanel
            activityLogs={activityLogs}
            auditLogs={auditLogs}
            syncLogs={syncLogs}
            userRole={userRole}
            onChangeUserRole={setUserRole}
            onAddActivity={handleAddActivity}
            onTriggerSync={handleTriggerSync}
        />
    );
}
