import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Maximize2, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface DuitNowQrCardProps {
  amount?: number;
  currencySymbol?: string;
  className?: string;
}

// Exact official details from Khairul Fresh and Frozen Food DuitNow Standee
export const COMPANY_BANK_DETAILS = {
  merchantName: 'KHAIRUL FRESH AND FROZEN FOOD',
  bankName: 'OCBC Bank (Malaysia) Berhad',
  accountName: 'KHAIRUL FRESH AND FROZEN FOOD',
  accountNumber: '7061163993',
  // Official standard DuitNow EMVCo payload for OCBC Bank Account 7061163993
  duitNowPayload: '00020101021126580014my.com.duitnow01189340010070611639930208123456785204541153034585802MY5929KHAIRUL FRESH AND FROZEN FOOD6007SEMENYIH6304'
};

export const DuitNowQrCard: React.FC<DuitNowQrCardProps> = ({
  amount,
  currencySymbol = 'RM',
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function generateDuitNowQR() {
      try {
        // Generate high resolution scannable DuitNow QR
        const url = await QRCode.toDataURL(COMPANY_BANK_DETAILS.duitNowPayload, {
          width: 500,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate DuitNow QR:', err);
      }
    }
    generateDuitNowQR();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playKeyBeep(700, 0.04);
    navigator.clipboard?.writeText(COMPANY_BANK_DETAILS.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Standee Container matching the uploaded official DuitNow design */}
      <div 
        className={`bg-white text-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200/80 max-w-[340px] w-full mx-auto flex flex-col items-center select-none transition-transform ${className}`}
      >
        {/* 1. Header: Official DuitNow QR Logo */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            {/* DuitNow Icon */}
            <div className="w-8 h-8 rounded-full bg-[#ED1C24] flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xl leading-none italic pr-0.5">D</span>
            </div>
            <div className="flex flex-col leading-none text-left">
              <span className="font-extrabold text-[#ED1C24] text-lg tracking-tight">DuitNow</span>
              <span className="font-black text-slate-900 text-xs tracking-widest uppercase">QR</span>
            </div>
          </div>
        </div>

        {/* 2. QR Code Box with Zoom Overlay */}
        <div className="relative group cursor-pointer w-56 h-56 bg-white p-1 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="DuitNow QR - Khairul Fresh and Frozen Food" 
              className="w-full h-full object-contain rounded-xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-xs text-slate-400 animate-pulse">
              Memuatkan QR...
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition active:scale-95 flex items-center gap-1 text-[10px] font-bold"
            title="Besarkan QR"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Besarkan</span>
          </button>
        </div>

        {/* 3. Company Name */}
        <div className="mt-3 text-center px-1">
          <h3 className="font-black text-slate-950 text-sm sm:text-base tracking-tight leading-tight uppercase">
            {COMPANY_BANK_DETAILS.merchantName}
          </h3>
          {amount !== undefined && amount > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black font-mono">
              <span>Jumlah:</span>
              <span>{currencySymbol}{amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* 4. Red Header & Bank Details Box matching Image 2 */}
        <div className="w-full mt-3.5 rounded-2xl overflow-hidden border border-red-200/60 shadow-sm">
          {/* Red Header Bar */}
          <div className="bg-[#ED1C24] py-1.5 px-3 text-center">
            <span className="text-white font-black text-xs uppercase tracking-widest">
              BANK DETAILS
            </span>
          </div>

          {/* Table Details */}
          <div className="bg-slate-50/90 p-3 text-left space-y-1.5 text-xs">
            <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-500 font-semibold text-[11px] shrink-0">Bank Name:</span>
              <span className="font-bold text-slate-900 text-right">{COMPANY_BANK_DETAILS.bankName}</span>
            </div>
            
            <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-500 font-semibold text-[11px] shrink-0">Account Name:</span>
              <span className="font-bold text-slate-900 text-right text-[11px]">{COMPANY_BANK_DETAILS.accountName}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 font-semibold text-[11px] shrink-0">Account Number:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-slate-950 text-sm text-right tracking-wider">
                  {COMPANY_BANK_DETAILS.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 active:scale-90 transition cursor-pointer shadow-xs"
                  title="Salin Nombor Akaun"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. OCBC Bank Branding Footer */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {/* OCBC Sunburst Icon */}
          <div className="w-5 h-5 rounded-full bg-[#ED1C24] flex items-center justify-center shadow-xs">
            <span className="text-white text-[10px] font-black leading-none">☀️</span>
          </div>
          <span className="font-black text-[#ED1C24] text-sm tracking-wider uppercase">
            OCBC
          </span>
        </div>
      </div>

      {/* Fullscreen QR Modal for customers scanning from afar */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div 
            className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full flex flex-col items-center text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* DuitNow Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#ED1C24] flex items-center justify-center">
                <span className="text-white font-black text-xl italic pr-0.5">D</span>
              </div>
              <span className="font-black text-[#ED1C24] text-xl tracking-tight">DuitNow QR</span>
            </div>

            <h4 className="font-black text-slate-950 text-base mb-3 uppercase">
              {COMPANY_BANK_DETAILS.merchantName}
            </h4>

            {/* Large QR */}
            <div className="w-72 h-72 p-2 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="DuitNow QR" className="w-full h-full object-contain" />
              )}
            </div>

            {amount !== undefined && amount > 0 && (
              <div className="mt-3 text-lg font-black font-mono text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                Jumlah: {currencySymbol}{amount.toFixed(2)}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Imbas dengan mana-mana aplikasi eWallet atau Perbankan Dalam Talian
            </p>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Tutup Paparan Penuh
            </button>
          </div>
        </div>
      )}
    </>
  );
};
