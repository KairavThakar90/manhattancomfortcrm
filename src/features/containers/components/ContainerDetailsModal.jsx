import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  X,
  Calendar,
  Package,
  CheckCircle2,
  ExternalLink,
  Copy,
  Truck,
  Edit2,
  Save,
  Loader2,
  FileUp,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { updateContainer } from '../services/container.service';
import { Tooltip } from 'react-tooltip';
import DataTable from '../../../components/common/DataTable';
import Pagination from '../../../components/common/Pagination';
import DateFilterInput from '../../../components/common/DateFilterInput';
import Select from 'react-select';
import countryList from 'react-select-country-list';

export default function ContainerDetailsModal({
  container,
  isLoading = false,
  onClose,
  onRefresh,
}) {
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [trackingData, setTrackingData] = useState({});
  const [prevContainer, setPrevContainer] = useState(null);
  const countryOptions = useMemo(() => countryList().getData(), []);

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#f8fafc',
      borderColor: state.isFocused ? '#151717' : '#e2e8f0',
      borderRadius: '0.5rem',
      padding: '0',
      minHeight: '38px',
      fontSize: '0.875rem',
      boxShadow: state.isFocused ? '0 0 0 1px #151717' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#151717' : '#cbd5e1',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 12px',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8',
      fontSize: '0.875rem',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1e293b',
      fontSize: '0.875rem',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#F4EFE8'
        : state.isFocused
          ? '#f8fafc'
          : 'white',
      color: state.isSelected ? '#151717' : '#334155',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '8px 12px',
      '&:active': {
        backgroundColor: '#F4EFE8',
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  if (container !== prevContainer) {
    setPrevContainer(container);
    if (container) {
      let cName =
        container.container_name ||
        container.name ||
        container.container_number ||
        '';
      if (cName === 'undefined') cName = '';

      setTrackingData({
        container_name: cName,
        door: container.door || '',
        date_dropped_off: container.date_dropped_off
          ? container.date_dropped_off.split('T')[0]
          : '',
        date_emptied: container.date_emptied
          ? container.date_emptied.split('T')[0]
          : '',
        unloaded_by: container.unloaded_by || '',
        country_of_origin: container.country_of_origin || '',
        unload_cost: container.unload_cost || '',
        container_cost_drayage: container.container_cost_drayage || '',
        customs_duty_misc: container.customs_duty_misc || '',
        per_diem: container.per_diem || '',
        factory_credit_needed: container.factory_credit_needed || '',
        receiving_closure_notes: container.receiving_closure_notes || '',
        attachmentsToUpload: [],
      });
    }
  }

  const handleSaveTracking = async () => {
    setEmailError('');
    const currentUserRole = String(
      localStorage.getItem('userRole'),
    ).toLowerCase();
    if (
      (currentUserRole === 'warehouse' ||
        currentUserRole === 'administrator') &&
      trackingData.date_emptied &&
      !trackingData.notification_email
    ) {
      setEmailError('Email is required when Date Emptied is specified.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...trackingData,
      };
      let pName =
        trackingData.container_name ||
        container.name ||
        container.container_number ||
        '';
      if (pName === 'undefined') pName = '';
      payload.name = pName;
      [
        'unload_cost',
        'container_cost_drayage',
        'customs_duty_misc',
        'per_diem',
      ].forEach((k) => {
        if (payload[k]) {
          payload[k] = parseFloat(payload[k]);
        } else {
          payload[k] = 0;
        }
      });
      ['date_dropped_off', 'date_emptied'].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });

      const finalPayload = new FormData();
      const { attachmentsToUpload, attachment, ...restPayload } = payload;

      // The API expects the JSON data as a stringified object under 'container_data'
      finalPayload.append('container_data', JSON.stringify(restPayload));

      // Re-add root level property appends for standard DRF MultiPartParsers
      Object.keys(restPayload).forEach((key) => {
        if (restPayload[key] !== null && restPayload[key] !== undefined) {
          finalPayload.append(key, restPayload[key]);
        }
      });

      // The API expects the files under the 'files' key if available
      if (attachmentsToUpload && attachmentsToUpload.length > 0) {
        attachmentsToUpload.forEach((file) => {
          finalPayload.append('files', file);
        });
      }

      const options = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      await updateContainer(container.id, finalPayload, options);
      toast.success('Tracking details updated successfully');
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error('Failed to update tracking details');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrackingChange = (field, value) => {
    if (field === 'notification_email' && emailError) {
      setEmailError('');
    }
    setTrackingData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendEmail = () => {
    if (!trackingData.notification_email) {
      toast.error('Email is required');
      return;
    }
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      toast.success('Email sent successfully!');
    }, 1200);
  };

  if (!container) return null;

  const allItems = container.details || [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * itemsPageSize,
    itemsPage * itemsPageSize,
  );

  console.log('container.name', container.name);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="animate-in fade-in zoom-in-95 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-mc-beige-light text-mc-black flex h-10 w-10 items-center justify-center rounded-lg">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg leading-tight font-bold text-slate-800">
                  Container Details
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <span>
                      {container.sellercloud_container_id || 'Unnamed'}
                      {(container.name ||
                        container.container_name ||
                        container.container_number) &&
                      (container.name ||
                        container.container_name ||
                        container.container_number) !== container.id &&
                      (container.name ||
                        container.container_name ||
                        container.container_number) !== 'undefined'
                        ? ` (${container.name || container.container_name || container.container_number})`
                        : ''}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        container.is_received
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {container.is_received ? 'Received' : 'In Transit'}
                    </span>
                    {container.is_received &&
                      container.received_date &&
                      container.received_date !== 'N/A' && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {String(container.received_date).split('T')[0]}
                            </span>
                          </span>
                        </>
                      )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {container.sellercloud_link &&
                localStorage.getItem('userRole') !== 'Vendor' && (
                  <button
                    onClick={() =>
                      window.open(container.sellercloud_link, '_blank')
                    }
                    className="text-mc-black mr-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Sellercloud
                  </button>
                )}
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/50">
            <button
              className={`flex-1 border-b-2 py-3 text-center text-xs font-bold transition ${activeTab === 'details' ? 'border-mc-gold text-mc-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`flex-1 border-b-2 py-3 text-center text-xs font-bold transition ${activeTab === 'comments' ? 'border-mc-gold text-mc-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              onClick={() => setActiveTab('comments')}
            >
              {String(localStorage.getItem('userRole')).toLowerCase() ===
              'warehouse'
                ? 'Container Tracking Information'
                : 'Container Tracking & Financial Information'}
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
            {activeTab === 'details' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="mb-8 grid shrink-0 grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-4 shadow-xs">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <Calendar className="text-mc-black h-3.5 w-3.5" />
                      Arrival Date
                    </p>
                    <p className="text-base font-bold text-slate-800">
                      {container.arrivalDate || 'Pending'}
                    </p>
                  </div>

                  <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-4 shadow-xs">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <Package className="text-mc-black h-3.5 w-3.5" />
                      Total Item
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-800">
                        {totalItems}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        units
                      </span>
                    </div>
                  </div>

                  <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-4 shadow-xs">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <CheckCircle2 className="text-mc-black h-3.5 w-3.5 flex-shrink-0" />
                      Status
                    </p>
                    <div className="mt-1 inline-flex">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${container.is_received ? 'border border-emerald-200 bg-emerald-100 text-emerald-700' : 'border border-amber-200 bg-amber-100 text-amber-700'}`}
                      >
                        {container.is_received ? 'Received' : 'In Transit'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-mc-beige-dark bg-mc-white mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
                  <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
                    <h4 className="text-mc-black shrink-0 text-xs font-extrabold tracking-wider uppercase">
                      Allocated Items
                    </h4>
                  </div>

                  {allItems.length > 0 || isLoading ? (
                    <>
                      <DataTable
                        isLoading={isLoading}
                        columns={[
                          {
                            header: 'VENDOR NAME',
                            accessor: 'vendor_name',
                            headerClassName: 'px-3 py-2 w-1/3 bg-white',
                            className: 'px-3 py-2 max-w-[120px]',
                            render: (item) => (
                              <span className="block truncate font-mono font-bold text-slate-500">
                                {item.vendor_name || 'N/A'}
                              </span>
                            ),
                          },
                          {
                            header: 'SKU',
                            accessor: 'sku',
                            headerClassName: 'px-3 py-2 bg-white w-40',
                            className:
                              'px-3 py-2 min-w-[140px] whitespace-nowrap',
                            render: (item) => (
                              <div
                                className="group flex cursor-pointer items-center gap-1.5"
                                onClick={() => {
                                  if (item.sku) {
                                    navigator.clipboard.writeText(item.sku);
                                    toast.success('SKU copied to clipboard!');
                                  }
                                }}
                              >
                                <span
                                  className="text-mc-black group-hover:text-mc-gold font-bold whitespace-nowrap transition-colors"
                                  data-tooltip-id="sku-tooltip"
                                  data-tooltip-content={item.sku || 'N/A'}
                                >
                                  {item.sku || '-'}
                                </span>
                                {item.sku && (
                                  <Copy className="group-hover:text-mc-gold h-3.5 w-3.5 text-slate-400 transition-colors" />
                                )}
                              </div>
                            ),
                          },
                          {
                            header: 'PRODUCT NAME',
                            accessor: 'product_name',
                            headerClassName: 'px-3 py-2 bg-white',
                            className: 'px-3 py-2 max-w-[150px]',
                            render: (item) => {
                              const name =
                                item.product_name || item.name || '-';
                              const displayName =
                                name.length > 25
                                  ? name.substring(0, 25) + '...'
                                  : name;
                              return (
                                <span
                                  className="cursor-pointer font-medium text-slate-800"
                                  data-tooltip-id="sku-tooltip"
                                  data-tooltip-content={name}
                                >
                                  {displayName}
                                </span>
                              );
                            },
                          },
                          {
                            header: 'QTY ASSIGNED',
                            accessor: 'qty',
                            headerClassName:
                              'px-3 py-2 text-right w-32 bg-white',
                            className:
                              'px-3 py-2 text-right font-mono font-medium',
                            render: (item) =>
                              item.qty_in_container || item.qty || 0,
                          },
                        ]}
                        data={paginatedItems}
                        keyField="product_name"
                        defaultThClassName="px-6 py-3 bg-transparent"
                        theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
                        tableClassName="w-full text-left text-xs border-collapse"
                        tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
                        trClassName="hover:bg-mc-beige-light/30 bg-mc-white transition-colors"
                        containerClassName="overflow-x-auto overflow-y-auto flex-1 min-h-0 rounded-lg"
                        tableWrapperClassName=""
                      />
                      {totalItems > 5 && (
                        <div className="border-mc-beige-dark bg-mc-white mt-3 rounded-xl border p-1 shadow-sm">
                          <Pagination
                            currentPage={itemsPage}
                            totalCount={totalItems}
                            pageSize={itemsPageSize}
                            onPageChange={(pg) => setItemsPage(pg)}
                            onPageSizeChange={(size) => {
                              setItemsPageSize(size);
                              setItemsPage(1);
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                        <Package className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="mb-1 font-medium text-slate-500">
                        No items allocated
                      </p>
                      <p className="max-w-sm text-sm text-slate-400">
                        This container currently does not have any purchase
                        order items assigned to it.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="mt-8 mb-4 px-2">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Container Name
                      </label>
                      <input
                        type="text"
                        disabled
                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 opacity-60 transition-colors focus:outline-none"
                        value={trackingData.container_name || ''}
                        placeholder="e.g. CAAU1234567"
                        onChange={(e) =>
                          handleTrackingChange('container_name', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Door
                      </label>
                      <input
                        type="text"
                        disabled={
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'warehouse' &&
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'administrator'
                        }
                        className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:outline-none ${
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'warehouse' &&
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'administrator'
                            ? 'cursor-not-allowed bg-slate-100 text-slate-500 opacity-60'
                            : 'focus:border-mc-black focus:ring-mc-black bg-slate-50 focus:ring-1'
                        }`}
                        value={trackingData.door || ''}
                        placeholder="e.g. Door 4"
                        onChange={(e) =>
                          handleTrackingChange('door', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Date Dropped Off
                      </label>
                      <DateFilterInput
                        value={trackingData.date_dropped_off || ''}
                        onChange={(val) =>
                          handleTrackingChange('date_dropped_off', val)
                        }
                        title="Date Dropped Off"
                        disabled={
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'warehouse' &&
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'administrator'
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Date Emptied
                      </label>
                      <DateFilterInput
                        value={trackingData.date_emptied || ''}
                        onChange={(val) =>
                          handleTrackingChange('date_emptied', val)
                        }
                        title="Date Emptied"
                        disabled={
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'warehouse' &&
                          String(
                            localStorage.getItem('userRole'),
                          ).toLowerCase() !== 'administrator'
                        }
                        className="w-full"
                      />
                    </div>
                    {(String(localStorage.getItem('userRole')).toLowerCase() ===
                      'warehouse' ||
                      String(localStorage.getItem('userRole')).toLowerCase() ===
                        'administrator') &&
                      trackingData.date_emptied && (
                        <div className="mt-2 border-t border-slate-100 pt-4 sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Notify Email (Required){' '}
                            <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="email"
                              required
                              value={trackingData.notification_email || ''}
                              onChange={(e) =>
                                handleTrackingChange(
                                  'notification_email',
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. manager@manhattancomfort.com"
                              className={`focus:ring-mc-black min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none ${
                                emailError
                                  ? 'border-rose-500 bg-rose-50 focus:border-rose-500'
                                  : 'focus:border-mc-black border-slate-200 bg-slate-50'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleSendEmail}
                              disabled={
                                !trackingData.notification_email ||
                                isSendingEmail
                              }
                              className="bg-mc-gold text-mc-black shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-50"
                            >
                              {isSendingEmail ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                  Sending...
                                </span>
                              ) : (
                                'Send Mail'
                              )}
                            </button>
                          </div>
                          {emailError && (
                            <p className="mt-1.5 text-[10px] font-bold text-rose-500">
                              {emailError}
                            </p>
                          )}
                        </div>
                      )}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Unloaded By
                      </label>
                      <input
                        type="text"
                        className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                        value={trackingData.unloaded_by || ''}
                        placeholder="e.g. John Doe"
                        onChange={(e) =>
                          handleTrackingChange('unloaded_by', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Country Of Origin
                      </label>
                      <Select
                        value={
                          countryOptions.find(
                            (c) =>
                              c.label === trackingData.country_of_origin ||
                              c.value === trackingData.country_of_origin,
                          ) || null
                        }
                        onChange={(option) =>
                          handleTrackingChange(
                            'country_of_origin',
                            option ? option.label : '',
                          )
                        }
                        options={countryOptions}
                        styles={reactSelectStyles}
                        placeholder="Select country"
                        isSearchable
                        isClearable
                        menuPortalTarget={document.body}
                      />
                    </div>
                    {String(localStorage.getItem('userRole')).toLowerCase() !==
                      'warehouse' && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Unload Cost
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                              value={trackingData.unload_cost || ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleTrackingChange(
                                  'unload_cost',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Container Cost Drayage
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                              value={trackingData.container_cost_drayage || ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleTrackingChange(
                                  'container_cost_drayage',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Customs Duty Misc
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                              value={trackingData.customs_duty_misc || ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleTrackingChange(
                                  'customs_duty_misc',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Per Diem
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                              value={trackingData.per_diem || ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleTrackingChange('per_diem', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Attachment
                      </label>
                      <div className="flex flex-col gap-3">
                        <label className="hover:border-mc-gold hover:bg-mc-beige-light flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 transition-colors">
                          <FileUp className="h-5 w-5 text-slate-400" />
                          <span className="flex flex-col items-center">
                            <span>Click to upload attachment(s)</span>
                            <span className="mt-1 text-[10px] text-slate-400">
                              .jpeg, .jpg, .png, .gif, .webp, .pdf, .doc, .docx,
                              .csv, .xls, .xlsx (Max 5MB each)
                            </span>
                          </span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                const validFiles = files.filter((f) => {
                                  if (f.size > 5 * 1024 * 1024) {
                                    toast.error(
                                      `File ${f.name} exceeds 5MB limit`,
                                    );
                                    return false;
                                  }
                                  return true;
                                });
                                handleTrackingChange('attachmentsToUpload', [
                                  ...(trackingData.attachmentsToUpload || []),
                                  ...validFiles,
                                ]);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>

                        {trackingData.attachmentsToUpload &&
                          trackingData.attachmentsToUpload.length > 0 && (
                            <div className="mt-2 flex flex-col gap-2">
                              {trackingData.attachmentsToUpload.map(
                                (file, idx) => (
                                  <div
                                    key={idx}
                                    className="relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:border-slate-300"
                                  >
                                    {file.type.startsWith('image/') ? (
                                      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                        <img
                                          src={URL.createObjectURL(file)}
                                          alt="Preview"
                                          className="h-full w-full object-contain"
                                        />
                                      </div>
                                    ) : null}
                                    <div className="flex items-center justify-between px-2 pb-1">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="text-mc-gold h-4 w-4 flex-shrink-0" />
                                        <span className="truncate font-medium text-slate-700">
                                          {file.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          (
                                          {(file.size / (1024 * 1024)).toFixed(
                                            2,
                                          )}{' '}
                                          MB)
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newFiles = [
                                            ...trackingData.attachmentsToUpload,
                                          ];
                                          newFiles.splice(idx, 1);
                                          handleTrackingChange(
                                            'attachmentsToUpload',
                                            newFiles,
                                          );
                                        }}
                                        className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                        {/* Existing attachments from backend */}
                        {(!trackingData.attachmentsToUpload ||
                          trackingData.attachmentsToUpload.length === 0) &&
                          (Array.isArray(container.attachments)
                            ? container.attachments
                            : Array.isArray(container.files)
                              ? container.files
                              : container.attachments
                                ? [container.attachments]
                                : container.files
                                  ? [container.files]
                                  : container.attachment
                                    ? Array.isArray(container.attachment)
                                      ? container.attachment
                                      : [container.attachment]
                                    : []
                          ).map((att) => {
                            // Allow array of attachments or a single attachment wrapped in an array if backend returns singular
                            if (!att || !att.id) return null;
                            return (
                              <div
                                key={att.id}
                                className="relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:border-slate-300"
                              >
                                {att.content_type?.startsWith('image/') ||
                                att.file_name?.match(
                                  /\.(jpeg|jpg|gif|png|webp)$/i,
                                ) ? (
                                  <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                    <img
                                      src={att.file_url}
                                      alt="Preview"
                                      className="h-full w-full cursor-pointer object-contain"
                                      onClick={() =>
                                        window.open(att.file_url, '_blank')
                                      }
                                    />
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-between px-2 pb-1">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="text-mc-gold h-4 w-4 flex-shrink-0" />
                                    <span className="truncate font-medium text-slate-700">
                                      {att.file_name}
                                    </span>
                                    {att.size && (
                                      <span className="text-xs text-slate-400">
                                        ({(att.size / (1024 * 1024)).toFixed(2)}{' '}
                                        MB)
                                      </span>
                                    )}
                                  </div>
                                  <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cursor-pointer rounded-md p-1.5 text-indigo-500 transition-colors hover:bg-indigo-50"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Vendor Credit Needed
                      </label>
                      <textarea
                        rows={3}
                        className="focus:border-mc-black focus:ring-mc-black w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                        value={trackingData.factory_credit_needed || ''}
                        placeholder="e.g. Damaged panels"
                        onChange={(e) =>
                          handleTrackingChange(
                            'factory_credit_needed',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Receiving Closure Notes
                      </label>
                      <textarea
                        rows={3}
                        className="focus:border-mc-black focus:ring-mc-black w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                        value={trackingData.receiving_closure_notes || ''}
                        placeholder="e.g. Fully closed and processed"
                        onChange={(e) =>
                          handleTrackingChange(
                            'receiving_closure_notes',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {activeTab === 'comments' ? 'Cancel' : 'Close View'}
            </button>
            {activeTab === 'comments' && (
              <button
                onClick={handleSaveTracking}
                className="bg-mc-gold text-mc-black hover:bg-mc-gold/80 flex cursor-pointer items-center justify-center rounded-lg px-6 py-2.5 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {container.door ||
                container.date_dropped_off ||
                container.date_emptied ||
                container.unloaded_by ||
                container.country_of_origin ||
                container.unload_cost ||
                container.container_cost_drayage ||
                container.customs_duty_misc ||
                container.per_diem ||
                container.factory_credit_needed ||
                container.receiving_closure_notes ||
                trackingData.attachment
                  ? 'Update'
                  : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
      <Tooltip
        id="sku-tooltip"
        positionStrategy="fixed"
        place="top"
        className="z-[100] max-w-xs text-center text-xs leading-relaxed font-semibold tracking-wide shadow-xl"
        style={{
          backgroundColor: '#F4EFE8',
          color: '#151717',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      />
    </>,
    document.body,
  );
}
