import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, UserPlus, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { createUser } from '../services/user.service';
import { fetchVendorsPage } from '../../../store/vendorSlice';
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
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm transition-colors focus:outline-none ${error ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
          onClick={() => setIsOpen(!isOpen)}
          tabIndex={0}
        >
          <span
            className={selectedOption ? 'text-slate-800' : 'text-slate-500'}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            className="absolute z-[9999] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-slate-50 ${value === opt.value ? 'bg-indigo-50/50 font-medium text-indigo-600' : 'text-slate-700'}`}
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

export default function AddUserModal({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const vendors = useSelector((state) => state.vendors.list) || [];
  const vendorsLoading = useSelector((state) => state.vendors.loading);
  const countryOptions = useMemo(() => countryList().getData(), []);

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#f8fafc',
      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
      borderRadius: '0.5rem',
      padding: '0 4px',
      minHeight: '38px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#64748b',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1e293b',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#eef2ff'
        : state.isFocused
          ? '#f8fafc'
          : 'white',
      color: state.isSelected ? '#4f46e5' : '#334155',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#eef2ff',
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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'admin',
    vendorId: '',
    country: 'USA',
    phone: '',
    payment_terms: 'Net 30',
    container_lead_time_days: 14,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (formData.role === 'vendor') {
      dispatch(fetchVendorsPage({ page: 1, pageSize: 50, search: '' }));
    }
  }, [formData.role, dispatch]);

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
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    if (formData.role === 'vendor' && !formData.vendorId)
      newErrors.vendorId = 'Vendor is required';

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
        password: formData.password,
        role: formData.role,
      };

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

      await createUser(payload);
      toast.success('User created successfully');
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg leading-tight font-bold text-slate-800">
                Add New User
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Create a new system user profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, firstName: e.target.value }));
                if (errors.firstName)
                  setErrors((p) => ({ ...p, firstName: undefined }));
              }}
              placeholder="e.g. Jane"
              className={`w-full border bg-slate-50 px-3 py-2 text-sm ${errors.firstName ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg transition-colors focus:ring-2 focus:outline-none`}
            />
            {errors.firstName && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, lastName: e.target.value }));
                if (errors.lastName)
                  setErrors((p) => ({ ...p, lastName: undefined }));
              }}
              placeholder="e.g. Doe"
              className={`w-full border bg-slate-50 px-3 py-2 text-sm ${errors.lastName ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg transition-colors focus:ring-2 focus:outline-none`}
            />
            {errors.lastName && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.lastName}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Role <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={formData.role}
              onChange={(val) => {
                setFormData((p) => ({
                  ...p,
                  role: val,
                  vendorId: val === 'vendor' ? p.vendorId : '',
                }));
              }}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'vendor', label: 'Vendor' },
              ]}
              placeholder="Select role"
            />
          </div>

          {formData.role === 'vendor' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                  }}
                  containerStyle={{ width: '100%' }}
                  dropdownStyle={{
                    position: 'absolute',
                    zIndex: 9999,
                    backgroundColor: 'white',
                  }}
                  buttonStyle={{
                    borderRadius: '0.5rem 0 0 0.5rem',
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData((p) => ({ ...p, email: e.target.value }));
                if (errors.email)
                  setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="e.g. jane@company.com"
              className={`w-full border bg-slate-50 px-3 py-2 text-sm ${errors.email ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg transition-colors focus:ring-2 focus:outline-none`}
            />
            {errors.email && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData((p) => ({ ...p, password: e.target.value }));
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Create a strong password"
              className={`w-full border bg-slate-50 px-3 py-2 text-sm ${errors.password ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg transition-colors focus:ring-2 focus:outline-none`}
            />
            {errors.password && (
              <p className="mt-1 text-[10px] font-medium text-rose-500">
                {errors.password}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save User
          </button>
        </div>
      </div>
    </div>
  );
}
