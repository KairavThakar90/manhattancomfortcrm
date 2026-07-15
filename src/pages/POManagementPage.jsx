import React from 'react';
import POManagement from '../components/POManagement';
import { useCRM } from '../hooks/useCRM';

export default function POManagementPage() {
  const {
    purchaseOrders,
    vendors,
    comments,
    emailLogs,
    userRole,
    selectedPOId,
    setSelectedPOId,
    handleUpdatePOs,
    handleAddComment,
    handleAddEmailLog,
    handleAddActivity,
    handleAddAudit,
  } = useCRM();

  return (
    <POManagement
      purchaseOrders={purchaseOrders}
      vendors={vendors}
      comments={comments}
      emails={emailLogs}
      userRole={userRole}
      selectedPOId={selectedPOId}
      onSelectPO={setSelectedPOId}
      onUpdatePO={(po) => {
        const updated = purchaseOrders.map((p) => (p.id === po.id ? po : p));
        handleUpdatePOs(updated);
      }}
      onAddComment={handleAddComment}
      onAddEmailLog={handleAddEmailLog}
      onAddActivity={handleAddActivity}
      onAddAudit={handleAddAudit}
    />
  );
}
