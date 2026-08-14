import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { patchUser } from '../services/user.service';
import { useCRM } from '../../../hooks/useCRM';

export default function UpdateProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useCRM();

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim())
      newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim())
      newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!user?.id) {
      toast.error('User ID not found');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        ...(formData.password ? { password: formData.password } : {}),
      };

      const updatedUser = await patchUser(user.id, payload);
      setUser(updatedUser);

      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="bg-mc-gray-dark/40 fixed inset-0 backdrop-blur-sm transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="bg-mc-white animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl p-6 shadow-2xl duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-mc-black text-xl font-extrabold tracking-tight">
              Update Profile
            </h2>
            <p className="text-mc-gray-soft mt-1 text-sm font-medium">
              Update your personal details below
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="hover:bg-mc-beige-light hover:text-mc-gold text-mc-gray-soft rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-mc-black mb-1 block text-xs font-bold">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-xl border p-3 text-sm outline-hidden transition ${errors.first_name ? 'border-rose-500 bg-rose-50/50' : ''}`}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="mt-1 text-[10px] font-bold text-rose-500">
                  {errors.first_name}
                </p>
              )}
            </div>
            <div>
              <label className="text-mc-black mb-1 block text-xs font-bold">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-xl border p-3 text-sm outline-hidden transition ${errors.last_name ? 'border-rose-500 bg-rose-50/50' : ''}`}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="mt-1 text-[10px] font-bold text-rose-500">
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-mc-black mb-1 block text-xs font-bold">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-xl border p-3 text-sm outline-hidden transition ${errors.email ? 'border-rose-500 bg-rose-50/50' : ''}`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-[10px] font-bold text-rose-500">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-mc-black mb-1 block text-xs font-bold">
              New Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-xl border p-3 text-sm outline-hidden transition"
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div className="border-mc-beige-dark mt-8 flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="hover:bg-mc-beige-light text-mc-gray-soft rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-mc-black text-mc-white flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg transition hover:bg-black disabled:opacity-70"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
