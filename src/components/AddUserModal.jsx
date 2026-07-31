import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { createUser } from '../services/user.service';

export default function AddUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';

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
        role: 'User', // default role if required by backend, or omit
      };

      // Ensure full_name or username if API expects it
      payload.full_name = `${payload.first_name} ${payload.last_name}`;
      payload.username = payload.email.split('@')[0];

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                Add New User
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Create a new system user profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="e.g. Jane"
              className={`w-full px-3 py-2 text-sm bg-slate-50 border ${errors.firstName ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.firstName && (
              <p className="text-rose-500 text-[10px] mt-1 font-medium">
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="e.g. Doe"
              className={`w-full px-3 py-2 text-sm bg-slate-50 border ${errors.lastName ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.lastName && (
              <p className="text-rose-500 text-[10px] mt-1 font-medium">
                {errors.lastName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="e.g. jane@company.com"
              className={`w-full px-3 py-2 text-sm bg-slate-50 border ${errors.email ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.email && (
              <p className="text-rose-500 text-[10px] mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((p) => ({ ...p, password: e.target.value }))
              }
              placeholder="Create a strong password"
              className={`w-full px-3 py-2 text-sm bg-slate-50 border ${errors.password ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-lg focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.password && (
              <p className="text-rose-500 text-[10px] mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 mt-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold bg-white hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save User
          </button>
        </div>
      </div>
    </div>
  );
}
