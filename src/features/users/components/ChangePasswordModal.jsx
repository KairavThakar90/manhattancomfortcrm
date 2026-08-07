import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/api';
import { AUTH_UPDATE_PASSWORD } from '../../../utils/endpoints';

export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    if (!form.confirm_password)
      errs.confirm_password = 'Please confirm your password.';
    else if (form.password !== form.confirm_password)
      errs.confirm_password = 'Passwords do not match.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(AUTH_UPDATE_PASSWORD, {
        password: form.password,
        confirm_password: form.confirm_password,
      });
      toast.success('Password updated successfully!');
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to update password. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Change Password
              </h2>
              <p className="text-[11px] text-slate-400">
                Set a new password for your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Min. 8 characters"
                className={`w-full rounded-lg border py-2.5 pr-10 pl-3 text-sm transition focus:bg-white focus:outline-none ${
                  errors.password
                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50 focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-500">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Re-enter new password"
                className={`w-full rounded-lg border py-2.5 pr-10 pl-3 text-sm transition focus:bg-white focus:outline-none ${
                  errors.confirm_password
                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50 focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-rose-500">
                {errors.confirm_password}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
