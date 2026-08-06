import React from 'react';
import VendorManagement from '../components/VendorManagement';
import { useCRM } from '../hooks/useCRM';

export default function VendorManagementPage() {
  const {
    vendors,
    purchaseOrders,
    handleUpdateVendors,
    handleAddActivity,
    handleUpdatePOs,
  } = useCRM();

  return (
    <VendorManagement
      vendors={vendors}
      purchaseOrders={purchaseOrders}
      onUpdateVendor={handleUpdateVendors}
      onAddActivity={handleAddActivity}
      onUpdatePO={(po) => {
        const updated = purchaseOrders.map((p) => (p.id === po.id ? po : p));
        handleUpdatePOs(updated);
      }}
    />
  );
}
