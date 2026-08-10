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
    <div className="bg-mc-black/30 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-in fade-in zoom-in-95 border-mc-beige-dark bg-mc-white flex w-full max-w-md flex-col rounded-xl border shadow-none">
        {/* Header */}
        <div className="border-mc-beige-dark flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 items-center justify-center rounded-lg">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-mc-black text-sm font-bold">
                Change Password
              </h2>
              <p className="text-mc-gray-soft text-[11px]">
                Set a new password for your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black rounded-lg p-1.5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* New Password */}
          <div>
            <label className="text-mc-black mb-1.5 block text-xs font-semibold">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Min. 8 characters"
                className={`w-full rounded-lg border py-2.5 pr-10 pl-3 text-sm transition focus:bg-white focus:outline-none ${
                  errors.password
                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500'
                    : 'border-mc-beige-dark bg-mc-white focus:border-mc-gold'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="text-mc-gray-soft hover:text-mc-black absolute top-1/2 right-2.5 -translate-y-1/2"
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
            <label className="text-mc-black mb-1.5 block text-xs font-semibold">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirm_password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                disabled={loading}
                placeholder="Re-enter new password"
                className={`w-full rounded-lg border py-2.5 pr-10 pl-3 text-sm transition focus:bg-white focus:outline-none ${
                  errors.confirm_password
                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500'
                    : 'border-mc-beige-dark bg-mc-white focus:border-mc-gold'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="text-mc-gray-soft hover:text-mc-black absolute top-1/2 right-2.5 -translate-y-1/2"
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
              className="bg-mc-beige-light text-mc-gray-soft hover:bg-mc-beige-dark hover:text-mc-black rounded-lg px-4 py-2 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-60"
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
