import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Loader2, Save, Info, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import VendorInfiniteDropdown from '../../../components/common/VendorInfiniteDropdown';
import CompanyDropdown from '../../../components/common/CompanyDropdown';
import { createPurchaseOrder } from '../services/purchaseOrder.service';
import { getCompanies } from '../../../services/company.service';

// Default company for a new PO — most POs are for this company, so
// pre-select it instead of making every user pick it manually. Not part of
// the create-PO API payload, so it's shown disabled/informational only.
const DEFAULT_COMPANY_NAME = 'Manhattan Comfort';

const emptyItemRow = {
  sku: '',
  qty_ordered: '',
  unit_price: '',
};

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'items', label: 'Items' },
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
    vendorId: '',
    purchaseTitle: '',
    notes: '',
    // Informational-only field below — not part of the create-PO API
    // payload, shown disabled and pre-filled with its usual default.
    companyId: '',
  });
  const [items, setItems] = useState([{ ...emptyItemRow }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pre-select the usual Company for a new PO — this field is disabled (not
  // sent to the API) but still shown for context.
  useEffect(() => {
    if (!isOpen || form.companyId) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const setItemField = (index: number, key: string, value: any) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { ...emptyItemRow }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleReset = () => {
    setStepIndex(0);
    setForm({
      vendorId: '',
      purchaseTitle: '',
      notes: '',
      companyId: '',
    });
    setItems([{ ...emptyItemRow }]);
    setErrors({});
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const validateGeneral = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.vendorId) nextErrors.vendorId = 'Vendor is required.';
    if (!form.purchaseTitle.trim())
      nextErrors.purchaseTitle = 'Purchase title is required.';
    return nextErrors;
  };

  const validateItems = () => {
    const nextErrors: Record<string, string> = {};
    const hasValidItem = items.some((it) => it.sku.trim());
    if (!hasValidItem) {
      nextErrors.items = 'Add at least one item line.';
    } else {
      items.forEach((it, i) => {
        if (!it.sku.trim()) return;
        if (!it.qty_ordered || Number(it.qty_ordered) <= 0) {
          nextErrors[`item-${i}-qty`] = 'Enter a quantity greater than 0.';
        }
      });
    }
    return nextErrors;
  };

  const validateStep = (index: number) => {
    let stepErrors: Record<string, string> = {};
    if (STEPS[index].key === 'general') stepErrors = validateGeneral();
    if (STEPS[index].key === 'items') stepErrors = validateItems();
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
      vendor_id: form.vendorId,
      purchase_title: form.purchaseTitle.trim(),
      notes: form.notes.trim(),
      items: items
        .filter((it) => it.sku.trim())
        .map((it) => ({
          sku: it.sku.trim(),
          qty_ordered: Number(it.qty_ordered) || 0,
          unit_price: Number(it.unit_price) || 0,
        })),
    };

    try {
      setIsSaving(true);
      await createPurchaseOrder(payload);
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
  const validItems = items.filter((it) => it.sku.trim());

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="animate-scaleUp flex h-[78vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-100 bg-white shadow-xl"
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

        <form
          onSubmit={handleSubmit}
          // Pressing Enter in a field (e.g. Purchase Title) implicitly
          // submits the form per browser default — block that on every
          // step except the last, so the create-PO API only ever fires
          // from an explicit click on "Create Purchase Order".
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLastStep) {
              e.preventDefault();
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
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
                    <label className={labelClass}>Purchase Title *</label>
                    <input
                      type="text"
                      value={form.purchaseTitle}
                      onChange={(e) =>
                        setField('purchaseTitle', e.target.value)
                      }
                      placeholder="e.g. Fall 2026 Production PO"
                      className={inputClass}
                    />
                    {errors.purchaseTitle && (
                      <p className={errorClass}>{errors.purchaseTitle}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      placeholder="e.g. Standard container loading instructions"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Items */}
            {currentStepKey === 'items' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Items
                  </h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="bg-mc-gold text-mc-black flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>
                {errors.items && (
                  <p className={`${errorClass} mb-2`}>{errors.items}</p>
                )}

                <div className="space-y-3">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(i)}
                          className="absolute top-2 right-2 rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-3 gap-3 pr-6">
                        <div>
                          <label className={labelClass}>SKU *</label>
                          <input
                            type="text"
                            value={it.sku}
                            onChange={(e) =>
                              setItemField(i, 'sku', e.target.value)
                            }
                            placeholder="e.g. BS007-BZ"
                            className={`${inputClass} font-mono`}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Qty Ordered *</label>
                          <input
                            type="number"
                            min="0"
                            value={it.qty_ordered}
                            onChange={(e) =>
                              setItemField(i, 'qty_ordered', e.target.value)
                            }
                            placeholder="0"
                            className={inputClass}
                          />
                          {errors[`item-${i}-qty`] && (
                            <p className={errorClass}>
                              {errors[`item-${i}-qty`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) =>
                              setItemField(i, 'unit_price', e.target.value)
                            }
                            placeholder="0.00"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStepKey === 'review' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    Review the details below before creating this purchase
                    order.
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
                    <dt className="text-slate-500">Purchase Title</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.purchaseTitle || '—'}
                    </dd>
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.notes || '—'}
                    </dd>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Items ({validItems.length})
                  </h4>
                  <div className="space-y-1.5">
                    {validItems.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono font-semibold text-slate-800">
                          {it.sku}
                        </span>
                        <span className="text-slate-500">
                          Qty: {it.qty_ordered || 0} @ $
                          {Number(it.unit_price || 0).toFixed(2)}
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
              {stepIndex > 0 ? 'Back' : 'Cancel'}
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
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
