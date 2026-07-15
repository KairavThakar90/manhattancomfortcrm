import React, { useState } from 'react';
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
}

export default function VendorManagement({
  vendors,
  purchaseOrders,
  onUpdateVendor,
  onAddActivity,
}: VendorManagementProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editForm, setEditForm] = useState<Vendor | null>(null);

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
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
            <span>Sourcing Risk & Predictive Analytics</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing lead times, average delivery variations, and quality
            scores.
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          {vendors.map((vendor) => {
            const isHighRisk = vendor.performanceScore < 80;
            return (
              <div
                key={vendor.id}
                className={`px-3.5 py-2 rounded-xl text-xs border flex items-center gap-2 transition ${
                  isHighRisk
                    ? 'bg-rose-50 border-rose-100 text-rose-950 font-semibold'
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                }`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full ${isHighRisk ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}
                />
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase font-bold">
                    {vendor.id}
                  </span>
                  <span className="block text-xs font-semibold">
                    {vendor.name} ({vendor.performanceScore}%)
                  </span>
                </div>
                {isHighRisk && (
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-sm">
                    HIGH RISK
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier Directory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 text-base">
              Active Manufacturer Base
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {vendors.length} Onboarded Vendors
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`p-5 bg-white rounded-2xl border transition hover:shadow-md cursor-pointer flex flex-col justify-between h-48 ${
                    selectedVendorId === vendor.id
                      ? 'border-indigo-600 shadow-xs bg-indigo-50/5'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase tracking-wider">
                          {vendor.id}
                        </span>
                        <h3 className="font-display font-bold text-slate-900 text-sm mt-0.5">
                          {vendor.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                        <Star className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />
                        <span>{vendor.performanceScore}%</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-slate-600 font-medium">
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

                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div className="flex gap-3">
                      <span>
                        Orders:{' '}
                        <strong className="text-slate-800">
                          {poCount} Active
                        </strong>
                      </span>
                      {delayCount > 0 && (
                        <span className="text-rose-600 font-semibold">
                          {delayCount} Delayed
                        </span>
                      )}
                    </div>

                    <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden h-fit">
          {selectedVendor ? (
            <div className="divide-y divide-slate-100">
              {/* Profile Header */}
              <div className="p-6 bg-slate-50/60 flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider">
                    {selectedVendor.id}
                  </span>
                  <h3 className="font-display font-bold text-slate-900 text-base mt-2">
                    {selectedVendor.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Primary Manufacturing Sourcing Hub
                  </p>
                </div>

                <button
                  onClick={() => handleStartEdit(selectedVendor)}
                  className="p-2 hover:bg-white border border-slate-200 rounded-lg text-slate-600 shadow-xs transition"
                  title="Modify contact coordinates"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              {/* Contact Editing Form */}
              {isEditingContact && editForm ? (
                <form
                  onSubmit={handleSaveContact}
                  className="p-6 space-y-4 animate-fadeIn bg-indigo-50/10"
                >
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Modify Contact Coordinates
                  </h4>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editForm.contact}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contact: e.target.value })
                      }
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* Contact Coordinates Static Display */
                <div className="p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contact coordinates
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Account Manager:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedVendor.contact}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-slate-800 hover:underline cursor-pointer">
                        {selectedVendor.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Direct Phone:</span>
                      <span className="font-mono text-slate-800">
                        {selectedVendor.phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Hub Country:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedVendor.country}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Scorecard Stats */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sourcing Scorecard
                </h4>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Total Sourced POs
                    </span>
                    <strong className="text-lg font-bold text-slate-800 font-mono">
                      {selectedVendor.totalOrders} POs
                    </strong>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Avg Delivery Time
                    </span>
                    <strong className="text-lg font-bold text-slate-800 font-mono">
                      {selectedVendor.avgDeliveryDays} Days
                    </strong>
                  </div>
                </div>

                {/* Sourcing warning alerts if score is poor */}
                {selectedVendor.performanceScore < 80 ? (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-950 text-[11px] leading-relaxed">
                    <strong className="font-bold flex items-center gap-1">
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
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
                    <strong className="font-bold flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Fulfillment Metrics Healthy</span>
                    </strong>
                    Supplier maintains optimum standards. Deliveries correspond
                    securely to requested target S&OP margins.
                  </div>
                )}
              </div>

              {/* Vendor Specific active POs list */}
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Sourced Orders
                </h4>

                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {vendorPOs.map((po) => (
                    <div
                      key={po.id}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition"
                    >
                      <span className="font-bold font-mono text-slate-800">
                        {po.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          po.status === 'Delayed'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                  ))}
                  {vendorPOs.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
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
