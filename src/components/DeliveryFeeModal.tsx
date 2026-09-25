import React, { useState, useEffect } from 'react';
import { Truck, X, Check, Trash2, MapPin, Tag, Eye, EyeOff } from 'lucide-react';
import { sound } from '../utils/audio';

interface DeliveryFeeModalProps {
  isOpen: boolean;
  currentFee: number;
  currentNotes?: string;
  isOneOff?: boolean;
  showOnReceipt?: boolean;
  currencySymbol: string;
  onClose: () => void;
  onSaveDeliveryFee: (fee: number, notes: string, isOneOff: boolean, showOnReceipt: boolean) => void;
}

const PRESET_FEES = [0, 3, 5, 8, 10, 15, 20];

export const DeliveryFeeModal: React.FC<DeliveryFeeModalProps> = ({
  isOpen,
  currentFee,
  currentNotes = '',
  isOneOff = true,
  showOnReceipt = true,
  currencySymbol,
  onClose,
  onSaveDeliveryFee,
}) => {
  const [feeInput, setFeeInput] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [oneOffMode, setOneOffMode] = useState<boolean>(true);
  const [showOnReceiptMode, setShowOnReceiptMode] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setFeeInput(currentFee > 0 ? currentFee.toString() : '5');
      setNotes(currentNotes || '');
      setOneOffMode(isOneOff ?? true);
      setShowOnReceiptMode(showOnReceipt ?? true);
    }
  }, [isOpen, currentFee, currentNotes, isOneOff, showOnReceipt]);

  if (!isOpen) return null;

  const parsedFee = parseFloat(feeInput) || 0;

  const handleDigit = (digit: string) => {
    sound.playKeyBeep(650, 0.03);
    if (digit === '.') {
      if (feeInput.includes('.')) return;
      setFeeInput((prev) => (prev ? prev + '.' : '0.'));
      return;
    }
    if (feeInput === '0') {
      setFeeInput(digit);
    } else {
      setFeeInput((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    sound.playKeyBeep(450, 0.03);
    if (feeInput.length <= 1) {
      setFeeInput('0');
    } else {
      setFeeInput((prev) => prev.slice(0, -1));
    }
  };

  const handleAddAmount = (add: number) => {
    sound.playKeyBeep(600, 0.03);
    const val = (parseFloat(feeInput) || 0) + add;
    setFeeInput(val.toFixed(2).replace(/\.00$/, ''));
  };

  const handleSelectPreset = (preset: number) => {
    sound.playKeyBeep(600, 0.03);
    setFeeInput(preset.toString());
  };

  const handleSave = () => {
    sound.playOkBeep();
    onSaveDeliveryFee(parsedFee, notes.trim(), oneOffMode, showOnReceiptMode);
    onClose();
  };

  const handleRemove = () => {
    sound.playVoidBeep();
    onSaveDeliveryFee(0, '', true, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">
                  Caj Penghantaran
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tetapkan kos penghantaran untuk pesanan ini
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Options Row: One-Off & Show on Receipt/PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {/* One-Off Option Indicator */}
            <div className="p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-cyan-200">
                    Mod One-Off
                  </div>
                  <div className="text-[10px] text-cyan-300/80 truncate">
                    Transaksi ini sahaja
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={oneOffMode}
                onChange={(e) => setOneOffMode(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer shrink-0 ml-1"
                title="Caj one-off"
              />
            </div>

            {/* Show on Receipt & PDF Toggle */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {showOnReceiptMode ? (
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200">
                    Papar di Resit
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {showOnReceiptMode ? 'Cetak baris caj' : 'Sembunyi baris caj'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playKeyBeep(600, 0.03);
                  setShowOnReceiptMode(!showOnReceiptMode);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0 ml-1 ${
                  showOnReceiptMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {showOnReceiptMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Amount Display */}
          <div className="mt-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              AMAUN CAJ PENGHANTARAN
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-400 mt-0.5">
              {currencySymbol}{parsedFee.toFixed(2)}
            </div>
            {parsedFee === 0 && (
              <span className="inline-block mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Percuma (Free Delivery)
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Pilihan Pantas (Presets)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_FEES.map((amt) => {
                const isSelected = parsedFee === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectPreset(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700/80'
                    }`}
                  >
                    {amt === 0 ? 'FREE' : `${currencySymbol}${amt}`}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleAddAmount(1)}
                className="py-2 px-1 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700/80 cursor-pointer active:scale-95"
              >
                +RM1
              </button>
            </div>
          </div>

          {/* Keypad for custom one-off fee */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 max-w-[320px] mx-auto w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-10 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-base font-bold text-white shadow-sm border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 font-mono"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleDigit('.')}
              className="h-10 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-base font-bold text-white shadow-sm border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 font-mono"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-10 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-base font-bold text-white shadow-sm border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-850 text-slate-300 text-sm font-bold border border-slate-700/60 flex items-center justify-center cursor-pointer active:scale-95 font-mono"
            >
              ←
            </button>
          </div>

          {/* Delivery Note / Rider / Address */}
          <div className="mt-3">
            <label className="text-[11px] font-bold text-slate-400 block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Alamat / Nota Penghantaran (Pilihan):</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Saujana Impian, Runner Ali, Hantar jam 2pm"
              className="w-full bg-slate-950 text-slate-200 placeholder-slate-500 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
          {currentFee > 0 ? (
            <button
              type="button"
              onClick={handleRemove}
              className="col-span-1 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Padam</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="col-span-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-700 active:scale-95"
            >
              Batal
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className={`${
              currentFee > 0 ? 'col-span-2' : 'col-span-2'
            } py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/60 border border-cyan-400/40 active:scale-95`}
          >
            <Check className="w-4 h-4" />
            <span>Sahkan ({currencySymbol}{parsedFee.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
