import React, { useState } from 'react';
import { Customer } from '../types';
import { Users, Plus, Check, Phone, ArrowLeft, Tag, Edit, Trash2, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface CustomerSelectModalProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customer: Customer) => void;
  onAddNewCustomer: (newCustomer: Customer) => void;
  onUpdateCustomer?: (updatedCustomer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onClose: () => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddNewCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onClose,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<Customer['type']>('tetap');
  const [discountPercent, setDiscountPercent] = useState<string>('0');

  const handleOpenAddNew = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setType('tetap');
    setDiscountPercent('0');
    setIsAddingNew(true);
  };

  const handleOpenEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setType(c.type || 'tetap');
    setDiscountPercent(c.discountPercent ? String(c.discountPercent) : '0');
    setIsAddingNew(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    sound.playKeyBeep(700, 0.05);

    const discount = parseFloat(discountPercent) || 0;

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim() || undefined,
        type,
        discountPercent: discount,
      };
      if (onUpdateCustomer) {
        onUpdateCustomer(updated);
      }
      if (selectedCustomerId === editingCustomer.id) {
        onSelectCustomer(updated);
      }
    } else {
      const newCustomer: Customer = {
        id: `c_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim() || undefined,
        type,
        discountPercent: discount,
      };
      onAddNewCustomer(newCustomer);
      onSelectCustomer(newCustomer);
    }

    setIsAddingNew(false);
    setEditingCustomer(null);
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    sound.playVoidBeep();
    if (onDeleteCustomer) {
      onDeleteCustomer(customerToDelete.id);
    }
    setCustomerToDelete(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
              {isAddingNew
                ? editingCustomer
                  ? 'EDIT MAKLUMAT PELANGGAN'
                  : 'TAMBAH PELANGGAN BARU'
                : 'PILIH PELANGGAN'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer font-bold transition border border-slate-700/60"
          >
            Tutup
          </button>
        </div>

        {/* Content */}
        {!isAddingNew ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* Quick Add Button */}
            <button
              onClick={handleOpenAddNew}
              className="w-full py-3 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-2 mb-3.5 cursor-pointer shadow-sm active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan / Restoran Baru</span>
            </button>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-700 pr-1">
              {customers.map((c) => {
                const isSelected = c.id === selectedCustomerId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      sound.playKeyBeep(600, 0.04);
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl text-left transition flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 border-slate-700/70 text-slate-300'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.type === 'runcit' && (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                            Default
                          </span>
                        )}
                        {c.type === 'restoran' && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            Restoran
                          </span>
                        )}
                        {c.type === 'tetap' && (
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                            Tetap
                          </span>
                        )}
                        {c.type === 'pemborong' && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                            Pemborong
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        {c.phone && <span>📞 {c.phone}</span>}
                        {c.discountPercent ? (
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Diskaun: {c.discountPercent}%
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}

                      {/* Edit Customer Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(c, e)}
                        className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition cursor-pointer active:scale-95"
                        title="Ubah Pelanggan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Customer Button (if not default) */}
                      {c.id !== 'c_default' && onDeleteCustomer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playKeyBeep(450, 0.04);
                            setCustomerToDelete(c);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer active:scale-95"
                          title="Padam Pelanggan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveForm} className="p-4 space-y-3.5 text-xs overflow-y-auto">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                Nama Pelanggan / Kedai
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Warung Kak Som / Restoran Ali"
                className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                No. Telefon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 012-3456789"
                className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Kategori
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="tetap">Pelanggan Tetap</option>
                  <option value="restoran">Restoran / Warung</option>
                  <option value="pemborong">Pemborong / Katering</option>
                  <option value="runcit">Runcit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Diskaun (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingCustomer(null);
                }}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="submit"
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
              >
                {editingCustomer ? 'Simpan Perubahan' : 'Simpan & Pilih'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Delete Modal in Customer Select */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">PADAM PELANGGAN INI?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak boleh diundur.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <div className="font-bold text-slate-100 text-sm">{customerToDelete.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Jenis: <span className="capitalize">{customerToDelete.type}</span>
                {customerToDelete.phone && ` • Tel: ${customerToDelete.phone}`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
