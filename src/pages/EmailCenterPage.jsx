import React from 'react';
import EmailCenter from '../components/EmailCenter';
import { useCRM } from '../hooks/useCRM';

export default function EmailCenterPage() {
  const {
    emailLogs,
    purchaseOrders,
    vendors,
    handleAddEmailLog,
    handleAddActivity,
  } = useCRM();

  return (
    <EmailCenter
      emails={emailLogs}
      purchaseOrders={purchaseOrders}
      vendors={vendors}
      onAddEmailLog={handleAddEmailLog}
      onAddActivity={handleAddActivity}
    />
  );
}
