import React, { useState, useRef, useEffect, useMemo } from 'react';
import { read, utils } from 'xlsx';
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Save,
  Loader2,
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/api';
import {
  CONTAINER_ITEMS_IMPORT,
  CONTAINERS_LIST,
  CONTAINER_IMPORT_PREVIEW,
  CONTAINER_VALIDATE_ITEMS_BULK,
} from '../../../utils/endpoints';
import InfiniteScrollDropdown from '../../../components/InfiniteScrollDropdown';
import { getWarehouses } from '../../../services/warehouse.service';
import { createContainer } from '../services/container.service';
import AddContainerItemsWizard from './AddContainerItemsWizard';

export default function ImportItemsModal({
  containerId,
  onClose,
  onSuccess,
  containers = [],
}) {
  const [file, setFile] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(containerId || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const [containerName, setContainerName] = useState('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehousesList, setWarehousesList] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showContainerDetails, setShowContainerDetails] = useState(false);

  useEffect(() => {
    getWarehouses()
      .then((data) => {
        const results = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        setWarehousesList(results);
      })
      .catch((err) => console.error(err));
  }, []);

  const warehouseDropdownItems = useMemo(() => {
    let filtered = warehousesList;
    if (warehouseSearch) {
      const q = warehouseSearch.toLowerCase();
      filtered = filtered.filter(
        (wh) =>
          wh.name?.toLowerCase().includes(q) ||
          wh.warehouse_name?.toLowerCase().includes(q) ||
          wh.id?.toString().toLowerCase().includes(q),
      );
    }
    return filtered.map((wh) => ({
      value: wh.id,
      label: wh.name || wh.warehouse_name || wh.id,
    }));
  }, [warehousesList, warehouseSearch]);

  const REQUIRED_FIELDS = ['sku', 'qty_in_container'];

  const validateRows = (parsedRows, preserveServerStatus = false) => {
    // Count SKU + PO combinations to find duplicates
    const skuCounts = {};
    parsedRows.forEach((r) => {
      if (!r.sku || r.sku === '-') return;
      const key = `${String(r.sku).trim()}-${String(r.file_po_id || '').trim()}`;
      skuCounts[key] = (skuCounts[key] || 0) + 1;
    });

    return parsedRows.map((row) => {
      const errors = [];
      REQUIRED_FIELDS.forEach((field) => {
        if (!row[field] && row[field] !== 0) {
          errors.push(`Missing ${field}`);
        }
      });
      if (
        row.qty_available_for_container !== undefined &&
        row.qty_available_for_container !== null &&
        Number(row.qty_in_container) > Number(row.qty_available_for_container)
      ) {
        errors.push(
          `Requested Qty exceeds available PO items (${row.qty_available_for_container})`,
        );
      }

      const key = `${String(row.sku || '').trim()}-${String(row.file_po_id || '').trim()}`;
      if (row.sku && row.sku !== '-' && skuCounts[key] > 1) {
        errors.push('Duplicate SKU. Remove any one row');
      }

      const knownLocalErrors = [
        'Missing sku',
        'Missing qty_in_container',
        'Duplicate SKU. Remove any one row',
      ];
      const preservedErrors = preserveServerStatus
        ? (row._errors || []).filter(
            (e) =>
              !knownLocalErrors.includes(e) &&
              !e.startsWith('Requested Qty exceeds'),
          )
        : [];

      const finalErrors = Array.from(new Set([...preservedErrors, ...errors]));
      let finalSuccess = preserveServerStatus ? row._success : null;

      // If there's any error logically, it absolutely cannot be successful
      if (finalErrors.length > 0) finalSuccess = null;

      return { ...row, _errors: finalErrors, _success: finalSuccess };
    });
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error(
        'Invalid file format. Only .csv, .xlsx, and .xls files are supported.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setApiErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post(
        CONTAINER_IMPORT_PREVIEW,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Skip-Global-Error': 'true',
          },
        },
      );

      if (response.success === false) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const errText =
          response.message || response.error || 'Failed to process file';
        setApiErrorMsg(errText);
        toast.error(errText);
        return;
      }

      const apiData = response.data?.data || [];

      // Map API response to our local rows
      const parsedData = apiData.map((item, index) => {
        return {
          _id: item.row_index || index,
          sku: item.file_sku || '-',
          sellercloud_item_id: item.found_item?.sellercloud_item_id || '',
          file_po_id: item.file_po_id || '',
          qty_in_container: item.file_qty || 0,
          _errors: [],
        };
      });

      setRows(validateRows(parsedData));

      if (response.data?.message) {
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setFile(null);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to parse the file or hit API. Ensure it is a valid format.';
      setApiErrorMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Only .csv and .xlsx files are supported.');
      return;
    }

    // Simulate input change
    handleFileUpload({ target: { files: [droppedFile] } });
  };

  const handleRowChange = (id, field, value) => {
    setRows((prev) => {
      const updated = prev.map((r) =>
        r._id === id ? { ...r, [field]: value } : r,
      );
      return validateRows(updated);
    });
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r._id !== id);
      return validateRows(filtered, true);
    });
  };

  const handleVerifyItems = async () => {
    if (rows.length === 0) return;

    // Construct payload
    const payload = {
      items: rows.map((r) => ({
        po_id: String(r.file_po_id || ''),
        sku: String(r.sku || ''),
        qty: parseInt(r.qty_in_container || r.qty || 0, 10) || 0,
      })),
    };

    try {
      setLoading(true);
      const response = await apiClient.post(
        CONTAINER_VALIDATE_ITEMS_BULK,
        payload,
        { headers: { 'X-Skip-Global-Error': 'true' } },
      );

      const validatedItems = response.data?.data || response.data || [];

      const applyValidation = (items) => {
        setRows((prevRows) => {
          const formatted = prevRows.map((r, index) => {
            const serverItem = items[index];
            if (!serverItem) return r;

            const errs = [];
            let successMsg = null;
            if (serverItem.status === 'error') {
              errs.push(
                serverItem.validation_message || 'Item validation failed',
              );
            } else if (serverItem.status === 'success' || serverItem.is_valid) {
              successMsg = serverItem.validation_message || 'Valid';
            }

            return {
              ...r,
              sellercloud_item_id:
                serverItem.found_item?.sellercloud_item_id ||
                serverItem.found_item?.id ||
                r.sellercloud_item_id ||
                '',
              qty_available_for_container:
                serverItem.found_item?.qty_available_for_container ??
                serverItem.qty_available_for_container ??
                serverItem.po_item?.qty_available_for_container ??
                serverItem.available_qty ??
                r.qty_available_for_container ??
                null,
              _errors: errs,
              _success: successMsg,
            };
          });
          return validateRows(formatted, true);
        });
      };

      if (Array.isArray(validatedItems) && validatedItems.length > 0) {
        applyValidation(validatedItems);
        const hasErrors = validatedItems.some((i) => i.status === 'error');
        if (hasErrors) {
          toast.warning('Verification complete, but some items have errors.');
        } else {
          toast.success('All items verified successfully!');
        }
      }
    } catch (err) {
      console.error('Validation error:', err);

      // If the API throws 4xx and passes the array, map it!
      const errItems = err.response?.data?.data || err.response?.data;
      if (Array.isArray(errItems) && errItems.length > 0) {
        setRows((prevRows) => {
          const formatted = prevRows.map((r, index) => {
            const serverItem = errItems[index];
            if (!serverItem) return r;
            const errs = [];
            let successMsg = null;
            if (serverItem.status === 'error') {
              errs.push(
                serverItem.validation_message || 'Item validation failed',
              );
            } else if (serverItem.status === 'success' || serverItem.is_valid) {
              successMsg = serverItem.validation_message || 'Valid';
            }
            return {
              ...r,
              sellercloud_item_id:
                serverItem.found_item?.sellercloud_item_id ||
                serverItem.found_item?.id ||
                r.sellercloud_item_id ||
                '',
              qty_available_for_container:
                serverItem.found_item?.qty_available_for_container ??
                serverItem.qty_available_for_container ??
                serverItem.po_item?.qty_available_for_container ??
                serverItem.available_qty ??
                r.qty_available_for_container ??
                null,
              _errors: errs,
              _success: successMsg,
            };
          });
          return validateRows(formatted, true);
        });
        toast.warning('Verification complete, but some items have errors.');
      } else {
        toast.error(
          err.response?.data?.message ||
            err.response?.data?.error ||
            'Validation failed',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['PO ID', 'SKU', 'QTY'];
    const rows = [
      ['12345', 'TEST-BLA', '50'],
      ['12345', 'TEST-COM-Aphrodite 02', '25'],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Container_Items_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!containerId) {
      if (!containerName.trim()) {
        toast.error('Please enter a container number/name.');
        return;
      }
      if (!estimatedArrivalDate) {
        toast.error('Please enter an estimated arrival date.');
        return;
      }
      if (!selectedWarehouseId) {
        toast.error('Please select a warehouse.');
        return;
      }
    }

    const hasErrors = rows.some((r) => r._errors && r._errors.length > 0);
    if (hasErrors) {
      toast.error('Please resolve all validation errors before importing.');
      return;
    }

    if (rows.length === 0) {
      toast.error('No valid items to import.');
      return;
    }

    try {
      setImporting(true);
      setApiErrorMsg(null);
      // Clean up internal properties before sending
      const payload = rows.map(
        ({ _id, _errors, sku, file_po_id, ...rest }) => rest,
      );

      if (containerId) {
        const response = await apiClient.post(
          CONTAINER_ITEMS_IMPORT(containerId),
          {
            items: payload,
          },
          {
            headers: { 'X-Skip-Global-Error': 'true' },
          },
        );

        if (response.data?.success === false) {
          throw new Error(
            response.data.message ||
              response.data.error ||
              'Failed to import items to container',
          );
        }

        toast.success(
          response.data?.message || 'Successfully imported items to container!',
        );
      } else {
        const apiPayload = {
          container_name: containerName.trim(),
          warehouse_id: selectedWarehouseId || null,
          estimated_arrival_date: estimatedArrivalDate
            ? `${estimatedArrivalDate}T00:00:00Z`
            : null,
          received_date: null,
          items: payload,
        };
        const responseData = await createContainer(apiPayload, {
          headers: { 'X-Skip-Global-Error': 'true' },
        });

        if (responseData?.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              'Failed to create container',
          );
        }

        toast.success(
          responseData?.message || 'Successfully created container!',
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to import items to the API.';
      setApiErrorMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      {showWizard && (
        <AddContainerItemsWizard
          onClose={() => setShowWizard(false)}
          onConfirm={(newItems) => {
            setRows((prev) => [...prev, ...newItems]);
            setShowWizard(false);
          }}
        />
      )}

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl">
        {importing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-indigo-600" />
            <p className="animate-pulse text-sm font-semibold text-slate-700">
              Processing your request...
            </p>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg leading-tight font-bold text-slate-800">
                Import Container Items
              </h3>
              <div className="mt-0.5 flex items-center gap-3">
                <p className="text-xs font-medium text-slate-500">
                  Upload CSV or Excel file to add items automatically
                </p>
                <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                <button
                  onClick={handleDownloadTemplate}
                  title="Download template"
                  className="text-xs font-bold text-indigo-600 transition hover:text-indigo-800 hover:underline"
                >
                  Download file Format
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-6">
          {!file && rows.length === 0 ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-white px-12 py-16 transition-colors hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FileSpreadsheet
                className="mb-5 h-14 w-14 text-slate-400"
                strokeWidth={1.5}
              />
              <h4 className="mb-2 text-lg font-bold text-slate-700">
                Click to browse or drag file here
              </h4>
              <p className="mb-6 text-sm font-medium text-slate-500">
                Accepts .xlsx, .xls, .csv
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Select File
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800">
                    {file ? 'Preview Imported Data' : 'Container Items'}
                    {rows.length > 0 &&
                      rows.some((r) => r._success) &&
                      !rows.some((r) => r._errors?.length > 0) && (
                        <span className="animate-in zoom-in ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase shadow-sm duration-300">
                          <CheckCircle2 className="h-3 w-3" /> All Validated
                        </span>
                      )}
                    {rows.length > 0 &&
                      rows.some((r) => r._errors?.length > 0) && (
                        <span className="animate-in zoom-in ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase shadow-sm duration-300">
                          <XCircle className="h-3 w-3" /> Needs Fixes
                        </span>
                      )}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {file
                      ? `${rows.length} rows loaded from ${file.name}`
                      : `${rows.length} manually added items`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                  >
                    + Add Row
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyItems}
                    disabled={loading || rows.length === 0}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Verify Items
                  </button>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setRows([]);
                        setApiErrorMsg(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      {file ? 'Upload Different File' : 'Clear & Upload File'}
                    </button>
                    {file && (
                      <div className="animate-in fade-in zoom-in absolute top-full right-0 z-50 mt-2 hidden w-max rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white shadow-xl duration-200 group-hover:block">
                        If you selected the wrong file, upload a new file.
                        <div className="absolute right-16 bottom-full border-4 border-transparent border-b-indigo-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="min-h-[300px] flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 shadow-sm">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="min-w-[150px] px-4 py-3">SKU</th>
                        <th className="min-w-[150px] px-4 py-3">PO Item ID</th>
                        <th className="min-w-[150px] px-4 py-3">PO ID</th>
                        <th className="min-w-[150px] px-4 py-3">Qty</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={row._id}
                          className={
                            row._errors?.length > 0 ? 'bg-rose-50/30' : ''
                          }
                        >
                          <td className="relative px-4 py-2">
                            <input
                              type="text"
                              value={row.sku || ''}
                              onChange={(e) =>
                                handleRowChange(row._id, 'sku', e.target.value)
                              }
                              className={`w-full rounded border px-2 py-1 text-xs focus:ring-1 focus:outline-none ${!row.sku || row.sku === '-' || row._errors?.length > 0 ? 'border-rose-300 bg-rose-50 text-rose-800 focus:ring-rose-500' : row._success ? 'border-emerald-300 bg-emerald-50/30 text-emerald-900 focus:ring-emerald-500' : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-500'}`}
                              placeholder="SKU Required"
                            />
                            {row._errors && row._errors.length > 0 && (
                              <div
                                className="mt-1 text-[10px] leading-tight font-bold text-rose-600"
                                title={row._errors.join(', ')}
                              >
                                {row._errors[0]}
                              </div>
                            )}
                            {row._success && (
                              <div
                                className="mt-1 text-[10px] leading-tight font-bold text-emerald-600"
                                title={row._success}
                              >
                                {row._success}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              disabled
                              value={row.sellercloud_item_id || ''}
                              onChange={(e) =>
                                handleRowChange(
                                  row._id,
                                  'sellercloud_item_id',
                                  e.target.value,
                                )
                              }
                              className="w-full cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                              placeholder="Item ID"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.file_po_id || ''}
                              onChange={(e) =>
                                handleRowChange(
                                  row._id,
                                  'file_po_id',
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              placeholder="PO ID"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={row.qty_in_container ?? row.qty ?? ''}
                              onChange={(e) => {
                                handleRowChange(
                                  row._id,
                                  'qty_in_container',
                                  e.target.value === ''
                                    ? ''
                                    : Number(e.target.value),
                                );
                                handleRowChange(row._id, 'qty', undefined);
                                // clear old qty field if it exists to avoid confusion
                              }}
                              className={`w-full rounded border px-2 py-1 text-xs focus:ring-1 focus:outline-none ${(row.qty_in_container === undefined || row.qty_in_container === null || row.qty_in_container === '') && (row.qty === undefined || row.qty === null || row.qty === '') ? 'border-rose-300 bg-rose-50 focus:ring-rose-500' : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-500'}`}
                              placeholder="Required"
                            />
                            {row.qty_available_for_container !== undefined &&
                              row.qty_available_for_container !== null && (
                                <div className="mt-1 w-full text-right text-[10px] font-medium text-slate-500">
                                  Avail:{' '}
                                  <span
                                    className={
                                      Number(row.qty_in_container) >
                                      Number(row.qty_available_for_container)
                                        ? 'font-bold text-rose-600'
                                        : 'font-bold text-slate-700'
                                    }
                                  >
                                    {row.qty_available_for_container}
                                  </span>
                                </div>
                              )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => removeRow(row._id)}
                                className="text-slate-400 transition hover:text-rose-600"
                                title="Remove Item"
                              >
                                <X className="inline h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!containerId && showContainerDetails && (
            <div className="animate-in slide-in-from-bottom-4 fade-in mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm duration-500">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Container Details
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Container Number / Name
                  </label>
                  <input
                    type="text"
                    value={containerName}
                    onChange={(e) => setContainerName(e.target.value)}
                    placeholder="e.g. TCNU 1234567"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Estimated Arrival Date
                  </label>
                  <div className="relative">
                    <input
                      type={estimatedArrivalDate ? 'date' : 'text'}
                      placeholder="yyyy-mm-dd"
                      onFocus={(e) => (e.target.type = 'date')}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = 'text';
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      value={estimatedArrivalDate}
                      onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          e.target.showPicker();
                        } catch (err) {
                          // Ignore if unsupported (older browsers)
                        }
                      }}
                      className={`w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                        !estimatedArrivalDate
                          ? 'font-normal text-slate-400'
                          : 'text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Select Warehouse
                  </label>
                  <InfiniteScrollDropdown
                    value={selectedWarehouseId}
                    onChange={(val) => setSelectedWarehouseId(val)}
                    onSearch={(q) => setWarehouseSearch(q)}
                    items={warehouseDropdownItems}
                    placeholder="Select a warehouse..."
                    searchPlaceholder="Search warehouses..."
                    hasMore={false}
                    isLoading={false}
                    menuPlacement="top"
                  />
                </div>

                {rows.length > 0 && rows[0]?.sellercloud_po_id && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                      <div>
                        <h4 className="text-xs font-bold text-blue-900">
                          PO Status
                        </h4>
                        <p className="mt-0.5 text-[10px] text-blue-700">
                          Currently allocating items for{' '}
                          <span className="font-mono font-bold">
                            PO-
                            {String(rows[0].sellercloud_po_id).replace(
                              /^PO-/,
                              '',
                            )}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          {apiErrorMsg && (
            <div className="flex flex-1 items-center gap-1 text-xs font-semibold text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="line-clamp-2">{apiErrorMsg}</span>
            </div>
          )}
          <div
            className={
              apiErrorMsg ? 'flex gap-3' : 'flex w-full justify-end gap-3'
            }
          >
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            {!containerId && !showContainerDetails ? (
              <div className="group relative inline-block">
                <button
                  onClick={() => setShowContainerDetails(true)}
                  disabled={
                    rows.length === 0 ||
                    !rows.some((r) => r._success) ||
                    rows.some((r) => r._errors?.length > 0)
                  }
                  className="relative z-10 flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Allocate to Container
                </button>
                {(rows.length === 0 ||
                  !rows.some((r) => r._success) ||
                  rows.some((r) => r._errors?.length > 0)) && (
                  <>
                    <div className="absolute inset-0 z-20 cursor-not-allowed"></div>
                    <div className="animate-in fade-in zoom-in pointer-events-none absolute right-0 bottom-full z-50 mb-3 hidden w-max max-w-xs rounded-lg bg-rose-600 px-4 py-2 text-[11px] font-bold text-white shadow-xl duration-200 group-hover:block">
                      First verify items then allocate container details
                      <div className="absolute top-full right-16 border-[6px] border-transparent border-t-rose-600"></div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={
                  importing ||
                  rows.length === 0 ||
                  (!containerId &&
                    (!containerName ||
                      !estimatedArrivalDate ||
                      !selectedWarehouseId))
                }
                className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {importing ? 'Saving...' : 'Confirm Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
