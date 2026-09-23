import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Download, 
  ExternalLink, 
  Check, 
  Copy, 
  X, 
  Layers, 
  Printer, 
  Zap, 
  QrCode 
} from 'lucide-react';
import { sound } from '../utils/audio';

interface InstallGuideModalProps {
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<'sunmi' | 'pc' | 'apk'>('sunmi');

  const appUrl = window.location.origin + window.location.pathname;

  const handleCopyUrl = () => {
    sound.playKeyBeep(700, 0.04);
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
                CARA PASANG / INSTALL APLIKASI
              </h2>
              <p className="text-[10px] text-slate-400">Sunmi V3 • Android • PC Desktop • Tablet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/80 text-xs font-bold">
          <button
            onClick={() => setSelectedDevice('sunmi')}
            className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              selectedDevice === 'sunmi'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Sunmi V3 / Android</span>
          </button>

          <button
            onClick={() => setSelectedDevice('pc')}
            className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              selectedDevice === 'pc'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>PC / Komputer</span>
          </button>

          <button
            onClick={() => setSelectedDevice('apk')}
            className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              selectedDevice === 'apk'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Eksport / APK</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {/* Quick Copy URL box */}
          <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-2">
            <div className="overflow-hidden flex-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Pautan Aplikasi (Buka di peranti anda):
              </div>
              <div className="font-mono text-xs text-emerald-300 font-bold truncate mt-0.5">
                {appUrl}
              </div>
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-100 font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>

          {/* Sunmi / Android Method */}
          {selectedDevice === 'sunmi' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Disyorkan untuk Sunmi V3 & Telefon Android (PWA Web-App). Tanpa perlu muat turun fail yang berat!</span>
              </div>

              <ol className="space-y-3 pl-1 text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Buka Google Chrome pada Sunmi V3 / Telefon</strong>
                    <span className="text-slate-400 text-[11px]">Buka pautan URL aplikasi ini di pelayar web Google Chrome peranti Sunmi anda.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Tekan Menu 3 Titik (⋮) di Chrome</strong>
                    <span className="text-slate-400 text-[11px]">Di bucu atas sebelah kanan pelayar Chrome, tekan butang menu tiga titik.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Pilih "Add to Home screen" / "Install App"</strong>
                    <span className="text-slate-400 text-[11px]">Tekan <em>"Tambah ke Skrin Utama"</em> atau <em>"Pasang Aplikasi"</em>.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Selesai! Buka Ikon POS</strong>
                    <span className="text-slate-400 text-[11px]">Aplikasi akan muncul seperti App rasmi di skrin utama dan berjalan secara skrin penuh (Kiosk Mode) tanpa bar pelayar.</span>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* PC Method */}
          {selectedDevice === 'pc' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-2">
                <Monitor className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>Boleh dipasang sebagai perisian Desktop pada Windows / Mac / ChromeOS.</span>
              </div>

              <ol className="space-y-3 pl-1 text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Buka di Chrome / Microsoft Edge</strong>
                    <span className="text-slate-400 text-[11px]">Akses pautan URL sistem POS pada komputer kaunter anda.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Tekan Ikon Install di Address Bar</strong>
                    <span className="text-slate-400 text-[11px]">Di hujung kanan bar alamat URL (sebelah ikon bookmark/bintang), klik ikon komputer kecil <em>"Install POS Khairul"</em>.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-100 block font-bold">Buka Terus dari Desktop Taskbar</strong>
                    <span className="text-slate-400 text-[11px]">Sistem kini dibuka dalam tetingkap standalone tersendiri untuk kemudahan juruwang.</span>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* APK / Export Method */}
          {selectedDevice === 'apk' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Untuk memuat turun kod sumber penuh atau membina fail .APK untuk Sunmi App Store.</span>
              </div>

              <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-2 text-slate-300">
                <div className="font-bold text-slate-100">1. Eksport Projek (ZIP / GitHub)</div>
                <p className="text-slate-400 text-[11px]">
                  Anda boleh muat turun keseluruhan fail kod sumber projek ini melalui menu <strong>Settings</strong> di bucu atas platform AI Studio &gt; <strong>Export ZIP</strong> atau sambungkan terus ke <strong>GitHub</strong>.
                </p>

                <div className="font-bold text-slate-100 pt-2">2. Pakej ke fail .APK (Capacitor / Cordova)</div>
                <p className="text-slate-400 text-[11px]">
                  Kod sumber berasaskan React + Vite ini boleh dibina terus menjadi fail Android `.apk` dengan menjalankan arahan <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">npx cap add android</code> atau dimuat ke Sunmi Cloud Partner Portal.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-950/60"
          >
            Faham & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
