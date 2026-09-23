import React, { useState } from 'react';
import { Product, UnitType } from '../types';
import { ArrowLeft, Delete, Scale, ChevronDown, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface QuantityKeypadModalProps {
  product: Product;
  enteredPrice: number;
  currencySymbol: string;
  onCancel: () => void;
  onConfirmQuantity: (quantity: number, unit: UnitType) => void;
}

export const QuantityKeypadModal: React.FC<QuantityKeypadModalProps> = ({
  product,
  enteredPrice,
  currencySymbol,
  onCancel,
  onConfirmQuantity,
}) => {
  const [unit, setUnit] = useState<UnitType>(product.defaultUnit || 'kg');
  const [qtyStr, setQtyStr] = useState<string>('1.00');
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState<boolean>(false);

  const availableUnits: { type: UnitType; label: string }[] = [
    { type: 'kg', label: 'Kilogram (kg)' },
    { type: 'ekor', label: 'Ekor' },
    { type: 'pkt', label: 'Paket (pkt)' },
    { type: 'set', label: 'Set' },
  ];

  const handleDigit = (digit: string) => {
    sound.playKeyBeep(680, 0.04);
    if (isFirstInput) {
      if (digit === '.') {
        setQtyStr('0.');
      } else {
        setQtyStr(digit);
      }
      setIsFirstInput(false);
      return;
    }

    if (digit === '.') {
      if (qtyStr.includes('.')) return;
      setQtyStr(qtyStr + '.');
      return;
    }

    // Limit decimal places
    if (qtyStr.includes('.')) {
      const parts = qtyStr.split('.');
      if (parts[1] && parts[1].length >= 3) return;
    }

    if (qtyStr.length >= 7) return;

    if (qtyStr === '0' && digit !== '.') {
      setQtyStr(digit);
    } else {
      setQtyStr(qtyStr + digit);
    }
  };

  const handleBackspace = () => {
    sound.playKeyBeep(450, 0.04);
    if (isFirstInput) {
      setQtyStr('');
      setIsFirstInput(false);
      return;
    }
    if (qtyStr.length <= 1) {
      setQtyStr('');
    } else {
      setQtyStr(qtyStr.slice(0, -1));
    }
  };

  const handleQuickAdd = (delta: number) => {
    sound.playKeyBeep(600, 0.04);
    const curr = parseFloat(qtyStr) || 0;
    const newVal = Math.max(0.1, curr + delta);
    setQtyStr(newVal % 1 === 0 ? newVal.toFixed(1) : newVal.toFixed(2));
    setIsFirstInput(false);
  };

  const handleQuickSet = (val: number) => {
    sound.playKeyBeep(600, 0.04);
    setQtyStr(val.toFixed(2));
    setIsFirstInput(false);
  };

  const handleOk = () => {
    const finalQty = parseFloat(qtyStr);
    if (isNaN(finalQty) || finalQty <= 0) {
      sound.playVoidBeep();
      return;
    }
    sound.playOkBeep();
    onConfirmQuantity(finalQty, unit);
  };

  const currentQtyNum = parseFloat(qtyStr) || 0;
  const currentTotal = currentQtyNum * enteredPrice;
  const displayVal = qtyStr || '0.00';

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Top Bar with Back Arrow + Product Name */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <button
          id="qty-back-btn"
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
          <span className="font-bold text-sm text-slate-100">{product.name}</span>
        </button>

        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full">
          Langkah 3/3
        </span>
      </div>

      {/* Main Input Display */}
      <div className="p-4 flex flex-col gap-2.5">
        {/* Label & Unit Selector Dropdown matching diagram */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider relative">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>MASUKKAN KUANTITI</span>
          </div>

          {/* Unit Selector Button (e.g. kg v) */}
          <div className="relative">
            <button
              id="unit-selector-dropdown-btn"
              onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:bg-emerald-500/30 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span className="uppercase">{unit}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isUnitDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-850 border border-slate-700 rounded-2xl shadow-2xl z-30 py-1 divide-y divide-slate-750">
                {availableUnits.map((u) => (
                  <button
                    key={u.type}
                    onClick={() => {
                      setUnit(u.type);
                      setIsUnitDropdownOpen(false);
                      sound.playKeyBeep(550, 0.03);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      unit === u.type
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <span>{u.label}</span>
                    {unit === u.type && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Large White Display Box matching diagram */}
        <div className="w-full bg-slate-950 text-slate-100 rounded-2xl p-3.5 sm:p-4 text-right shadow-inner flex items-baseline justify-between border border-slate-700/80">
          <span className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">
            {unit}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400">
            {displayVal}
          </span>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between text-xs shadow-sm">
          <div className="text-slate-300 font-medium font-mono">
            {displayVal} {unit} × {currencySymbol}{enteredPrice.toFixed(2)}
          </div>
          <div className="text-emerald-400 font-black font-mono text-sm">
            = {currencySymbol}{currentTotal.toFixed(2)}
          </div>
        </div>

        {/* Quick Weight / Quantity Chips for Speedy POS */}
        <div className="grid grid-cols-4 gap-2">
          {unit === 'kg' ? (
            <>
              <button
                onClick={() => handleQuickAdd(0.25)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                +0.25
              </button>
              <button
                onClick={() => handleQuickAdd(0.50)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                +0.50
              </button>
              <button
                onClick={() => handleQuickAdd(1.00)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                +1.00
              </button>
              <button
                onClick={() => handleQuickSet(1.50)}
                className="py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                1.50kg
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleQuickSet(1)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                1 {unit}
              </button>
              <button
                onClick={() => handleQuickSet(2)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                2 {unit}
              </button>
              <button
                onClick={() => handleQuickSet(5)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                5 {unit}
              </button>
              <button
                onClick={() => handleQuickSet(10)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                10 {unit}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Big Ergonomic Keypad matching diagram with sleek tactile buttons */}
      <div className="flex-1 px-4 pb-3 flex flex-col justify-end">
        <div className="grid grid-cols-3 gap-2.5 max-w-[380px] mx-auto w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`keypad-qty-${digit}`}
              onClick={() => handleDigit(digit)}
              className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Dot */}
          <button
            id="keypad-qty-dot"
            onClick={() => handleDigit('.')}
            className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            .
          </button>

          {/* Zero */}
          <button
            id="keypad-qty-0"
            onClick={() => handleDigit('0')}
            className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            id="keypad-qty-backspace"
            onClick={handleBackspace}
            className="h-13 sm:h-15 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 shadow-sm border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Action Bar: BATAL and OK */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3 shadow-lg">
        <button
          id="qty-cancel-btn"
          onClick={onCancel}
          className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-extrabold text-sm tracking-wider uppercase border border-slate-700 transition-all cursor-pointer active:scale-95"
        >
          BATAL
        </button>

        <button
          id="qty-ok-btn"
          onClick={handleOk}
          disabled={!qtyStr || parseFloat(qtyStr) <= 0}
          className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95"
        >
          OK
        </button>
      </div>
    </div>
  );
};
