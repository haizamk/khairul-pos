import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowLeft, Delete, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface PriceKeypadModalProps {
  product: Product;
  currencySymbol: string;
  onCancel: () => void;
  onConfirmPrice: (price: number) => void;
}

export const PriceKeypadModal: React.FC<PriceKeypadModalProps> = ({
  product,
  currencySymbol,
  onCancel,
  onConfirmPrice,
}) => {
  const [priceStr, setPriceStr] = useState<string>(product.defaultPrice.toFixed(2));
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);

  const handleDigit = (digit: string) => {
    sound.playKeyBeep(650, 0.04);
    if (isFirstInput) {
      if (digit === '.') {
        setPriceStr('0.');
      } else {
        setPriceStr(digit);
      }
      setIsFirstInput(false);
      return;
    }

    if (digit === '.') {
      if (priceStr.includes('.')) return;
      setPriceStr(priceStr + '.');
      return;
    }

    // Limit decimal places to 2
    if (priceStr.includes('.')) {
      const parts = priceStr.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }

    // Limit total length
    if (priceStr.length >= 8) return;

    if (priceStr === '0' && digit !== '.') {
      setPriceStr(digit);
    } else {
      setPriceStr(priceStr + digit);
    }
  };

  const handleBackspace = () => {
    sound.playKeyBeep(450, 0.04);
    if (isFirstInput) {
      setPriceStr('');
      setIsFirstInput(false);
      return;
    }
    if (priceStr.length <= 1) {
      setPriceStr('');
    } else {
      setPriceStr(priceStr.slice(0, -1));
    }
  };

  const handleResetDefault = () => {
    sound.playKeyBeep(500, 0.04);
    setPriceStr(product.defaultPrice.toFixed(2));
    setIsFirstInput(true);
  };

  const handleAddDelta = (delta: number) => {
    sound.playKeyBeep(600, 0.04);
    const curr = parseFloat(priceStr) || 0;
    const newVal = Math.max(0, curr + delta);
    setPriceStr(newVal.toFixed(2));
    setIsFirstInput(false);
  };

  const handleOk = () => {
    const finalPrice = parseFloat(priceStr);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      sound.playVoidBeep();
      return;
    }
    sound.playOkBeep();
    onConfirmPrice(finalPrice);
  };

  const displayVal = priceStr || '0.00';

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Top Bar with Back Arrow + Product Name */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <button
          id="price-back-btn"
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
          <span className="font-bold text-sm text-slate-100">{product.name}</span>
        </button>

        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full">
          Langkah 2/3
        </span>
      </div>

      {/* Main Input Display */}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span>MASUKKAN HARGA ({currencySymbol})</span>
          <button
            onClick={handleResetDefault}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Harga Asal ({currencySymbol}{product.defaultPrice.toFixed(2)})</span>
          </button>
        </div>

        {/* Large White Display Box matching diagram with Sleek styling */}
        <div className="w-full bg-slate-950 text-slate-100 rounded-2xl p-3.5 sm:p-4 text-right shadow-inner flex items-baseline justify-end border border-slate-700/80">
          <span className="text-xl sm:text-2xl font-bold text-slate-500 mr-2">
            {currencySymbol}
          </span>
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400">
            {displayVal}
          </span>
        </div>

        {/* Quick price adjustment chips */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => handleAddDelta(0.5)}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            +0.50
          </button>
          <button
            onClick={() => handleAddDelta(1.0)}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            +1.00
          </button>
          <button
            onClick={() => handleAddDelta(2.0)}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            +2.00
          </button>
          <button
            onClick={() => {
              sound.playKeyBeep(450, 0.04);
              setPriceStr('');
              setIsFirstInput(false);
            }}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-xs font-bold text-rose-400 border border-rose-500/30 transition-all cursor-pointer active:scale-95"
          >
            Padam
          </button>
        </div>
      </div>

      {/* Big Ergonomic Keypad matching diagram with sleek tactile buttons */}
      <div className="flex-1 px-4 pb-3 flex flex-col justify-end">
        <div className="grid grid-cols-3 gap-2.5 max-w-[380px] mx-auto w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`keypad-price-${digit}`}
              onClick={() => handleDigit(digit)}
              className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Dot */}
          <button
            id="keypad-price-dot"
            onClick={() => handleDigit('.')}
            className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            .
          </button>

          {/* Zero */}
          <button
            id="keypad-price-0"
            onClick={() => handleDigit('0')}
            className="h-13 sm:h-15 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            id="keypad-price-backspace"
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
          id="price-cancel-btn"
          onClick={onCancel}
          className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-extrabold text-sm tracking-wider uppercase border border-slate-700 transition-all cursor-pointer active:scale-95"
        >
          BATAL
        </button>

        <button
          id="price-ok-btn"
          onClick={handleOk}
          disabled={!priceStr || parseFloat(priceStr) <= 0}
          className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95"
        >
          OK
        </button>
      </div>
    </div>
  );
};
