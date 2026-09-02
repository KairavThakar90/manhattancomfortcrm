import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  Info,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VendorInfiniteDropdown from '../../../components/common/VendorInfiniteDropdown';
import WarehouseInfiniteDropdown from '../../../components/common/WarehouseInfiniteDropdown';
import CompanyDropdown from '../../../components/common/CompanyDropdown';
import { createPurchaseOrder } from '../services/purchaseOrder.service';
import { getCompanies } from '../../../services/company.service';
import { getWarehouses } from '../../../services/warehouse.service';

// Default selections for a new PO — most POs are for this company/warehouse,
// so pre-select them instead of making every user pick them manually.
const DEFAULT_COMPANY_NAME = 'Manhattan Comfort';
const DEFAULT_WAREHOUSE_NAME = 'South Brunswick';

interface ThemedSelectOption {
  value: number | string;
  label: string;
}

// Themed replacement for a native <select> — matches the app's other
// dropdown styling instead of the browser default control. These are short,
// fixed option lists (PO Type, Discount Type), so no search box is needed.
function ThemedSelect({
  value,
  onChange,
  options,
  className,
  disabled = false,
}: {
  value: number | string;
  onChange: (value: number | string) => void;
  options: ThemedSelectOption[];
  className?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`${className || ''} flex items-center justify-between text-left ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className="truncate">{selected ? selected.label : ''}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors ${
                String(opt.value) === String(value)
                  ? 'text-mc-black bg-slate-100 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// SellerCloud PO type enum is not exposed by any lookup endpoint yet — these
// values are placeholders pending backend confirmation of the real mapping.
const PO_TYPE_OPTIONS = [
  { value: 0, label: 'Standard' },
  { value: 1, label: 'Drop Ship' },
  { value: 2, label: 'Transfer' },
  { value: 3, label: 'Blanket' },
];

const emptyProductRow = {
  ProductID: '',
  QtyUnitsOrdered: '',
  UnitPrice: '',
  QtyCasesOrdered: '',
  QtyUnitsPerCase: '',
  CasePrice: '',
  DiscountType: 0,
  DiscountValue: '',
  WarehouseID: '',
  ItemNotes: '',
};

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'products', label: 'Products' },
  { key: 'review', label: 'Review & Create' },
];

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePurchaseOrderModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    companyId: '',
    vendorId: '',
    poType: 0,
    defaultWarehouseId: '',
    description: '',
    vendorNote: '',
    expectedDeliveryDate: '',
  });
  const [products, setProducts] = useState([{ ...emptyProductRow }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pre-select the usual Company/Warehouse for a new PO so most users never
  // have to touch these fields — only fills them in while still empty, so
  // it never overwrites a choice already made in this session.
  useEffect(() => {
    if (!isOpen) return;

    if (!form.companyId) {
      getCompanies()
        .then((companies) => {
          const match = companies.find((c) =>
            (c.name || '')
              .toLowerCase()
              .includes(DEFAULT_COMPANY_NAME.toLowerCase()),
          );
          if (match) {
            const id = String(match.sellercloud_company_id || match.id);
            setForm((p) => (p.companyId ? p : { ...p, companyId: id }));
          }
        })
        .catch((err) =>
          console.error('Failed to auto-select default company:', err),
        );
    }

    if (!form.defaultWarehouseId) {
      getWarehouses()
        .then((data) => {
          const results = Array.isArray(data)
            ? data
            : data?.results || data?.data || [];
          const match = results.find((w: any) =>
            (w.name || w.warehouse_name || '')
              .toLowerCase()
              .includes(DEFAULT_WAREHOUSE_NAME.toLowerCase()),
          );
          if (match) {
            const id = String(match.sellercloud_warehouse_id || match.id);
            setForm((p) =>
              p.defaultWarehouseId ? p : { ...p, defaultWarehouseId: id },
            );
          }
        })
        .catch((err) =>
          console.error('Failed to auto-select default warehouse:', err),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const setProductField = (index: number, key: string, value: any) => {
    setProducts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  };

  const addProductRow = () => {
    setProducts((prev) => [...prev, { ...emptyProductRow }]);
  };

  const removeProductRow = (index: number) => {
    setProducts((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleReset = () => {
    setStepIndex(0);
    setForm({
      companyId: '',
      vendorId: '',
      poType: 0,
      defaultWarehouseId: '',
      description: '',
      vendorNote: '',
      expectedDeliveryDate: '',
    });
    setProducts([{ ...emptyProductRow }]);
    setErrors({});
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  // TEMP: validation disabled for now — allow free navigation/submit
  // without requiring these fields. Restore the checks below to re-enable.
  const validateGeneral = () => {
    const nextErrors: Record<string, string> = {};
    // if (!form.companyId) nextErrors.companyId = 'Company is required.';
    // if (!form.vendorId) nextErrors.vendorId = 'Vendor is required.';
    // if (!form.defaultWarehouseId)
    //   nextErrors.defaultWarehouseId = 'Default warehouse is required.';
    // if (!form.expectedDeliveryDate)
    //   nextErrors.expectedDeliveryDate = 'Expected delivery date is required.';
    return nextErrors;
  };

  const validateProducts = () => {
    const nextErrors: Record<string, string> = {};
    // const hasValidProduct = products.some((p) => p.ProductID.trim());
    // if (!hasValidProduct) {
    //   nextErrors.products = 'Add at least one product line item.';
    // } else {
    //   products.forEach((p, i) => {
    //     if (!p.ProductID.trim()) return;
    //     const hasUnits = p.QtyUnitsOrdered && Number(p.QtyUnitsOrdered) > 0;
    //     const hasCases = p.QtyCasesOrdered && Number(p.QtyCasesOrdered) > 0;
    //     if (!hasUnits && !hasCases) {
    //       nextErrors[`product-${i}-qty`] =
    //         'Enter Qty Units Ordered or Qty Cases Ordered.';
    //     }
    //   });
    // }
    return nextErrors;
  };

  const validateStep = (index: number) => {
    let stepErrors: Record<string, string> = {};
    if (STEPS[index].key === 'general') stepErrors = validateGeneral();
    if (STEPS[index].key === 'products') stepErrors = validateProducts();
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const goToStep = (index: number) => {
    // Allow free navigation backwards; only validate when moving forward.
    if (index <= stepIndex) {
      setStepIndex(index);
      return;
    }
    for (let i = stepIndex; i < index; i++) {
      if (!validateStep(i)) {
        setStepIndex(i);
        toast.error('Please fix the highlighted fields.');
        return;
      }
    }
    setStepIndex(index);
  };

  const handleNext = () => {
    if (!validateStep(stepIndex)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        setStepIndex(i);
        toast.error('Please fix the highlighted fields.');
        return;
      }
    }

    const payload = {
      CompanyID: Number(form.companyId),
      VendorID: Number(form.vendorId) || (form.vendorId as unknown as number),
      POType: Number(form.poType),
      DefaultWarehouseID: Number(form.defaultWarehouseId),
      Description: form.description.trim(),
      VendorNote: form.vendorNote.trim(),
      PaymentTermID: 0,
      ExpectedDeliveryDate: new Date(form.expectedDeliveryDate).toISOString(),
      Products: products
        .filter((p) => p.ProductID.trim())
        .map((p) => ({
          ProductID: p.ProductID.trim(),
          QtyUnitsOrdered: Number(p.QtyUnitsOrdered) || 0,
          UnitPrice: Number(p.UnitPrice) || 0,
          QtyCasesOrdered: Number(p.QtyCasesOrdered) || 0,
          QtyUnitsPerCase: Number(p.QtyUnitsPerCase) || 0,
          CasePrice: Number(p.CasePrice) || 0,
          DiscountType: Number(p.DiscountType) || 0,
          DiscountValue: Number(p.DiscountValue) || 0,
          WarehouseID: p.WarehouseID
            ? Number(p.WarehouseID)
            : Number(form.defaultWarehouseId),
          ItemNotes: p.ItemNotes.trim(),
        })),
    };

    try {
      setIsSaving(true);
      await createPurchaseOrder(payload as any);
      toast.success('Purchase order created successfully!');
      handleReset();
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Failed to create purchase order', error);
      const apiMessage =
        error?.response?.data?.message || error?.response?.data?.detail;
      toast.error(apiMessage || 'Failed to create purchase order.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 transition-colors hover:border-black focus:border-black focus:outline-hidden focus:ring-0';
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';
  const errorClass = 'mt-1 text-[10px] font-semibold text-rose-500';

  const currentStepKey = STEPS[stepIndex].key;
  const isLastStep = stepIndex === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="animate-scaleUp flex h-[78vh] w-full max-w-7xl flex-col rounded-2xl border border-slate-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-base font-bold text-slate-900">
            Create Purchase Order
          </h3>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-100 px-6 py-3">
          {STEPS.map((step, i) => {
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <React.Fragment key={step.key}>
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className="flex flex-shrink-0 items-center gap-2 focus:outline-hidden"
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                      isActive
                        ? 'bg-mc-gold text-mc-black'
                        : isDone
                          ? 'bg-mc-black text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isActive
                        ? 'text-slate-900'
                        : isDone
                          ? 'text-slate-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="h-px w-6 flex-shrink-0 bg-slate-200" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {/* Step 1: General Info */}
            {currentStepKey === 'general' && (
              <div>
                <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  General Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Company *</label>
                    <CompanyDropdown
                      value={form.companyId}
                      onChange={(val) => setField('companyId', val)}
                      showAllOption={false}
                      placeholder="Select company"
                      className={inputClass}
                      disabled
                    />
                    {errors.companyId && (
                      <p className={errorClass}>{errors.companyId}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Vendor *</label>
                    <VendorInfiniteDropdown
                      value={form.vendorId}
                      onChange={(val) => setField('vendorId', val)}
                      placeholder="-- Choose Vendor --"
                      className={inputClass}
                    />
                    {errors.vendorId && (
                      <p className={errorClass}>{errors.vendorId}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>PO Type</label>
                    <ThemedSelect
                      value={form.poType}
                      onChange={(val) => setField('poType', Number(val))}
                      options={PO_TYPE_OPTIONS}
                      className={inputClass}
                      disabled
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Default Warehouse *</label>
                    <WarehouseInfiniteDropdown
                      value={form.defaultWarehouseId}
                      onChange={(val) => setField('defaultWarehouseId', val)}
                      placeholder="Select warehouse"
                      className={inputClass}
                      disabled
                    />
                    {errors.defaultWarehouseId && (
                      <p className={errorClass}>{errors.defaultWarehouseId}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      Expected Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={form.expectedDeliveryDate}
                      onChange={(e) =>
                        setField('expectedDeliveryDate', e.target.value)
                      }
                      placeholder="Select expected delivery date"
                      className={`${inputClass} font-mono`}
                    />
                    {errors.expectedDeliveryDate && (
                      <p className={errorClass}>
                        {errors.expectedDeliveryDate}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Internal PO description"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Vendor Note</label>
                    <textarea
                      rows={2}
                      value={form.vendorNote}
                      onChange={(e) => setField('vendorNote', e.target.value)}
                      placeholder="Note visible to the vendor"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Line Items */}
            {currentStepKey === 'products' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Products
                  </h4>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="bg-mc-gold text-mc-black flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Product
                  </button>
                </div>
                {errors.products && (
                  <p className={`${errorClass} mb-2`}>{errors.products}</p>
                )}

                <div className="space-y-3">
                  {products.map((p, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductRow(i)}
                          className="absolute top-2 right-2 rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          title="Remove line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-3 gap-3 pr-6">
                        <div>
                          <label className={labelClass}>
                            Product ID / SKU *
                          </label>
                          <input
                            type="text"
                            value={p.ProductID}
                            onChange={(e) =>
                              setProductField(i, 'ProductID', e.target.value)
                            }
                            placeholder="SellerCloud Product SKU/ID"
                            className={`${inputClass} font-mono`}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Qty Units Ordered
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={p.QtyUnitsOrdered}
                            onChange={(e) =>
                              setProductField(
                                i,
                                'QtyUnitsOrdered',
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className={inputClass}
                          />
                          {errors[`product-${i}-qty`] && (
                            <p className={errorClass}>
                              {errors[`product-${i}-qty`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.UnitPrice}
                            onChange={(e) =>
                              setProductField(i, 'UnitPrice', e.target.value)
                            }
                            placeholder="0.00"
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className={labelClass}>Item Notes</label>
                          <input
                            type="text"
                            value={p.ItemNotes}
                            onChange={(e) =>
                              setProductField(i, 'ItemNotes', e.target.value)
                            }
                            placeholder="Optional note for this line item"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStepKey === 'review' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    Review the details below. Creating this PO will submit a
                    live request to SellerCloud.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    General
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <dt className="text-slate-500">Company ID</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.companyId || '—'}
                    </dd>
                    <dt className="text-slate-500">Vendor ID</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.vendorId || '—'}
                    </dd>
                    <dt className="text-slate-500">PO Type</dt>
                    <dd className="font-semibold text-slate-800">
                      {PO_TYPE_OPTIONS.find((o) => o.value === form.poType)
                        ?.label || form.poType}
                    </dd>
                    <dt className="text-slate-500">Default Warehouse</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.defaultWarehouseId || '—'}
                    </dd>
                    <dt className="text-slate-500">Expected Delivery</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.expectedDeliveryDate || '—'}
                    </dd>
                    <dt className="text-slate-500">Description</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.description || '—'}
                    </dd>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Products (
                    {products.filter((p) => p.ProductID.trim()).length})
                  </h4>
                  <div className="space-y-1.5">
                    {products
                      .filter((p) => p.ProductID.trim())
                      .map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-mono font-semibold text-slate-800">
                            {p.ProductID}
                          </span>
                          <span className="text-slate-500">
                            Units: {p.QtyUnitsOrdered || 0}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={stepIndex === 0 ? handleClose : handleBack}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stepIndex > 0 && <ChevronLeft className="h-3.5 w-3.5" />}
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>

            {isLastStep ? (
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold shadow-xs transition ${
                  isSaving
                    ? 'cursor-not-allowed bg-slate-400 text-white'
                    : 'bg-mc-black text-white hover:bg-black'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? 'Creating...' : 'Create Purchase Order'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="bg-mc-gold text-mc-black flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold shadow-xs transition hover:opacity-80"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
