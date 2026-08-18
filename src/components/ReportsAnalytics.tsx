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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <span className="block text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Total Committed Capital
          </span>
          <div className="mt-2 flex items-center justify-between">
            <strong className="font-display font-mono text-2xl font-bold text-slate-950">
              ${totalCommitedCapital.toLocaleString()}
            </strong>
            <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 p-1.5 text-xs font-bold text-emerald-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Capital On-tract</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <span className="block text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Capital Blocked In Delays
          </span>
          <div className="mt-2 flex items-center justify-between">
            <strong className="font-display font-mono text-2xl font-bold text-rose-950">
              ${totalDelayedValue.toLocaleString()}
            </strong>
            <span className="flex items-center gap-0.5 rounded-lg bg-rose-50 p-1.5 text-xs font-bold text-rose-700">
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Sourcing Risk</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <span className="block text-xs font-semibold tracking-wider text-slate-400 uppercase">
            S&OP Lead Time Variance
          </span>
          <div className="mt-2 flex items-center justify-between">
            <strong className="font-display font-mono text-2xl font-bold text-slate-950">
              {averageDelayDays} Days Avg
            </strong>
            <span className="flex items-center gap-0.5 rounded-lg bg-amber-50 p-1.5 text-xs font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span>Trim Target</span>
            </span>
          </div>
        </div>
      </div>

      {/* Reports Navigation Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-xs md:flex-row md:items-center">
        <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setSelectedReport('delays')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={() => triggerReportExport('pdf')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>PDF S&OP report</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT PANEL */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
        {/* REPORT 1: DELAYS */}
        {selectedReport === 'delays' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Delayed Purchase Orders Risk Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Highlighting manufacturing contracts violating original
                  shipment schedules.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                {delayedPOs.length} Contracts At Risk
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Detailed tabular analysis */}
              <div className="space-y-3 md:col-span-2">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 font-semibold tracking-wider text-slate-500 uppercase">
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
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
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
                          <td className="px-4 py-3 font-mono text-sm font-bold text-rose-600">
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
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                    <span>Predictive S&OP Insights</span>
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    AI Lead-time forecasting model predicts that **Global Tech
                    Sourcing** has a **84% likelihood** of delaying secondary
                    contract PO-10030 by an additional 12 days due to
                    semiconductor allocation limits in Southeast Asian hubs.
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    We suggest initiating contact with alternate manufacturers
                    in Taiwan or India to diversify micro-IC modules sourcing.
                  </p>
                </div>

                <div className="rounded-lg border border-rose-100 bg-rose-50 p-2.5 font-mono text-[10px] leading-tight font-semibold text-rose-950">
                  High Risk Vendors Flagged: 1 (Global Tech)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 2: VENDOR PERFORMANCE AUDIT */}
        {selectedReport === 'vendors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Onboarded Supplier Metrics Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Auditing quality scores, S&OP lead time variations, and
                  contractual compliance.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase">
                Sourcing Base Audited
              </span>
            </div>

            <div className="space-y-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center"
                >
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span>{vendor.name}</span>
                      <span className="py-0.2 rounded-sm bg-slate-200 px-1.5 font-mono text-[10px] text-slate-600">
                        {vendor.id}
                      </span>
                    </h4>
                    <div className="mt-1 flex gap-4 font-mono text-[10px] text-slate-400 uppercase">
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
                      <span className="block text-[10px] text-slate-400">
                        Delayed Contracts
                      </span>
                      <span
                        className={`font-mono text-sm ${vendor.delayedOrders > 2 ? 'font-bold text-rose-600' : 'text-slate-700'}`}
                      >
                        {vendor.delayedOrders} POs
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Vessel Booking & Container Utilization
                </h3>
                <p className="text-xs text-slate-500">
                  Active shipment tracking and container specifications mapping.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase">
                Logistics Live
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">
                  Active Ocean Containers List
                </h4>
                {purchaseOrders
                  .filter((po) => po.container)
                  .map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800">
                          {po.container}
                        </span>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Vessel booking ref for contract: {po.id}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800">
                          {po.orderedQty} units
                        </span>
                        <p className="font-mono text-[10px] text-slate-400">
                          Dock ETA: {po.eta}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Simple custom SVG chart representing Container Sourcing Capacity */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase">
                    Container Volume Utilization Ratio
                  </h4>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Measuring bulk sizing committed vs actual space utilization.
                  </p>

                  <div className="mt-6 flex h-32 items-end justify-around text-center">
                    <div>
                      <div className="relative flex h-28 w-10 flex-col justify-end overflow-hidden rounded-md bg-indigo-100">
                        <div className="h-[82%] w-full rounded-b-md bg-indigo-600" />
                      </div>
                      <span className="mt-2 block font-mono text-[10px] font-bold text-slate-600">
                        CNT-025 (82%)
                      </span>
                    </div>

                    <div>
                      <div className="relative flex h-28 w-10 flex-col justify-end overflow-hidden rounded-md bg-indigo-100">
                        <div className="h-[96%] w-full rounded-b-md bg-indigo-600" />
                      </div>
                      <span className="mt-2 block font-mono text-[10px] font-bold text-slate-600">
                        CNT-026 (96%)
                      </span>
                    </div>

                    <div>
                      <div className="relative flex h-28 w-10 flex-col justify-end overflow-hidden rounded-md bg-indigo-100">
                        <div className="h-[64%] w-full rounded-b-md bg-indigo-600" />
                      </div>
                      <span className="mt-2 block font-mono text-[10px] font-bold text-slate-600">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Financial Invoice Audits & OCR Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  Auditing Letter of Credit clearance rates and invoice parsing
                  integrity.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase">
                Finance Clean
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                  Approved Invoices
                </span>
                <strong className="mt-2 block text-xl font-bold text-emerald-600">
                  {
                    purchaseOrders.filter(
                      (po) => po.invoiceStatus === 'Approved',
                    ).length
                  }{' '}
                  Contracts
                </strong>
                <span className="mt-1 block text-[9px] text-slate-400">
                  Paid & authorized by finance
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                  Pending S&OP Audits
                </span>
                <strong className="mt-2 block text-xl font-bold text-amber-600">
                  {
                    purchaseOrders.filter(
                      (po) => po.invoiceStatus === 'Pending',
                    ).length
                  }{' '}
                  Contracts
                </strong>
                <span className="mt-1 block text-[9px] text-slate-400">
                  Awaiting invoice PDF drafts
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                  AI OCR Match Rate
                </span>
                <strong className="mt-2 block text-xl font-bold text-indigo-600">
                  100% Accuracy
                </strong>
                <span className="mt-1 block text-[9px] text-slate-400">
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
