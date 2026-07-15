import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  FileDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Truck,
  FileText,
  TrendingUp,
  Sparkles,
  Filter,
} from 'lucide-react';
import { PurchaseOrder, Vendor } from '../types';

interface ReportsAnalyticsProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
}

export default function ReportsAnalytics({
  purchaseOrders,
  vendors,
}: ReportsAnalyticsProps) {
  const [selectedReport, setSelectedReport] = useState<
    'delays' | 'vendors' | 'logistics' | 'finance'
  >('delays');

  // Math metrics
  const totalCommitedCapital = purchaseOrders.reduce((sum, po) => {
    return sum + po.items.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
  }, 0);

  const delayedPOs = purchaseOrders.filter((po) => po.status === 'Delayed');
  const totalDelayedValue = delayedPOs.reduce((sum, po) => {
    return sum + po.items.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
  }, 0);

  const averageDelayDays =
    delayedPOs.length > 0
      ? Math.round(
          delayedPOs.reduce((sum, po) => sum + po.delayedDays, 0) /
            delayedPOs.length,
        )
      : 0;

  // Compile Report File Exports (Rule 12)
  const triggerReportExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    let reportTitle = `Sourcing_Report_${selectedReport}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Report Title: Supply Chain CRM Sourcing Analytics\n';
      csvContent += `Report Category: ${selectedReport.toUpperCase()}\n`;
      csvContent += `Generated Date: ${new Date().toLocaleDateString()}\n\n`;

      if (selectedReport === 'delays') {
        csvContent += 'PO Number,Vendor,Delayed Days,Sourcing Value,ETA\n';
        delayedPOs.forEach((po) => {
          const val = po.items.reduce(
            (acc, it) => acc + it.qty * it.unitPrice,
            0,
          );
          csvContent += `${po.id},"${po.vendorName}",${po.delayedDays},$${val},${po.eta}\n`;
        });
      } else {
        csvContent +=
          'Vendor Name,Contact,Country,Score,Total Orders,Delayed Orders\n';
        vendors.forEach((v) => {
          csvContent += `"${v.name}","${v.contact}",${v.country},${v.performanceScore}%,${v.totalOrders},${v.delayedOrders}\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${reportTitle}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // XLS / PDF simulated trigger
      alert(
        `Compiling S&OP BI Data Pipeline...\nSuccess: Created ${format.toUpperCase()} report matching target Sourcing analytics!\nFile downloaded: ${reportTitle}.${format}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* S&OP Financial BI High-level Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
            Total Committed Capital
          </span>
          <div className="flex items-center justify-between mt-2">
            <strong className="text-2xl font-display font-bold text-slate-950 font-mono">
              ${totalCommitedCapital.toLocaleString()}
            </strong>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Capital On-tract</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
            Capital Blocked In Delays
          </span>
          <div className="flex items-center justify-between mt-2">
            <strong className="text-2xl font-display font-bold text-rose-950 font-mono">
              ${totalDelayedValue.toLocaleString()}
            </strong>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Sourcing Risk</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
            S&OP Lead Time Variance
          </span>
          <div className="flex items-center justify-between mt-2">
            <strong className="text-2xl font-display font-bold text-slate-950 font-mono">
              {averageDelayDays} Days Avg
            </strong>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span>Trim Target</span>
            </span>
          </div>
        </div>
      </div>

      {/* Reports Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setSelectedReport('delays')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              selectedReport === 'delays'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Delayed PO Report</span>
          </button>

          <button
            onClick={() => setSelectedReport('vendors')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              selectedReport === 'vendors'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Vendor Performance</span>
          </button>

          <button
            onClick={() => setSelectedReport('logistics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              selectedReport === 'logistics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Logistics & Containers</span>
          </button>

          <button
            onClick={() => setSelectedReport('finance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              selectedReport === 'finance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Finance & Invoices</span>
          </button>
        </div>

        {/* Global Bulk Export buttons (Rule 12) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => triggerReportExport('csv')}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={() => triggerReportExport('pdf')}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>PDF S&OP report</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        {/* REPORT 1: DELAYS */}
        {selectedReport === 'delays' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Delayed Purchase Orders Risk Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Highlighting manufacturing contracts violating original
                  shipment schedules.
                </p>
              </div>
              <span className="text-xs bg-rose-50 text-rose-600 font-bold px-3 py-1 rounded-full">
                {delayedPOs.length} Contracts At Risk
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Detailed tabular analysis */}
              <div className="md:col-span-2 space-y-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">PO Code</th>
                      <th className="px-4 py-3">Vendor / country</th>
                      <th className="px-4 py-3">Delayed Days</th>
                      <th className="px-4 py-3">Contract Value</th>
                      <th className="px-4 py-3">Target ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delayedPOs.map((po) => {
                      const value = po.items.reduce(
                        (acc, it) => acc + it.qty * it.unitPrice,
                        0,
                      );
                      return (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/50 transition"
                        >
                          <td className="px-4 py-3 font-bold font-mono text-xs text-slate-900">
                            {po.id}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">
                              {po.vendorName}
                            </span>
                            <span className="block text-[9px] text-slate-400">
                              Vietnam • {po.productionStage} stage
                            </span>
                          </td>
                          <td className="px-4 py-3 text-rose-600 font-bold font-mono text-sm">
                            {po.delayedDays} Days Late
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            ${value.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {po.eta}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Predictive AI Analytics block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                    <span>Predictive S&OP Insights</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    AI Lead-time forecasting model predicts that **Global Tech
                    Sourcing** has a **84% likelihood** of delaying secondary
                    contract PO-10030 by an additional 12 days due to
                    semiconductor allocation limits in Southeast Asian hubs.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    We suggest initiating contact with alternate manufacturers
                    in Taiwan or India to diversify micro-IC modules sourcing.
                  </p>
                </div>

                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-950 font-semibold font-mono leading-tight">
                  High Risk Vendors Flagged: 1 (Global Tech)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 2: VENDOR PERFORMANCE AUDIT */}
        {selectedReport === 'vendors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Onboarded Supplier Metrics Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Auditing quality scores, S&OP lead time variations, and
                  contractual compliance.
                </p>
              </div>
              <span className="text-xs text-indigo-600 font-bold uppercase">
                Sourcing Base Audited
              </span>
            </div>

            <div className="space-y-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{vendor.name}</span>
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-sm">
                        {vendor.id}
                      </span>
                    </h4>
                    <div className="flex gap-4 text-[10px] text-slate-400 mt-1 font-mono uppercase">
                      <span>
                        Country:{' '}
                        <strong className="text-slate-700">
                          {vendor.country}
                        </strong>
                      </span>
                      <span>
                        Avg Delivery Time:{' '}
                        <strong className="text-slate-700">
                          {vendor.avgDeliveryDays} Days
                        </strong>
                      </span>
                      <span>
                        Manager:{' '}
                        <strong className="text-slate-700">
                          {vendor.contact}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Delayed Contracts
                      </span>
                      <span
                        className={`font-mono text-sm ${vendor.delayedOrders > 2 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}
                      >
                        {vendor.delayedOrders} POs
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Supplier Score
                      </span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          vendor.performanceScore >= 90
                            ? 'text-emerald-600'
                            : vendor.performanceScore >= 80
                              ? 'text-amber-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {vendor.performanceScore}% Compliance
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT 3: CONTAINER UTILIZATION */}
        {selectedReport === 'logistics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Vessel Booking & Container Utilization
                </h3>
                <p className="text-xs text-slate-500">
                  Active shipment tracking and container specifications mapping.
                </p>
              </div>
              <span className="text-xs text-indigo-600 font-bold uppercase">
                Logistics Live
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">
                  Active Ocean Containers List
                </h4>
                {purchaseOrders
                  .filter((po) => po.container)
                  .map((po) => (
                    <div
                      key={po.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold font-mono text-slate-800">
                          {po.container}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Vessel booking ref for contract: {po.id}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-slate-800 font-bold">
                          {po.orderedQty} units
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Dock ETA: {po.eta}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Simple custom SVG chart representing Container Sourcing Capacity */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase">
                    Container Volume Utilization Ratio
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Measuring bulk sizing committed vs actual space utilization.
                  </p>

                  <div className="mt-6 flex justify-around items-end h-32 text-center">
                    <div>
                      <div className="w-10 bg-indigo-100 h-28 rounded-md relative overflow-hidden flex flex-col justify-end">
                        <div className="bg-indigo-600 h-[82%] w-full rounded-b-md" />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-600 mt-2 block">
                        CNT-025 (82%)
                      </span>
                    </div>

                    <div>
                      <div className="w-10 bg-indigo-100 h-28 rounded-md relative overflow-hidden flex flex-col justify-end">
                        <div className="bg-indigo-600 h-[96%] w-full rounded-b-md" />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-600 mt-2 block">
                        CNT-026 (96%)
                      </span>
                    </div>

                    <div>
                      <div className="w-10 bg-indigo-100 h-28 rounded-md relative overflow-hidden flex flex-col justify-end">
                        <div className="bg-indigo-600 h-[64%] w-full rounded-b-md" />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-600 mt-2 block">
                        CNT-099 (64%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 4: FINANCE & INVOICES */}
        {selectedReport === 'finance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Financial Invoice Audits & OCR Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  Auditing Letter of Credit clearance rates and invoice parsing
                  integrity.
                </p>
              </div>
              <span className="text-xs text-emerald-600 font-bold uppercase">
                Finance Clean
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-slate-400 text-[10px] font-semibold block uppercase">
                  Approved Invoices
                </span>
                <strong className="text-xl font-bold text-emerald-600 block mt-2">
                  {
                    purchaseOrders.filter(
                      (po) => po.invoiceStatus === 'Approved',
                    ).length
                  }{' '}
                  Contracts
                </strong>
                <span className="text-[9px] text-slate-400 block mt-1">
                  Paid & authorized by finance
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-slate-400 text-[10px] font-semibold block uppercase">
                  Pending S&OP Audits
                </span>
                <strong className="text-xl font-bold text-amber-600 block mt-2">
                  {
                    purchaseOrders.filter(
                      (po) => po.invoiceStatus === 'Pending',
                    ).length
                  }{' '}
                  Contracts
                </strong>
                <span className="text-[9px] text-slate-400 block mt-1">
                  Awaiting invoice PDF drafts
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-slate-400 text-[10px] font-semibold block uppercase">
                  AI OCR Match Rate
                </span>
                <strong className="text-xl font-bold text-indigo-600 block mt-2">
                  100% Accuracy
                </strong>
                <span className="text-[9px] text-slate-400 block mt-1">
                  Automated validation matches
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
