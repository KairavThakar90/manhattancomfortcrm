import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  Info,
  Copy,
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
}: {
  value: number | string;
  onChange: (value: number | string) => void;
  options: ThemedSelectOption[];
  className?: string;
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

  const selected = options.find(
    (opt) => String(opt.value) === String(value),
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${className || ''} flex items-center justify-between text-left`}
      >
        <span className="truncate">{selected ? selected.label : ''}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
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

const DISCOUNT_TYPE_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Percent (%)' },
  { value: 2, label: 'Fixed Amount ($)' },
];

const emptyAddress = {
  FirstName: '',
  LastName: '',
  MiddleName: '',
  ZipCode: '',
  City: '',
  Country: '',
  Business: '',
  AddressLine1: '',
  AddressLine2: '',
  Fax: '',
  Region: '',
  State: '',
  Phone: '',
};

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
  { key: 'billing', label: 'Billing Address' },
  { key: 'shipping', label: 'Shipping Address' },
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
    caseQtyMode: false,
    defaultWarehouseId: '',
    description: '',
    vendorNote: '',
    paymentTermId: '',
    expectedDeliveryDate: '',
  });
  const [billingAddress, setBillingAddress] = useState({ ...emptyAddress });
  const [shippingAddress, setShippingAddress] = useState({ ...emptyAddress });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [products, setProducts] = useState([{ ...emptyProductRow }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
      caseQtyMode: false,
      defaultWarehouseId: '',
      description: '',
      vendorNote: '',
      paymentTermId: '',
      expectedDeliveryDate: '',
    });
    setBillingAddress({ ...emptyAddress });
    setShippingAddress({ ...emptyAddress });
    setSameAsBilling(true);
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

    const finalShipping = sameAsBilling ? billingAddress : shippingAddress;

    const payload = {
      CompanyID: Number(form.companyId),
      VendorID: Number(form.vendorId) || (form.vendorId as unknown as number),
      POType: Number(form.poType),
      CaseQtyMode: form.caseQtyMode,
      DefaultWarehouseID: Number(form.defaultWarehouseId),
      Description: form.description.trim(),
      VendorNote: form.vendorNote.trim(),
      PaymentTermID: form.paymentTermId ? Number(form.paymentTermId) : 0,
      ExpectedDeliveryDate: new Date(
        form.expectedDeliveryDate,
      ).toISOString(),
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
      BillingAddress: billingAddress,
      ShippingAddress: finalShipping,
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
    'w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-800 transition-colors hover:border-black focus:border-black focus:outline-hidden focus:ring-0';
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';
  const errorClass = 'mt-1 text-[10px] font-semibold text-rose-500';

  const renderAddressFields = (
    address: typeof emptyAddress,
    setAddress: React.Dispatch<React.SetStateAction<typeof emptyAddress>>,
    disabled = false,
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>First Name</label>
        <input
          type="text"
          disabled={disabled}
          value={address.FirstName}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, FirstName: e.target.value }))
          }
          placeholder="First name"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Last Name</label>
        <input
          type="text"
          disabled={disabled}
          value={address.LastName}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, LastName: e.target.value }))
          }
          placeholder="Last name"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Middle Name</label>
        <input
          type="text"
          disabled={disabled}
          value={address.MiddleName}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, MiddleName: e.target.value }))
          }
          placeholder="Middle name"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Business</label>
        <input
          type="text"
          disabled={disabled}
          value={address.Business}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, Business: e.target.value }))
          }
          placeholder="Business name"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="text"
          disabled={disabled}
          value={address.Phone}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, Phone: e.target.value }))
          }
          placeholder="Phone number"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Fax</label>
        <input
          type="text"
          disabled={disabled}
          value={address.Fax}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, Fax: e.target.value }))
          }
          placeholder="Fax number"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Address Line 1</label>
        <input
          type="text"
          disabled={disabled}
          value={address.AddressLine1}
          onChange={(e) =>
            setAddress((prev) => ({
              ...prev,
              AddressLine1: e.target.value,
            }))
          }
          placeholder="Street address"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Address Line 2</label>
        <input
          type="text"
          disabled={disabled}
          value={address.AddressLine2}
          onChange={(e) =>
            setAddress((prev) => ({
              ...prev,
              AddressLine2: e.target.value,
            }))
          }
          placeholder="Apartment, suite, unit, etc. (optional)"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>City</label>
        <input
          type="text"
          disabled={disabled}
          value={address.City}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, City: e.target.value }))
          }
          placeholder="City"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>State</label>
        <input
          type="text"
          disabled={disabled}
          value={address.State}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, State: e.target.value }))
          }
          placeholder="State"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Region</label>
        <input
          type="text"
          disabled={disabled}
          value={address.Region}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, Region: e.target.value }))
          }
          placeholder="Region"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Zip Code</label>
        <input
          type="text"
          disabled={disabled}
          value={address.ZipCode}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, ZipCode: e.target.value }))
          }
          placeholder="Zip code"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
      <div>
        <label className={labelClass}>Country</label>
        <input
          type="text"
          disabled={disabled}
          value={address.Country}
          onChange={(e) =>
            setAddress((prev) => ({ ...prev, Country: e.target.value }))
          }
          placeholder="Country"
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>
    </div>
  );

  const currentStepKey = STEPS[stepIndex].key;
  const isLastStep = stepIndex === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="animate-scaleUp flex h-[92vh] w-full max-w-7xl flex-col rounded-2xl border border-slate-100 bg-white shadow-xl"
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
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Default Warehouse *</label>
                    <WarehouseInfiniteDropdown
                      value={form.defaultWarehouseId}
                      onChange={(val) => setField('defaultWarehouseId', val)}
                      placeholder="Select warehouse"
                      className={inputClass}
                    />
                    {errors.defaultWarehouseId && (
                      <p className={errorClass}>
                        {errors.defaultWarehouseId}
                      </p>
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
                  <div>
                    <label className={labelClass}>Payment Term ID</label>
                    <input
                      type="number"
                      min="0"
                      value={form.paymentTermId}
                      onChange={(e) =>
                        setField('paymentTermId', e.target.value)
                      }
                      placeholder="SellerCloud Payment Term ID"
                      className={inputClass}
                    />
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
                  <div className="col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      id="caseQtyMode"
                      type="checkbox"
                      checked={form.caseQtyMode}
                      onChange={(e) =>
                        setField('caseQtyMode', e.target.checked)
                      }
                      className="accent-mc-gold h-4 w-4 rounded"
                    />
                    <label
                      htmlFor="caseQtyMode"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Case Qty Mode
                    </label>
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
                        <div>
                          <label className={labelClass}>
                            Qty Cases Ordered
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={p.QtyCasesOrdered}
                            onChange={(e) =>
                              setProductField(
                                i,
                                'QtyCasesOrdered',
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Qty Units Per Case
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={p.QtyUnitsPerCase}
                            onChange={(e) =>
                              setProductField(
                                i,
                                'QtyUnitsPerCase',
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Case Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.CasePrice}
                            onChange={(e) =>
                              setProductField(i, 'CasePrice', e.target.value)
                            }
                            placeholder="0.00"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Discount Type</label>
                          <ThemedSelect
                            value={p.DiscountType}
                            onChange={(val) =>
                              setProductField(i, 'DiscountType', Number(val))
                            }
                            options={DISCOUNT_TYPE_OPTIONS}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Discount Value</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.DiscountValue}
                            onChange={(e) =>
                              setProductField(i, 'DiscountValue', e.target.value)
                            }
                            placeholder="0.00"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Warehouse (optional override)
                          </label>
                          <WarehouseInfiniteDropdown
                            value={p.WarehouseID}
                            onChange={(val) =>
                              setProductField(i, 'WarehouseID', val)
                            }
                            placeholder="Use default warehouse"
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

            {/* Step 3: Billing Address */}
            {currentStepKey === 'billing' && (
              <div>
                <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Billing Address
                </h4>
                {renderAddressFields(billingAddress, setBillingAddress)}
              </div>
            )}

            {/* Step 4: Shipping Address */}
            {currentStepKey === 'shipping' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Shipping Address
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSameAsBilling((prev) => !prev)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="accent-mc-gold h-3.5 w-3.5 rounded"
                    />
                    <Copy className="h-3 w-3" />
                    Same as billing address
                  </button>
                </div>
                {renderAddressFields(
                  sameAsBilling ? billingAddress : shippingAddress,
                  setShippingAddress,
                  sameAsBilling,
                )}
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
                    <dt className="text-slate-500">Case Qty Mode</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.caseQtyMode ? 'Yes' : 'No'}
                    </dd>
                    <dt className="text-slate-500">Default Warehouse</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.defaultWarehouseId || '—'}
                    </dd>
                    <dt className="text-slate-500">Expected Delivery</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.expectedDeliveryDate || '—'}
                    </dd>
                    <dt className="text-slate-500">Payment Term ID</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.paymentTermId || '0'}
                    </dd>
                    <dt className="text-slate-500">Description</dt>
                    <dd className="font-semibold text-slate-800">
                      {form.description || '—'}
                    </dd>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Products ({products.filter((p) => p.ProductID.trim()).length})
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
                            Units: {p.QtyUnitsOrdered || 0} · Cases:{' '}
                            {p.QtyCasesOrdered || 0}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Billing Address
                    </h4>
                    <p className="text-xs text-slate-700">
                      {[
                        `${billingAddress.FirstName} ${billingAddress.LastName}`.trim(),
                        billingAddress.AddressLine1,
                        billingAddress.City,
                        billingAddress.State,
                        billingAddress.ZipCode,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Shipping Address
                    </h4>
                    <p className="text-xs text-slate-700">
                      {sameAsBilling
                        ? 'Same as billing address'
                        : [
                            `${shippingAddress.FirstName} ${shippingAddress.LastName}`.trim(),
                            shippingAddress.AddressLine1,
                            shippingAddress.City,
                            shippingAddress.State,
                            shippingAddress.ZipCode,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                    </p>
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
