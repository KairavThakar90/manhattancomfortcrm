import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Save,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../services/api';
import { CONTAINER_ITEMS_IMPORT, CONTAINERS_LIST } from '../utils/endpoints';

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
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = utils.sheet_to_json(worksheet);

      const parsedData = rawData.map((row) => {
        const mappedRow = {};
        for (const key of Object.keys(row)) {
          const lowerKey = key.toLowerCase().trim();
          if (
            lowerKey === 'productid' ||
            lowerKey === 'sku' ||
            lowerKey === 'item'
          ) {
            mappedRow['sku'] = row[key];
          } else if (
            lowerKey === 'qtyshippe' ||
            lowerKey === 'qtyshipped' ||
            lowerKey === 'qty' ||
            lowerKey === 'quantity'
          ) {
            mappedRow['qty_in_container'] = row[key];
          } else if (
            lowerKey === 'poid' ||
            lowerKey === 'po id' ||
            lowerKey === 'sellercloud_po_id'
          ) {
            mappedRow['sellercloud_po_id'] = row[key];
          } else {
            mappedRow[key] = row[key];
          }
        }
        return mappedRow;
      });

      const validatedData = validateRows(parsedData);
      setRows(validatedData);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(
        'Failed to parse the file. Ensure it is a valid CSV or XLSX.',
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
    const targetContainer = containerId || selectedContainer;
    if (!targetContainer) {
      toast.error('Please select a target container for this import.');
      return;
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

      await apiClient.post(CONTAINER_ITEMS_IMPORT(targetContainer), {
        items: payload,
      });
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
          {!containerId && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Target Container
              </label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition shadow-sm"
              >
                <option value="" disabled>
                  -- Select a Container --
                </option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}{' '}
                    {c.is_received ? '(Received)' : '(Pending)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!file && rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-12 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-4" />
              <h4 className="text-slate-700 font-bold mb-1">
                Click to browse or drag file here
              </h4>
              <p className="text-slate-500 text-sm mb-4">
                Accepts .xlsx, .xls, .csv
              </p>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
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
                        <th className="px-4 py-3 min-w-[200px]">SKU *</th>
                        <th className="px-4 py-3 min-w-[150px]">Qty *</th>
                        <th className="px-4 py-3 min-w-[150px]">PO ID</th>
                        <th className="px-4 py-3 min-w-[250px]">Status</th>
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
                              className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 ${!row.sku ? 'border-rose-300 focus:ring-rose-500 bg-rose-50' : 'border-slate-200 focus:ring-indigo-500 hover:border-slate-300'}`}
                              placeholder="Required"
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
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.sellercloud_po_id || row.po_id || ''}
                              onChange={(e) =>
                                handleRowChange(
                                  row._id,
                                  'sellercloud_po_id',
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:border-slate-300"
                              placeholder="Optional"
                            />
                          </td>
                          <td className="px-4 py-2">
                            {row._errors.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                {row._errors.join(', ')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid
                              </span>
                            )}
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
              (!containerId && !selectedContainer)
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
