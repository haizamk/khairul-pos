import React, { useState, useMemo } from 'react';
import { Customer, CartItem, PaymentMethod, PaymentGatewayConfig } from '../types';
import { 
  Banknote, 
  CreditCard, 
  QrCode, 
  MoreHorizontal, 
  ArrowLeft, 
  CheckCircle2, 
  SmartphoneNfc, 
  RotateCcw,
  Zap,
  Truck
} from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { DeliveryFeeModal } from './DeliveryFeeModal';

interface PaymentModalProps {
  cartItems: CartItem[];
  customer: Customer;
  currencySymbol: string;
  paymentConfig: PaymentGatewayConfig;
  deliveryFee?: number;
  deliveryNotes?: string;
  isOneOffDelivery?: boolean;
  showDeliveryFeeOnReceipt?: boolean;
  onUpdateDeliveryFee?: (fee: number, notes: string, isOneOff: boolean, showOnReceipt: boolean) => void;
  onCancel: () => void;
  onCompletePayment: (
    method: PaymentMethod,
    amountPaid: number,
    changeAmount: number
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  cartItems,
  customer,
  currencySymbol,
  paymentConfig,
  deliveryFee = 0,
  deliveryNotes = '',
  isOneOffDelivery = true,
  showDeliveryFeeOnReceipt = true,
  onUpdateDeliveryFee,
  onCancel,
  onCompletePayment,
}) => {
  const [activeSubMode, setActiveSubMode] = useState<PaymentMethod | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);

  // Cash calculation state
  const [cashTenderedStr, setCashTenderedStr] = useState<string>('');
  const [isNfcScanning, setIsNfcScanning] = useState<boolean>(false);
  const [isQrSimulating, setIsQrSimulating] = useState<boolean>(false);

  const subtotal = useMemo(() => {
    const raw = cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
    return Math.round(raw * 100) / 100;
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (customer.discountPercent && customer.discountPercent > 0) {
      return Math.round(((subtotal * customer.discountPercent) / 100) * 100) / 100;
    }
    return 0;
  }, [subtotal, customer.discountPercent]);

  const totalAmount = useMemo(() => {
    const rawTotal = Math.max(0, subtotal - discountAmount + (deliveryFee || 0));
    return Math.round(rawTotal * 100) / 100;
  }, [subtotal, discountAmount, deliveryFee]);

  // Cash Presets
  const cashSuggestions = useMemo(() => {
    const ceil5 = Math.ceil(totalAmount / 5) * 5;
    const ceil10 = Math.ceil(totalAmount / 10) * 10;
    const ceil20 = Math.ceil(totalAmount / 20) * 20;
    const ceil50 = Math.ceil(totalAmount / 50) * 50;
    const set = new Set<number>([totalAmount]);
    if (ceil5 > totalAmount) set.add(ceil5);
    if (ceil10 > totalAmount) set.add(ceil10);
    if (ceil20 > totalAmount) set.add(ceil20);
    if (ceil50 > totalAmount) set.add(ceil50);
    if (totalAmount < 100) set.add(100);
    return Array.from(set).sort((a, b) => a - b).slice(0, 5);
  }, [totalAmount]);

  const tenderedAmount = useMemo(() => {
    const parsed = parseFloat(cashTenderedStr);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100) / 100;
  }, [cashTenderedStr]);

  // Floating-point safe difference rounded to cents (2 decimal places)
  const diff = useMemo(() => {
    return Math.round((tenderedAmount - totalAmount) * 100) / 100;
  }, [tenderedAmount, totalAmount]);

  // Sufficient if diff is greater than or equal to 0 (with epsilon tolerance for floating-point)
  const isCashSufficient = diff >= -0.001;
  const changeAmount = isCashSufficient ? Math.max(0, diff) : 0;
  const shortageAmount = !isCashSufficient ? Math.abs(diff) : 0;

  const triggerSuccessCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
  };

  const handleSelectCash = () => {
    sound.playKeyBeep(600, 0.04);
    setActiveSubMode('tunai');
    setCashTenderedStr(totalAmount.toFixed(2));
  };

  const handleCashDigit = (digit: string) => {
    sound.playKeyBeep(650, 0.04);
    if (digit === '.') {
      if (cashTenderedStr.includes('.')) return;
      setCashTenderedStr((cashTenderedStr || '0') + '.');
      return;
    }
    if (cashTenderedStr === '0') {
      setCashTenderedStr(digit);
    } else {
      setCashTenderedStr(cashTenderedStr + digit);
    }
  };

  const handleCompleteCash = () => {
    if (!isCashSufficient) {
      sound.playVoidBeep();
      return;
    }
    sound.playCashRegister();
    triggerSuccessCelebration();
    onCompletePayment('tunai', tenderedAmount, changeAmount);
  };

  const handleStartNfcPayment = () => {
    sound.playKeyBeep(700, 0.05);
    setActiveSubMode('kad_nfc');
    setIsNfcScanning(true);
    // Simulate tap after 1.5s
    setTimeout(() => {
      sound.playNfcBeep();
      setTimeout(() => {
        sound.playCashRegister();
        triggerSuccessCelebration();
        onCompletePayment('kad_nfc', totalAmount, 0);
      }, 500);
    }, 1800);
  };

  const handleStartQrPayment = () => {
    sound.playKeyBeep(650, 0.04);
    setActiveSubMode('qr_pay');
    setIsQrSimulating(false);
  };

  const handleSimulateQrScanned = () => {
    setIsQrSimulating(true);
    sound.playNfcBeep();
    setTimeout(() => {
      sound.playCashRegister();
      triggerSuccessCelebration();
      onCompletePayment('qr_pay', totalAmount, 0);
    }, 1000);
  };

  const handleOtherPayment = (method: PaymentMethod) => {
    sound.playCashRegister();
    triggerSuccessCelebration();
    onCompletePayment(method, totalAmount, 0);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeSubMode && (
            <button
              onClick={() => setActiveSubMode(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-extrabold text-sm uppercase tracking-wider text-slate-100">
            {activeSubMode ? `PEMBAYARAN : ${activeSubMode.toUpperCase()}` : 'PEMBAYARAN'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
          {customer.name}
        </span>
      </div>

      {/* Main Payment Amount Banner matching diagram */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 text-center flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          JUMLAH PERLU DIBAYAR
        </span>
        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mt-1">
          {currencySymbol}
          {totalAmount.toFixed(2)}
        </span>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center text-[11px] text-slate-400">
          <span>{cartItems.length} item</span>
          {discountAmount > 0 && (
            <span className="text-amber-400 font-medium">
              • Diskaun: -{currencySymbol}{discountAmount.toFixed(2)}
            </span>
          )}
          {(deliveryFee || 0) > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (onUpdateDeliveryFee) setIsDeliveryModalOpen(true);
              }}
              className={`font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                onUpdateDeliveryFee ? 'cursor-pointer hover:bg-cyan-500/25' : ''
              }`}
            >
              <Truck className="w-3 h-3 text-cyan-400" />
              <span>Caj Penghantaran: +{currencySymbol}{(deliveryFee || 0).toFixed(2)}</span>
              {onUpdateDeliveryFee && <span className="text-[9px] underline opacity-80">(Ubah)</span>}
            </button>
          ) : onUpdateDeliveryFee ? (
            <button
              type="button"
              onClick={() => setIsDeliveryModalOpen(true)}
              className="text-slate-400 hover:text-cyan-300 font-medium bg-slate-800/80 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition text-[10px]"
            >
              <Truck className="w-3 h-3 text-slate-400" />
              <span>+ Caj Penghantaran</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Mode 1: Main Method Selection Grid matching diagram */}
      {!activeSubMode && (
        <div className="flex-1 p-4 flex flex-col justify-center gap-3 max-w-[400px] mx-auto w-full">
          {/* 1. TUNAI (Green Button) */}
          <button
            id="payment-method-cash-btn"
            onClick={handleSelectCash}
            className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-lg tracking-wider flex items-center justify-between shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700/80 flex items-center justify-center shadow-inner">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <span className="tracking-widest">TUNAI</span>
            </div>
            <span className="text-xs font-mono bg-emerald-800/80 px-2.5 py-1 rounded-lg text-emerald-100 font-bold">
              Wang Pas / Baki
            </span>
          </button>

          {/* 2. KAD / NFC (Blue Button) */}
          <button
            id="payment-method-card-btn"
            onClick={handleStartNfcPayment}
            className="w-full py-4 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-lg tracking-wider flex items-center justify-between shadow-lg shadow-blue-950/60 border border-blue-400/40 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700/80 flex items-center justify-center shadow-inner">
                <SmartphoneNfc className="w-6 h-6 text-white animate-pulse" />
              </div>
              <span className="tracking-widest">KAD / NFC</span>
            </div>
            <span className="text-xs font-mono bg-blue-800/80 px-2.5 py-1 rounded-lg text-blue-100 font-bold">
              Touch to Pay
            </span>
          </button>

          {/* 3. QR PAY (Orange/Bronze Button) */}
          <button
            id="payment-method-qr-btn"
            onClick={handleStartQrPayment}
            className="w-full py-4 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold text-lg tracking-wider flex items-center justify-between shadow-lg shadow-amber-950/60 border border-amber-400/40 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700/80 flex items-center justify-center shadow-inner">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <span className="tracking-widest">QR PAY</span>
            </div>
            <span className="text-xs font-mono bg-amber-800/80 px-2.5 py-1 rounded-lg text-amber-100 font-bold">
              DuitNow / eWallet
            </span>
          </button>

          {/* 4. LAIN-LAIN (Gray Button) */}
          <button
            id="payment-method-others-btn"
            onClick={() => setActiveSubMode('hutang')}
            className="w-full py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-bold text-base tracking-wider flex items-center justify-between border border-slate-700/80 transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700/80 flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-slate-300" />
              </div>
              <span className="tracking-widest">LAIN-LAIN / STRIPE / HUTANG</span>
            </div>
          </button>
        </div>
      )}

      {/* Sub-view: TUNAI / CASH TENDER */}
      {activeSubMode === 'tunai' && (
        <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-2.5">
            {/* Tendered Input & Change Box */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-700/80 shadow-inner">
                <div className="text-[10px] uppercase font-bold text-slate-400">Diterima ({currencySymbol})</div>
                <div className="text-2xl font-black font-mono text-slate-100 mt-0.5">
                  {cashTenderedStr || '0.00'}
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border transition-all shadow-sm ${
                  isCashSufficient
                    ? changeAmount > 0
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="text-[10px] uppercase font-bold flex items-center justify-between">
                  <span>
                    {isCashSufficient
                      ? changeAmount > 0
                        ? 'Baki Pulangan'
                        : 'Bayaran Tepat'
                      : 'Belum Cukup'}
                  </span>
                  {isCashSufficient && changeAmount === 0 && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                      ✓ PAS
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black font-mono mt-0.5">
                  {currencySymbol}
                  {isCashSufficient ? changeAmount.toFixed(2) : shortageAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quick Cash Presets */}
            <div className="grid grid-cols-5 gap-1.5">
              {cashSuggestions.map((amt) => {
                const isExact = Math.abs(amt - totalAmount) < 0.001;
                return (
                  <button
                    key={amt}
                    onClick={() => {
                      sound.playKeyBeep(600, 0.03);
                      setCashTenderedStr(amt.toFixed(2));
                    }}
                    className={`py-2 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer active:scale-95 ${
                      isExact
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isExact ? 'PAS' : `${currencySymbol}${amt}`}
                  </button>
                );
              })}
            </div>

            {/* Numeric Keypad for Cash Tender */}
            <div className="grid grid-cols-3 gap-2 max-w-[340px] mx-auto w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleCashDigit(d)}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-lg font-bold text-white shadow-sm border border-slate-700/70 flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleCashDigit('.')}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-lg font-bold text-white shadow-sm border border-slate-700/70 flex items-center justify-center cursor-pointer active:scale-95"
              >
                .
              </button>
              <button
                onClick={() => handleCashDigit('0')}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-lg font-bold text-white shadow-sm border border-slate-700/70 flex items-center justify-center cursor-pointer active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => {
                  sound.playKeyBeep(450, 0.03);
                  setCashTenderedStr('');
                }}
                className="h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center justify-center cursor-pointer active:scale-95"
              >
                C
              </button>
            </div>
          </div>

          <button
            id="confirm-cash-payment-btn"
            onClick={handleCompleteCash}
            disabled={!isCashSufficient}
            className="w-full mt-3 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-base tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/60 border border-emerald-400/40 cursor-pointer active:scale-98"
          >
            ✓ Sahkan Bayaran Tunai ({currencySymbol}{totalAmount.toFixed(2)})
          </button>
        </div>
      )}

      {/* Sub-view: KAD / NFC TOUCH TO PAY */}
      {activeSubMode === 'kad_nfc' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full bg-blue-950/80 border-2 border-blue-500/50 flex items-center justify-center text-blue-400 animate-pulse shadow-2xl shadow-blue-600/30">
              <SmartphoneNfc className="w-14 h-14" />
            </div>
            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-ping"></div>
          </div>

          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            {isNfcScanning ? 'SENTUH KAD / TELEFON PADA SUNMI' : 'SEDIA UNTUK BAYARAN'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            Sila dekatkan kad MyDebit / Visa / Mastercard atau telefon NFC anda pada sensor atas Sunmi V3.
          </p>

          <div className="mt-6 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            Mod: Touch-to-Pay Sunmi NFC Terminal
          </div>
        </div>
      )}

      {/* Sub-view: QR PAY (DuitNow) */}
      {activeSubMode === 'qr_pay' && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          {/* Simulated Dynamic Malaysian DuitNow QR box */}
          <div className="p-4 bg-white rounded-2xl shadow-2xl max-w-[240px] border-4 border-amber-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">
                DuitNow QR
              </span>
              <span className="text-[9px] font-bold text-slate-600">
                {paymentConfig.merchantName || 'KHAIRUL FRESH'}
              </span>
            </div>

            {/* SVG QR Code Pattern */}
            <div className="w-48 h-48 bg-slate-950 p-2 rounded-xl flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                {/* QR Matrix SVG Mock */}
                <rect x="0" y="0" width="30" height="30" rx="3" fill="#ffffff" />
                <rect x="5" y="5" width="20" height="20" rx="2" fill="#000000" />
                <rect x="10" y="10" width="10" height="10" fill="#ffffff" />

                <rect x="70" y="0" width="30" height="30" rx="3" fill="#ffffff" />
                <rect x="75" y="5" width="20" height="20" rx="2" fill="#000000" />
                <rect x="80" y="10" width="10" height="10" fill="#ffffff" />

                <rect x="0" y="70" width="30" height="30" rx="3" fill="#ffffff" />
                <rect x="5" y="75" width="20" height="20" rx="2" fill="#000000" />
                <rect x="10" y="80" width="10" height="10" fill="#ffffff" />

                {/* Center logo badge */}
                <circle cx="50" cy="50" r="12" fill="#d97706" />
                <text x="50" y="54" fontSize="8" fill="#ffffff" textAnchor="middle" fontWeight="bold">
                  KF
                </text>

                {/* Random QR bits */}
                <rect x="35" y="5" width="6" height="6" fill="#ffffff" />
                <rect x="45" y="15" width="8" height="8" fill="#ffffff" />
                <rect x="5" y="40" width="10" height="6" fill="#ffffff" />
                <rect x="20" y="45" width="6" height="8" fill="#ffffff" />
                <rect x="70" y="40" width="12" height="6" fill="#ffffff" />
                <rect x="85" y="50" width="6" height="10" fill="#ffffff" />
                <rect x="35" y="70" width="10" height="8" fill="#ffffff" />
                <rect x="50" y="75" width="8" height="6" fill="#ffffff" />
                <rect x="65" y="80" width="10" height="10" fill="#ffffff" />
              </svg>
            </div>

            <div className="mt-2 text-center">
              <span className="text-xs font-mono font-black text-slate-900">
                {currencySymbol}{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Pelanggan boleh imbas menggunakan TNG eWallet, MAE, Bank Islam, GrabPay, dll.
          </p>

          <button
            id="simulate-qr-approved-btn"
            onClick={handleSimulateQrScanned}
            disabled={isQrSimulating}
            className="mt-4 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>{isQrSimulating ? 'Memproses Bayaran QR...' : 'Simulasi Pembayaran QR Selesai'}</span>
          </button>
        </div>
      )}

      {/* Sub-view: LAIN-LAIN / STRIPE / HITPAY / HUTANG */}
      {activeSubMode === 'hutang' && (
        <div className="flex-1 p-4 flex flex-col justify-center gap-3">
          <div className="text-xs font-bold text-slate-400 uppercase">PILIHAN KAEDAH LAIN</div>

          <button
            onClick={() => handleOtherPayment('stripe')}
            className="w-full p-3.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-left transition-all flex items-center justify-between cursor-pointer active:scale-98"
          >
            <div>
              <div className="font-bold text-white text-sm">Stripe Terminal / Touch</div>
              <div className="text-xs text-slate-400">Bayaran kad antarabangsa & tempatan</div>
            </div>
            <Zap className="w-5 h-5 text-indigo-400" />
          </button>

          <button
            onClick={() => handleOtherPayment('hitpay')}
            className="w-full p-3.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 text-left transition-all flex items-center justify-between cursor-pointer active:scale-98"
          >
            <div>
              <div className="font-bold text-white text-sm">HitPay Malaysia</div>
              <div className="text-xs text-slate-400">FPX / Kad / e-Wallet</div>
            </div>
            <CreditCard className="w-5 h-5 text-teal-400" />
          </button>

          <button
            onClick={() => handleOtherPayment('hutang')}
            className="w-full p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-left transition-all flex items-center justify-between cursor-pointer active:scale-98"
          >
            <div>
              <div className="font-bold text-white text-sm">Hutang / Kredit Pelanggan</div>
              <div className="text-xs text-slate-400">Catat dalam lejar pelanggan {customer.name}</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      )}

      {/* Bottom BATAL Button matching diagram */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 shadow-lg">
        <button
          id="payment-cancel-btn"
          onClick={onCancel}
          className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-extrabold text-sm tracking-wider uppercase border border-slate-700 transition-all cursor-pointer active:scale-95"
        >
          BATAL
        </button>
      </div>

      {/* Delivery Fee Modal from Payment Screen */}
      {onUpdateDeliveryFee && (
        <DeliveryFeeModal
          isOpen={isDeliveryModalOpen}
          currentFee={deliveryFee}
          currentNotes={deliveryNotes}
          isOneOff={isOneOffDelivery}
          showOnReceipt={showDeliveryFeeOnReceipt}
          currencySymbol={currencySymbol}
          onClose={() => setIsDeliveryModalOpen(false)}
          onSaveDeliveryFee={(fee, notes, isOneOff, showOnReceipt) => {
            onUpdateDeliveryFee(fee, notes, isOneOff, showOnReceipt);
          }}
        />
      )}
    </div>
  );
};
