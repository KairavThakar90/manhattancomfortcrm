import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  getPurchaseOrderById,
  updatePOStatus,
} from '../features/purchaseOrders/services/purchaseOrder.service';
import {
  Users,
  User,
  Mail,
  Phone,
  Globe,
  Star,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Calendar,
  Edit2,
  X,
  Check,
  Eye,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';
import { Vendor, PurchaseOrder } from '../types';

interface VendorManagementProps {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  onUpdateVendor: (updated: Vendor) => void;
  onAddActivity: (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => void;
  onUpdatePO?: (updatedPo: PurchaseOrder) => void;
}

export default function VendorManagement({
  vendors,
  purchaseOrders,
  onUpdateVendor,
  onAddActivity,
  onUpdatePO,
}: VendorManagementProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editForm, setEditForm] = useState<Vendor | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(
    null,
  );

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Active POs for selected vendor
  const vendorPOs = purchaseOrders.filter(
    (po) => po.vendorId === selectedVendorId,
  );

  // Open Edit Form
  const handleStartEdit = (vendor: Vendor) => {
    setEditForm({ ...vendor });
    setIsEditingContact(true);
  };

  // Save Contact Edits
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    onUpdateVendor(editForm);
    onAddActivity(
      `Updated contact info for supplier ${editForm.name}`,
      'PO Updated',
    );
    setIsEditingContact(false);
    setEditForm(null);
  };

  return (
    <div className="space-y-6">
      {/* Risk Sourcing Intelligence Bar - PREDICTIVE ANALYTICS */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs md:flex-row md:items-center">
        <div>
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-900">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
            <span>Sourcing Risk & Predictive Analytics</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Analyzing lead times, average delivery variations, and quality
            scores.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {vendors.map((vendor) => {
            const isHighRisk = vendor.performanceScore < 80;
            return (
              <div
                key={vendor.id}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs transition ${
                  isHighRisk
                    ? 'border-rose-100 bg-rose-50 font-semibold text-rose-950'
                    : 'border-emerald-100 bg-emerald-50/50 text-emerald-950'
                }`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full ${isHighRisk ? 'animate-pulse bg-rose-500' : 'bg-emerald-500'}`}
                />
                <div>
                  <span className="block font-mono text-[10px] font-bold text-slate-400 uppercase">
                    {vendor.id}
                  </span>
                  <span className="block text-xs font-semibold">
                    {vendor.name} ({vendor.performanceScore}%)
                  </span>
                </div>
                {isHighRisk && (
                  <span className="rounded-sm bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    HIGH RISK
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Supplier Directory List */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              Active Manufacturer Base
            </h2>
            <span className="font-mono text-xs text-slate-500">
              {vendors.length} Onboarded Vendors
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {vendors.map((vendor) => {
              const poCount = purchaseOrders.filter(
                (po) => po.vendorId === vendor.id,
              ).length;
              const delayCount = purchaseOrders.filter(
                (po) => po.vendorId === vendor.id && po.status === 'Delayed',
              ).length;

              return (
                <div
                  key={vendor.id}
                  onClick={() => {
                    setSelectedVendorId(vendor.id);
                    setIsEditingContact(false);
                  }}
                  className={`flex h-48 cursor-pointer flex-col justify-between rounded-2xl border bg-white p-5 transition hover:shadow-md ${
                    selectedVendorId === vendor.id
                      ? 'border-indigo-600 bg-indigo-50/5 shadow-xs'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold tracking-wider text-indigo-600 uppercase">
                          {vendor.id}
                        </span>
                        <h3 className="font-display mt-0.5 text-sm font-bold text-slate-900">
                          {vendor.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                        <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                        <span>{vendor.performanceScore}%</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium text-slate-600">
                          {vendor.contact}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <Globe className="h-3.5 w-3.5" />
                        <span>
                          Sourcing Hub: <strong>{vendor.country}</strong>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] font-medium text-slate-500">
                    <div className="flex gap-3">
                      <span>
                        Orders:{' '}
                        <strong className="text-slate-800">
                          {poCount} Active
                        </strong>
                      </span>
                      {delayCount > 0 && (
                        <span className="font-semibold text-rose-600">
                          {delayCount} Delayed
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-0.5 font-semibold text-indigo-600">
                      <span>Inspect Profile</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Vendor Profile Details Drawer */}
        <div className="h-fit overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
          {selectedVendor ? (
            <div className="divide-y divide-slate-100">
              {/* Profile Header */}
              <div className="flex items-start justify-between bg-slate-50/60 p-6">
                <div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                    {selectedVendor.id}
                  </span>
                  <h3 className="font-display mt-2 text-base font-bold text-slate-900">
                    {selectedVendor.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Primary Manufacturing Sourcing Hub
                  </p>
                </div>

                <button
                  onClick={() => handleStartEdit(selectedVendor)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 shadow-xs transition hover:bg-white"
                  title="Modify contact coordinates"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              {/* Contact Editing Form */}
              {isEditingContact && editForm ? (
                <form
                  onSubmit={handleSaveContact}
                  className="animate-fadeIn space-y-4 bg-indigo-50/10 p-6"
                >
                  <h4 className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                    Modify Contact Coordinates
                  </h4>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editForm.contact}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contact: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* Contact Coordinates Static Display */
                <div className="space-y-4 p-6">
                  <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Contact coordinates
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400">Account Manager:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedVendor.contact}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400">Email:</span>
                      <span className="cursor-pointer font-mono text-slate-800 hover:underline">
                        {selectedVendor.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400">Direct Phone:</span>
                      <span className="font-mono text-slate-800">
                        {selectedVendor.phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400">Hub Country:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedVendor.country}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Scorecard Stats */}
              <div className="space-y-4 p-6">
                <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Sourcing Scorecard
                </h4>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Total Sourced POs
                    </span>
                    <strong className="font-mono text-lg font-bold text-slate-800">
                      {selectedVendor.totalOrders} POs
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Avg Delivery Time
                    </span>
                    <strong className="font-mono text-lg font-bold text-slate-800">
                      {selectedVendor.avgDeliveryDays} Days
                    </strong>
                  </div>
                </div>

                {/* Sourcing warning alerts if score is poor */}
                {selectedVendor.performanceScore < 80 ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-950">
                    <strong className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Action Recommended: Risk Level High</span>
                    </strong>
                    Sourcing performance has fallen to{' '}
                    <strong className="font-mono font-semibold">
                      {selectedVendor.performanceScore}%
                    </strong>{' '}
                    due to multiple production delays. Consider preparing
                    alternative sourcing paths or contract audits.
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-950">
                    <strong className="flex items-center gap-1 font-bold">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Fulfillment Metrics Healthy</span>
                    </strong>
                    Supplier maintains optimum standards. Deliveries correspond
                    securely to requested target S&OP margins.
                  </div>
                )}
              </div>

              {/* Vendor Specific active POs list */}
              <div className="space-y-3 p-6">
                <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Active Sourced Orders
                </h4>

                <div className="max-h-[160px] space-y-2 overflow-y-auto">
                  {vendorPOs.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs transition hover:bg-slate-100"
                    >
                      <span className="font-mono font-bold text-slate-800">
                        {po.id}
                      </span>
                      <select
                        className={`cursor-pointer rounded-md border-0 px-2 py-0.5 text-[9px] font-bold outline-hidden focus:ring-2 focus:ring-indigo-500 ${po.status === 'Delayed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-200 text-slate-600'} ${isUpdatingStatusId === po.id ? 'opacity-50' : ''} `}
                        value={
                          ['New', 'NEW'].includes(po.status as string)
                            ? 'NEW'
                            : [
                                  'Production',
                                  'In Production',
                                  'IN_PRODUCTION',
                                ].includes(po.status as string)
                              ? 'IN_PRODUCTION'
                              : ['Ready to Ship', 'READY_TO_SHIP'].includes(
                                    po.status as string,
                                  )
                                ? 'READY_TO_SHIP'
                                : ['In Transit', 'IN_TRANSIT'].includes(
                                      po.status as string,
                                    )
                                  ? 'IN_TRANSIT'
                                  : ['Delivered', 'DELIVERED'].includes(
                                        po.status as string,
                                      )
                                    ? 'DELIVERED'
                                    : ['Delayed', 'DELAYED'].includes(
                                          po.status as string,
                                        )
                                      ? 'DELAYED'
                                      : (po.status as string)
                        }
                        disabled={isUpdatingStatusId === po.id}
                        onChange={async (e) => {
                          const apiToDisplayMap: Record<string, string> = {
                            NEW: 'New',
                            IN_PRODUCTION: 'Production',
                            READY_TO_SHIP: 'Ready to Ship',
                            IN_TRANSIT: 'In Transit',
                            DELIVERED: 'Delivered',
                            DELAYED: 'Delayed',
                          };

                          const newApiStatus = e.target.value;
                          const newDisplayStatus =
                            apiToDisplayMap[newApiStatus] || newApiStatus;
                          setIsUpdatingStatusId(po.id);
                          try {
                            const dbId = po.uuid || po.id.replace(/^PO-/i, '');

                            // 1. Update Status via /Status endpoint
                            await updatePOStatus(dbId, newApiStatus);

                            // 2. Set the status current directly in the selected PO item
                            const frontendUpdatedPO = {
                              ...po,
                              status: newApiStatus,
                            };

                            if (onUpdatePO) {
                              onUpdatePO(frontendUpdatedPO);
                            }

                            onAddActivity(
                              `Updated PO ${po.id} status to ${newDisplayStatus}`,
                              'PO Updated',
                            );
                            toast.success(
                              `PO ${po.id} status verified and updated!`,
                            );
                          } catch (err: any) {
                            console.error(err);
                            toast.error(
                              `Failed to update status: ${err.message}`,
                            );
                          } finally {
                            setIsUpdatingStatusId(null);
                          }
                        }}
                      >
                        <option value="NEW">New</option>
                        <option value="IN_PRODUCTION">Production</option>
                        <option value="READY_TO_SHIP">Ready to Ship</option>
                        <option value="IN_TRANSIT">In Transit</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="DELAYED">Delayed</option>
                      </select>
                    </div>
                  ))}
                  {vendorPOs.length === 0 && (
                    <p className="py-2 text-center text-xs text-slate-400 italic">
                      No active sourced orders found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 italic">
              Select a Supplier from directory listing to view dedicated profile
              audits.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
