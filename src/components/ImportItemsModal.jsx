import React, { useState, useRef, useEffect, useMemo } from 'react';
import { read, utils } from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Save,
  Loader2,
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../services/api';
import { CONTAINER_ITEMS_IMPORT, CONTAINERS_LIST } from '../utils/endpoints';
import InfiniteScrollDropdown from './InfiniteScrollDropdown';
import { createContainer } from '../services/container.service';

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
  const fileInputRef = useRef(null);

  const [containerName, setContainerName] = useState('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehousesList, setWarehousesList] = useState([]);

  useEffect(() => {
    import('../services/warehouse.service').then(({ getWarehouses }) => {
      getWarehouses()
        .then((data) => {
          const results = Array.isArray(data)
            ? data
            : data.results || data.data || [];
          setWarehousesList(results);
        })
        .catch((err) => console.error(err));
    });
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

  const validateRows = (parsedRows) => {
    return parsedRows.map((row, index) => {
      const errors = [];
      REQUIRED_FIELDS.forEach((field) => {
        if (!row[field] && row[field] !== 0) {
          errors.push(`Missing ${field}`);
        }
      });
      return { ...row, _id: index, _errors: errors };
    });
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post(
        '/containers/import/preview',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      const apiData = response.data?.data || [];

      // Map API response to our local rows
      const parsedData = apiData.map((item, index) => {
        return {
          _id: item.row_index || index,
          sku: item.file_sku || '-',
          sellercloud_item_id: item.found_item?.sellercloud_item_id || '',
          file_po_id: item.file_po_id || '',
          qty_in_container: item.file_qty || 0,
          _errors: [], // We can rely on API validations if needed, skipping local _errors for now
        };
      });

      setRows(parsedData);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(
        'Failed to parse the file or hit API. Ensure it is a valid format.',
      );
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
    setRows((prev) => prev.filter((r) => r._id !== id));
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
      // Clean up internal properties before sending
      const payload = rows.map(({ _id, _errors, ...rest }) => rest);

      if (containerId) {
        await apiClient.post(CONTAINER_ITEMS_IMPORT(containerId), {
          items: payload,
        });
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
        await createContainer(apiPayload);
      }

      toast.success('Successfully imported items to container!');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import items to the API.');
    } finally {
      setImporting(false);
    }
  };

  const hasValidationErrors = rows.some(
    (r) => r._errors && r._errors.length > 0,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                Import Container Items
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Upload CSV or Excel file to add items automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
          {!file && rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 rounded-xl py-16 px-12 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FileSpreadsheet
                className="w-14 h-14 text-slate-400 mb-5"
                strokeWidth={1.5}
              />
              <h4 className="text-slate-700 text-lg font-bold mb-2">
                Click to browse or drag file here
              </h4>
              <p className="text-slate-500 text-sm mb-6 font-medium">
                Accepts .xlsx, .xls, .csv
              </p>
              <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition shadow-sm">
                Select File
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    Preview Imported Data
                    {hasValidationErrors && (
                      <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> Fix errors
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {rows.length} rows loaded from {file?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setRows([]);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition underline"
                >
                  Clear & Start Over
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-x-auto overflow-y-auto flex-1 min-h-[300px] shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold sticky top-0">
                      <tr>
                        <th className="px-4 py-3 min-w-[150px]">SKU *</th>
                        <th className="px-4 py-3 min-w-[150px]">PO Item ID</th>
                        <th className="px-4 py-3 min-w-[150px]">PO ID</th>
                        <th className="px-4 py-3 min-w-[150px]">Qty *</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={row._id}
                          className={
                            row._errors.length > 0 ? 'bg-rose-50/30' : ''
                          }
                        >
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.sku || ''}
                              onChange={(e) =>
                                handleRowChange(row._id, 'sku', e.target.value)
                              }
                              className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 ${!row.sku || row.sku === '-' ? 'border-rose-300 focus:ring-rose-500 bg-rose-50' : 'border-slate-200 focus:ring-indigo-500 hover:border-slate-300'}`}
                              placeholder="SKU Required"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.sellercloud_item_id || ''}
                              onChange={(e) =>
                                handleRowChange(
                                  row._id,
                                  'sellercloud_item_id',
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:border-slate-300"
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
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:border-slate-300"
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
                              className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 ${(row.qty_in_container === undefined || row.qty_in_container === null || row.qty_in_container === '') && (row.qty === undefined || row.qty === null || row.qty === '') ? 'border-rose-300 focus:ring-rose-500 bg-rose-50' : 'border-slate-200 focus:ring-indigo-500 hover:border-slate-300'}`}
                              placeholder="Required"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => removeRow(row._id)}
                              className="text-slate-400 hover:text-rose-600 transition"
                            >
                              <X className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!containerId && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-800">
                  Container Details
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Container Number / Name
                  </label>
                  <input
                    type="text"
                    value={containerName}
                    onChange={(e) => setContainerName(e.target.value)}
                    placeholder="e.g. TCNU 1234567"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Arrival Date
                  </label>
                  <div className="relative focus-within:ring-2 focus-within:ring-indigo-500 rounded-md">
                    <input
                      type="text"
                      placeholder="yyyy-mm-dd"
                      value={estimatedArrivalDate}
                      readOnly
                      className={`w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md outline-none font-medium ${
                        !estimatedArrivalDate
                          ? 'text-slate-400 font-normal'
                          : 'text-slate-800'
                      }`}
                    />
                    <Calendar
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none ${
                        !estimatedArrivalDate
                          ? 'text-slate-500'
                          : 'text-slate-800'
                      }`}
                    />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={estimatedArrivalDate}
                      onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  />
                </div>

                {rows.length > 0 && rows[0]?.sellercloud_po_id && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-blue-900">
                          PO Status
                        </h4>
                        <p className="text-[10px] text-blue-700 mt-0.5">
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold bg-white hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={
              importing ||
              rows.length === 0 ||
              hasValidationErrors ||
              (!containerId &&
                (!containerName ||
                  !estimatedArrivalDate ||
                  !selectedWarehouseId))
            }
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {importing ? 'Saving...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
