import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  Info,
  Check,
  Building2,
  Truck,
  Package,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VendorInfiniteDropdown from '../../../components/common/VendorInfiniteDropdown';
import CompanyDropdown from '../../../components/common/CompanyDropdown';
import ProductDropdown from '../../../components/common/ProductDropdown';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
} from '../services/purchaseOrder.service';
import { getCompanies, type Company } from '../../../services/company.service';
import {
  getProductsByVendor,
  type Product,
} from '../../../services/product.service';

// Default company for a new PO — most POs are for this company, so
// pre-select it instead of making every user pick it manually. Not part of
// the create-PO API payload, so it's shown disabled/informational only.
const DEFAULT_COMPANY_NAME = 'Manhattan Comfort';

const emptyItemRow = {
  sku: '',
  qty_ordered: '',
  unit_price: '',
  // Product-picked rows carry the source product's id; manual rows have
  // freeform SKU/price entry instead of picking from the vendor's catalog.
  productId: '',
  isManual: false,
};

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'items', label: 'Items' },
  { key: 'review', label: 'Review & Create' },
];

interface EditingPurchaseOrder {
  id: string;
  vendor_id?: string;
  purchase_title?: string;
  description?: string;
  items?: { sku: string; qty_ordered: number; unit_price: number }[];
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  // When set, the modal opens flipped into edit mode: pre-filled from this
  // PO's fetched details, and submitting calls updatePurchaseOrder instead
  // of createPurchaseOrder.
  editingPO?: EditingPurchaseOrder | null;
}

export default function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onCreated,
  editingPO = null,
}: CreatePurchaseOrderModalProps) {
  const isEditMode = !!editingPO;
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    vendorId: '',
    description: '',
    // Informational-only field below — not part of the create-PO API
    // payload, shown disabled and pre-filled with its usual default.
    companyId: '',
  });
  const [items, setItems] = useState([{ ...emptyItemRow }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const vendors = useSelector((state: any) => state.vendors?.list) || [];

  // Flip into edit mode: pre-fill the form/items from the fetched PO
  // details whenever the modal opens with an editingPO. Existing items
  // are loaded as manual rows since the API doesn't return a product id
  // to match back against the vendor's product catalog.
  useEffect(() => {
    if (!isOpen || !editingPO) return;
    setStepIndex(0);
    setForm((prev) => ({
      ...prev,
      vendorId: editingPO.vendor_id || '',
      description: editingPO.description || editingPO.purchase_title || '',
    }));
    setItems(
      editingPO.items && editingPO.items.length > 0
        ? editingPO.items.map((it) => ({
            ...emptyItemRow,
            sku: it.sku || '',
            qty_ordered: String(it.qty_ordered ?? ''),
            unit_price: String(it.unit_price ?? ''),
            isManual: true,
          }))
        : [{ ...emptyItemRow }],
    );
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingPO]);

  // Load the selected vendor's product catalog so item rows can be picked
  // from it instead of typed manually.
  useEffect(() => {
    if (!isOpen || !form.vendorId) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setIsLoadingProducts(true);
    getProductsByVendor(form.vendorId)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err) => {
        console.error('Failed to load vendor products:', err);
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, form.vendorId]);

  // Fetch the company list once and cache it — used both to pre-select the
  // usual Company for a new PO and to resolve its name for display (the
  // field itself is disabled/not sent to the API, shown for context only).
  useEffect(() => {
    if (!isOpen || companies.length > 0) return;

    getCompanies()
      .then((fetchedCompanies) => setCompanies(fetchedCompanies))
      .catch((err) => console.error('Failed to load companies:', err));
  }, [isOpen, companies.length]);

  // Pre-select the usual Company on every open (not just the first time the
  // list is fetched) — handleReset clears companyId after a successful
  // create, but the cached company list is kept, so this must run again
  // independently of the fetch above.
  useEffect(() => {
    if (!isOpen || form.companyId || companies.length === 0) return;

    const match = companies.find((c) =>
      (c.name || '').toLowerCase().includes(DEFAULT_COMPANY_NAME.toLowerCase()),
    );
    if (match) {
      const id = String(match.sellercloud_company_id || match.id);
      setForm((p) => (p.companyId ? p : { ...p, companyId: id }));
    }
  }, [isOpen, companies, form.companyId]);

  if (!isOpen) return null;

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const setItemField = (index: number, key: string, value: any) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
    const errorKey =
      key === 'qty_ordered'
        ? `item-${index}-qty`
        : key === 'unit_price'
          ? `item-${index}-price`
          : null;
    if (errorKey && errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
    if (errors.items) setErrors((prev) => ({ ...prev, items: '' }));
  };

  const addItemRow = () => {
    setItems((prev) => {
      const usedProductIds = new Set(
        prev.filter((row) => row.productId).map((row) => row.productId),
      );
      const hasProductsLeft = products.some(
        (p) => !usedProductIds.has(String(p.id)),
      );
      return [
        ...prev,
        { ...emptyItemRow, isManual: !hasProductsLeft },
      ];
    });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.id) === productId);
    setItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              productId,
              sku: product?.sku || row.sku,
              unit_price:
                product?.unit_price != null
                  ? String(product.unit_price)
                  : product?.price != null
                    ? String(product.price)
                    : row.unit_price,
            }
          : row,
      ),
    );
    if (errors[`item-${index}-qty`])
      setErrors((prev) => ({ ...prev, [`item-${index}-qty`]: '' }));
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
      description: '',
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
    if (!form.vendorId) nextErrors.vendorId = 'Please select a vendor.';
    if (!form.description.trim())
      nextErrors.description = 'Please enter a description for this purchase order.';
    return nextErrors;
  };

  const validateItems = () => {
    const nextErrors: Record<string, string> = {};
    const hasValidItem = items.some((it) => it.sku.trim());
    if (!hasValidItem) {
      nextErrors.items = 'Please add at least one item before continuing.';
    } else {
      items.forEach((it, i) => {
        if (!it.sku.trim()) return;
        if (!it.qty_ordered || Number(it.qty_ordered) <= 0) {
          nextErrors[`item-${i}-qty`] =
            'Please enter a quantity greater than 0.';
        }
        if (it.unit_price !== '' && Number(it.unit_price) < 0) {
          nextErrors[`item-${i}-price`] = 'Unit price can’t be negative.';
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

  const handleCreate = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        setStepIndex(i);
        toast.error('Please fix the highlighted fields.');
        return;
      }
    }

    const payload = {
      vendor_id: form.vendorId,
      purchase_title: form.description.trim(),
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
      if (isEditMode && editingPO) {
        await updatePurchaseOrder(editingPO.id, payload as any);
        toast.success('Purchase order updated successfully!');
      } else {
        await createPurchaseOrder(payload);
        toast.success('Purchase order created successfully!');
      }
      handleReset();
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Failed to save purchase order', error);
      const apiMessage =
        error?.response?.data?.message || error?.response?.data?.detail;
      toast.error(
        apiMessage ||
          `Failed to ${isEditMode ? 'update' : 'create'} purchase order.`,
      );
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
  const selectedCompanyName =
    companies.find(
      (c) => String(c.sellercloud_company_id || c.id) === form.companyId,
    )?.name || form.companyId;
  const selectedVendorName =
    vendors.find((v: any) => String(v.id) === form.vendorId)?.name ||
    form.vendorId;

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
            {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
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
          // The create-PO API is called only from the explicit "Create
          // Purchase Order" button's onClick (handleCreate) — never via
          // native form submission. This avoids a React/browser quirk
          // where clicking "Next" from the second-to-last step swaps this
          // same button's type to "submit" mid-click and can trigger an
          // immediate, unintended form submit.
          onSubmit={(e) => e.preventDefault()}
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
                    <label className={labelClass}>Company <span className="text-rose-500">*</span></label>
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
                    <label className={labelClass}>Vendor <span className="text-rose-500">*</span></label>
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
                  <div className="col-span-2">
                    <label className={labelClass}>Description <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={6}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Enter description"
                      className={`${inputClass} resize-y`}
                    />
                    {errors.description && (
                      <p className={errorClass}>{errors.description}</p>
                    )}
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
                </div>
                {errors.items && (
                  <p className={`${errorClass} mb-2`}>{errors.items}</p>
                )}
                {!form.vendorId && (
                  <p className="mb-2 text-[11px] text-slate-400">
                    Select a vendor on the General Info step to pick from
                    their product catalog, or add a manual item instead.
                  </p>
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
                      <div className="mb-2 flex items-center justify-between pr-6">
                        <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                          {it.isManual ? 'Manual Item' : 'Product Item'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setItemField(i, 'isManual', !it.isManual)
                          }
                          className="text-mc-black text-[11px] font-semibold underline decoration-dotted underline-offset-2"
                        >
                          {it.isManual
                            ? 'Pick from product list'
                            : 'Enter manually instead'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pr-6">
                        <div>
                          <label className={labelClass}>SKU <span className="text-rose-500">*</span></label>
                          {it.isManual ? (
                            <input
                              type="text"
                              value={it.sku}
                              onChange={(e) =>
                                setItemField(i, 'sku', e.target.value)
                              }
                              placeholder="Enter SKU"
                              className={`${inputClass} font-mono`}
                            />
                          ) : (
                            <ProductDropdown
                              value={it.productId}
                              onChange={(val) => handleSelectProduct(i, val)}
                              products={products.filter(
                                (p) =>
                                  String(p.id) === it.productId ||
                                  !items.some(
                                    (row, ri) =>
                                      ri !== i &&
                                      row.productId &&
                                      String(row.productId) === String(p.id),
                                  ),
                              )}
                              loading={isLoadingProducts}
                              disabled={!form.vendorId}
                              placeholder={
                                !form.vendorId
                                  ? 'Select a vendor first'
                                  : '-- Select product --'
                              }
                              emptyLabel="All products already added"
                              className={`${inputClass} font-mono`}
                            />
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>Qty Ordered <span className="text-rose-500">*</span></label>
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
                          {errors[`item-${i}-price`] && (
                            <p className={errorClass}>
                              {errors[`item-${i}-price`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="bg-mc-gold text-mc-black flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStepKey === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Info className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    {isEditMode
                      ? 'This order will be synced with Sellercloud once updated. Please review the details below before saving.'
                      : 'This order will be synced with Sellercloud once created. Please review the details below before creating.'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    General
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                      <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          Company
                        </p>
                        <p className="truncate text-xs font-bold text-slate-800">
                          {selectedCompanyName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                      <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          Vendor
                        </p>
                        <p className="truncate text-xs font-bold text-slate-800">
                          {selectedVendorName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">
                          Description
                        </p>
                        <p className="text-xs font-semibold whitespace-pre-wrap text-slate-700">
                          {form.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                      <Package className="h-3.5 w-3.5" />
                      Items ({validItems.length})
                    </h4>
                    <p className="text-xs font-bold text-slate-800">
                      Total: $
                      {validItems
                        .reduce(
                          (sum, it) =>
                            sum +
                            (Number(it.qty_ordered) || 0) *
                              (Number(it.unit_price) || 0),
                          0,
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {validItems.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
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
                type="button"
                onClick={handleCreate}
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
                {isSaving
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update Purchase Order'
                    : 'Create Purchase Order'}
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
