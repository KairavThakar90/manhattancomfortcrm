import React from 'react';
import ReportsAnalytics from '../components/ReportsAnalytics';
import { useCRM } from '../hooks/useCRM';

export default function ReportsPage() {
  const { purchaseOrders, vendors } = useCRM();

  return <ReportsAnalytics purchaseOrders={purchaseOrders} vendors={vendors} />;
}
