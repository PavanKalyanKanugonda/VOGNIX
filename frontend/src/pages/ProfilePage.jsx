import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { addressAPI, authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { User, MapPin, Plus, Trash2, CheckCircle2, Edit3, Home, Briefcase, X } from 'lucide-react';

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  streetAddress: '',
  locality: '',
  city: '',
  state: '',
  postalCode: '',
  addressType: 'HOME',
  isDefault: false,
};

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Address book states
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const loadAddresses = useCallback(async () => {
    setAddressLoading(true);
    try {
      const res = await addressAPI.getAddresses();
      setAddresses(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddressLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data);
      showToast('Profile information updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setNewAddress(EMPTY_ADDRESS);
    setIsModalOpen(true);
  };

  const openEditAddressModal = (addr) => {
    setEditingAddressId(addr.id);
    setNewAddress({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      streetAddress: addr.streetAddress || '',
      locality: addr.locality || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      addressType: addr.addressType || 'HOME',
      isDefault: Boolean(addr.isDefault),
    });
    setIsModalOpen(true);
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddressId) {
        await addressAPI.updateAddress(editingAddressId, newAddress);
        showToast('Delivery address updated!', 'success');
      } else {
        await addressAPI.addAddress(newAddress);
        showToast('Delivery address saved!', 'success');
      }
      setIsModalOpen(false);
      setEditingAddressId(null);
      setNewAddress(EMPTY_ADDRESS);
      loadAddresses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await addressAPI.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address deleted successfully', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await addressAPI.setDefault(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      );
      showToast('Default address updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Account & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage your personal credentials, contact numbers, and delivery addresses</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'profile' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-black'
          }`}
        >
          Personal Profile
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'addresses' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-black'
          }`}
        >
          Delivery Address Book ({addresses.length})
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center shrink-0">
              {user?.firstName?.[0] || 'V'}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">{user?.firstName} {user?.lastName}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <div className="flex gap-2 mt-1">
                {user?.roles?.map((r) => (
                  <span key={r} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs font-medium pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">First Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Last Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 font-medium cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Account email cannot be modified.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Contact Phone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-3 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {profileSaving ? 'Saving...' : 'Update Profile Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address Book Tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openAddAddressModal}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Address
            </button>
          </div>

          {addressLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">No addresses saved yet. Click the button above to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        {addr.addressType === 'HOME' ? <Home className="w-3.5 h-3.5 text-slate-400" /> : <Briefcase className="w-3.5 h-3.5 text-slate-400" />}
                        {addr.fullName}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full">
                          DEFAULT ADDRESS
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {addr.streetAddress}, {addr.locality && `${addr.locality}, `}
                      {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">Mobile: {addr.phone}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {!addr.isDefault ? (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-slate-600 font-bold hover:text-black transition-colors"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Primary
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditAddressModal(addr)}
                        className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Recipient Name"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="Flat, House no., Apartment"
                  value={newAddress.streetAddress}
                  onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">City</label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">PIN Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">State</label>
                <input
                  type="text"
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-950 text-white font-bold uppercase tracking-wider hover:bg-slate-800"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
