import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, UserPlus, Loader2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { createUser, updateUser } from '../services/user.service';
import { fetchVendorsPage } from '../../../store/vendorSlice';
import { getWarehouses } from '../../../services/warehouse.service';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Select from 'react-select';
import countryList from 'react-select-country-list';

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  error,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      const isOutsideTrigger =
        dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsideMenu =
        menuRef.current && !menuRef.current.contains(event.target);
      if (isOutsideTrigger && (!menuRef.current || isOutsideMenu)) {
        setIsOpen(false);
      }
    }
    const handleClose = () => setIsOpen(false);
    const handleScroll = (event) => {
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleScroll, true); // Catch internal modal scroll
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      setRect(dropdownRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  const selectedOption = options.find(
    (opt) =>
      String(opt.value) === String(value) &&
      value !== '' &&
      value !== undefined,
  );

  return (
    <>
      <div className={`relative ${className || ''}`} ref={dropdownRef}>
        <div
          className={`bg-mc-white flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${error ? 'border-rose-300 focus:ring-rose-500' : 'border-mc-beige-dark hover:border-mc-gold focus:ring-mc-gold focus:ring-2'}`}
          onClick={() => setIsOpen(!isOpen)}
          tabIndex={0}
        >
          <span
            className={selectedOption ? 'text-mc-black' : 'text-mc-gray-soft'}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`text-mc-gray-soft h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      {isOpen &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
              width: rect.width,
            }}
            className="border-mc-beige-dark bg-mc-white absolute z-[9999] max-h-60 overflow-y-auto rounded-lg border py-1 shadow-none"
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`hover:bg-mc-beige-light cursor-pointer px-3 py-2 text-sm transition-colors ${value === opt.value ? 'bg-mc-beige-light text-mc-black font-bold' : 'text-mc-gray-dark'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function AddUserModal({ user = null, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const vendors = useSelector((state) => state.vendors.list) || [];
  const vendorsLoading = useSelector((state) => state.vendors.loading);
  const countryOptions = useMemo(() => countryList().getData(), []);

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#ffffff',
      borderColor: state.isFocused ? '#c9963a' : '#e7dbc6',
      borderRadius: '0.5rem',
      padding: '0',
      minHeight: '38px',
      fontSize: '0.875rem',
      boxShadow: state.isFocused ? '0 0 0 1px #c9963a' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#c9963a' : '#c9963a',
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
      color: '#333333',
      fontSize: '0.875rem',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1a1a1a',
      fontSize: '0.875rem',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#f6efe1'
        : state.isFocused
          ? '#f6efe1'
          : 'white',
      color: state.isSelected ? '#000000' : '#1a1a1a',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '8px 12px',
      '&:active': {
        backgroundColor: '#e7dbc6',
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow: 'none',
      border: '1px solid #e7dbc6',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'admin',
    vendorId: user?.vendor_id || '',
    warehouseId: user?.warehouse_id || '',
    country: user?.country || 'USA',
    phone: user?.phone || '',
    payment_terms: user?.payment_terms || 'Net 30',
    container_lead_time_days: user?.container_lead_time_days || 14,
    notify_new_user: user?.notify_new_user || false,
    notify_trucker_email: user?.notify_trucker_email || false,
    notify_invoice_delayed: user?.notify_invoice_delayed || false,
    notify_shipment_delayed: user?.notify_shipment_delayed || false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(
    user?.role === 'warehouse',
  );

  // Fetch role-dependent data when user prop changes (edit mode: role-specific dropdowns)
  useEffect(() => {
    if (!user) return;
    if (user.role === 'vendor') {
      dispatch(fetchVendorsPage({ page: 1, pageSize: 50, search: '' }));
    } else if (user.role === 'warehouse') {
      (async () => {
        setWarehousesLoading(true);
        try {
          const data = await getWarehouses();
          setWarehouses(data?.results || data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setWarehousesLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8)
        newErrors.password = 'Password must be at least 8 characters';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.role === 'vendor' && !formData.vendorId)
      newErrors.vendorId = 'Vendor is required';
    if (formData.role === 'warehouse' && !formData.warehouseId)
      newErrors.warehouseId = 'Warehouse is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: formData.role,
        notify_new_user: formData.notify_new_user,
        notify_trucker_email: formData.notify_trucker_email,
        notify_invoice_delayed: formData.notify_invoice_delayed,
        notify_shipment_delayed: formData.notify_shipment_delayed,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      // Ensure full_name or username if API expects it
      payload.full_name = `${payload.first_name} ${payload.last_name}`;
      payload.username = payload.email.split('@')[0];

      if (formData.role === 'vendor') {
        payload.vendor_id = formData.vendorId;
        payload.country = formData.country;
        payload.phone = formData.phone;
        payload.payment_terms = formData.payment_terms;
        payload.container_lead_time_days = formData.container_lead_time_days;
      }
      if (formData.role === 'warehouse') {
        payload.warehouse_id = formData.warehouseId;
      }

      if (user) {
        await updateUser(user.id, payload);
        toast.success('User updated successfully');
      } else {
        await createUser(payload);
        toast.success('User created successfully');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create user:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create user';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in bg-mc-black/30 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="border-mc-beige-dark relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-white shadow-none">
        <div className="border-mc-beige-dark bg-mc-white flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-mc-beige-light text-mc-black flex h-10 w-10 items-center justify-center rounded-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-mc-black text-lg leading-tight font-bold">
                {user ? 'Edit User' : 'Add New User'}
              </h3>
              <p className="text-mc-gray-soft text-xs font-medium">
                {user
                  ? 'Update system user profile'
                  : 'Create a new system user profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black rounded-lg p-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <div>
            <label className="text-mc-black mb-1 block text-xs font-semibold">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoComplete="new-password"
              value={formData.firstName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, firstName: e.target.value }));
                if (errors.firstName)
                  setErrors((p) => ({ ...p, firstName: undefined }));
              }}
              placeholder="e.g. Jane"
              className={`bg-mc-white w-full border px-3 py-2 text-sm ${errors.firstName ? 'border-rose-300 focus:ring-rose-500' : 'border-mc-beige-dark focus:ring-mc-gold focus:border-mc-gold'} rounded-lg transition-colors focus:ring-1 focus:outline-none`}
            />
            {errors.firstName && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label className="text-mc-black mb-1 block text-xs font-semibold">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoComplete="new-password"
              value={formData.lastName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, lastName: e.target.value }));
                if (errors.lastName)
                  setErrors((p) => ({ ...p, lastName: undefined }));
              }}
              placeholder="e.g. Doe"
              className={`bg-mc-white w-full border px-3 py-2 text-sm ${errors.lastName ? 'border-rose-300 focus:ring-rose-500' : 'border-mc-beige-dark focus:ring-mc-gold focus:border-mc-gold'} rounded-lg transition-colors focus:ring-1 focus:outline-none`}
            />
            {errors.lastName && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.lastName}
              </p>
            )}
          </div>

          <div>
            <label className="text-mc-black mb-1 block text-xs font-semibold">
              Role <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={formData.role}
              onChange={(val) => {
                setFormData((p) => ({
                  ...p,
                  role: val,
                  vendorId: val === 'vendor' ? p.vendorId : '',
                  warehouseId: val === 'warehouse' ? p.warehouseId : '',
                }));

                if (val === 'vendor') {
                  dispatch(
                    fetchVendorsPage({ page: 1, pageSize: 50, search: '' }),
                  );
                } else if (val === 'warehouse') {
                  setWarehousesLoading(true);
                  getWarehouses()
                    .then((data) => {
                      setWarehouses(data?.results || data || []);
                    })
                    .catch((err) => {
                      console.error('Failed to fetch warehouses:', err);
                      toast.error('Failed to fetch warehouses');
                    })
                    .finally(() => {
                      setWarehousesLoading(false);
                    });
                }
              }}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'vendor', label: 'Vendor' },
                { value: 'office', label: 'Office' },
                { value: 'warehouse', label: 'Warehouse' },
              ]}
              placeholder="Select role"
            />
          </div>

          {formData.role === 'warehouse' && (
            <div>
              <label className="text-mc-black mb-1 block text-xs font-semibold">
                Warehouse <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={formData.warehouseId}
                onChange={(val) => {
                  setFormData((p) => ({ ...p, warehouseId: val }));
                  if (errors.warehouseId)
                    setErrors((p) => ({ ...p, warehouseId: undefined }));
                }}
                options={warehouses.map((w) => ({
                  value: w.id,
                  label: w.name || w.warehouse_name || String(w.id),
                }))}
                placeholder={
                  warehousesLoading ? 'Loading...' : 'Select a warehouse'
                }
                error={errors.warehouseId}
              />
              {errors.warehouseId && (
                <p className="mt-1 text-[10px] font-medium text-rose-500">
                  {errors.warehouseId}
                </p>
              )}
            </div>
          )}

          {formData.role === 'vendor' && (
            <>
              <div>
                <label className="text-mc-black mb-1 block text-xs font-semibold">
                  Vendor <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formData.vendorId}
                  onChange={(val) => {
                    setFormData((p) => ({ ...p, vendorId: val }));
                    if (errors.vendorId)
                      setErrors((p) => ({ ...p, vendorId: undefined }));
                  }}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name}${v.country ? ` (${v.country})` : ''}`,
                  }))}
                  placeholder={
                    vendorsLoading ? 'Loading vendors...' : 'Select a vendor'
                  }
                  error={errors.vendorId}
                />
                {errors.vendorId && (
                  <p className="mt-1 text-[10px] font-medium text-rose-500">
                    {errors.vendorId}
                  </p>
                )}
              </div>

              <div>
                <label className="text-mc-black mb-1 block text-xs font-semibold">
                  Country
                </label>

                <Select
                  value={countryOptions.find(
                    (c) =>
                      c.label === formData.country ||
                      c.value === formData.country,
                  )}
                  onChange={(option) =>
                    setFormData((p) => ({
                      ...p,
                      country: option ? option.label : '',
                    }))
                  }
                  options={countryOptions}
                  styles={reactSelectStyles}
                  placeholder="Select country"
                  isSearchable
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="relative z-50">
                <label className="text-mc-black mb-1 block text-xs font-semibold">
                  Phone
                </label>
                <PhoneInput
                  country={'us'}
                  value={formData.phone}
                  onChange={(phone) => setFormData((p) => ({ ...p, phone }))}
                  inputStyle={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '0.5rem',
                    backgroundColor: '#ffffff',
                    borderColor: '#e7dbc6',
                  }}
                  containerStyle={{ width: '100%' }}
                  dropdownStyle={{
                    position: 'absolute',
                    zIndex: 9999,
                    backgroundColor: 'white',
                  }}
                  buttonStyle={{
                    borderRadius: '0.5rem 0 0 0.5rem',
                    borderColor: '#e7dbc6',
                    backgroundColor: '#f6efe1',
                  }}
                />
              </div>

              <div>
                <label className="text-mc-black mb-1 block text-xs font-semibold">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      payment_terms: e.target.value,
                    }))
                  }
                  placeholder="e.g. Net 30"
                  className="border-mc-beige-dark bg-mc-white focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-mc-black mb-1 block text-xs font-semibold">
                  Container Lead Time (Days)
                </label>
                <input
                  type="number"
                  value={formData.container_lead_time_days}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      container_lead_time_days: e.target.value
                        ? parseInt(e.target.value)
                        : '',
                    }))
                  }
                  placeholder="14"
                  className="border-mc-beige-dark bg-mc-white focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-mc-black mb-1 block text-xs font-semibold">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              autoComplete="new-password"
              value={formData.email}
              onChange={(e) => {
                setFormData((p) => ({ ...p, email: e.target.value }));
                if (errors.email)
                  setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="e.g. jane@company.com"
              className={`bg-mc-white w-full border px-3 py-2 text-sm ${errors.email ? 'border-rose-300 focus:ring-rose-500' : 'border-mc-beige-dark focus:border-mc-gold focus:ring-mc-gold'} rounded-lg transition-colors focus:ring-1 focus:outline-none`}
            />
            {errors.email && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-mc-black mb-1 block text-xs font-semibold">
              Password {!user && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, password: e.target.value }));
                  if (errors.password)
                    setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder={
                  user
                    ? 'Leave blank to keep unchanged'
                    : 'Create a strong password'
                }
                className={`bg-mc-white w-full border py-2 pr-10 pl-3 text-sm ${
                  errors.password
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-mc-beige-dark focus:border-mc-gold focus:ring-mc-gold'
                } rounded-lg transition-colors focus:ring-1 focus:outline-none`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-mc-gray-soft hover:text-mc-black absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.password}
              </p>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="border-mc-beige-dark col-span-1 mt-2 border-t pt-4 sm:col-span-2">
            <h4 className="text-mc-black mb-3 text-xs font-semibold tracking-wider uppercase">
              Notification Preferences
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { key: 'notify_new_user', label: 'Notify New User' },
                { key: 'notify_trucker_email', label: 'Notify Trucker Email' },
                {
                  key: 'notify_invoice_delayed',
                  label: 'Notify Invoice Delayed',
                },
                {
                  key: 'notify_shipment_delayed',
                  label: 'Notify Shipment Delayed',
                },
              ].map((pref) => (
                <label
                  key={pref.key}
                  className="group flex cursor-pointer items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!!formData[pref.key]}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        [pref.key]: e.target.checked,
                      }))
                    }
                    className="border-mc-beige-dark h-4 w-4 cursor-pointer rounded text-black accent-black transition-colors focus:ring-black"
                  />
                  <span className="text-mc-gray-dark group-hover:text-mc-black font-medium transition-colors">
                    {pref.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-mc-beige-dark bg-mc-white mt-auto flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-mc-beige-light text-mc-gray-soft hover:bg-mc-beige-dark hover:text-mc-black rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold shadow-none transition hover:opacity-80 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {user ? 'Save Changes' : 'Save User'}
          </button>
        </div>
      </div>
    </div>
  );
}
