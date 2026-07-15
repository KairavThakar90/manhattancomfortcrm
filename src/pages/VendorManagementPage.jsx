import React from 'react';
import VendorManagement from '../components/VendorManagement';
import { useCRM } from '../hooks/useCRM';

export default function VendorManagementPage() {
    const { vendors, purchaseOrders, handleUpdateVendors, handleAddActivity } = useCRM();

    return (
        <VendorManagement
            vendors={vendors}
            purchaseOrders={purchaseOrders}
            onUpdateVendor={handleUpdateVendors}
            onAddActivity={handleAddActivity}
        />
    );
}
