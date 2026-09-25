import React, { useState, useEffect } from 'react';
import { ReceiptConfig, Transaction } from '../types';
import { 
  Save, 
  RotateCcw, 
  Printer, 
  ArrowLeft, 
  Sparkles, 
  Beef, 
  Fish, 
  Store, 
  Eye, 
  Sliders, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Upload,
  RefreshCw,
  X
} from 'lucide-react';
import { printReceiptWindow, formatCurrency } from '../utils/receiptPrinter';
import { sound } from '../utils/audio';

interface ReceiptDesignerProps {
  initialConfig: ReceiptConfig;
  onSaveConfig: (newConfig: ReceiptConfig) => Promise<{ success: boolean; error?: string }> | void;
  onClose: () => void;
}

export const ReceiptDesigner: React.FC<ReceiptDesignerProps> = ({
  initialConfig,
  onSaveConfig,
  onClose,
}) => {
  const [config, setConfig] = useState<ReceiptConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'info' | 'layout' | 'logo'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Sample transaction for live preview
  const sampleTx: Transaction = {
    id: 'sample_tx_1',
    invoiceNo: 'INV-20260826-0008',
    timestamp: new Date().toISOString(),
    customer: { id: 'c1', name: 'Pelanggan Runcit', type: 'runcit' },
    items: [
      { id: 'it_1', productId: 'p1', name: 'Ayam Daging Bersih', unitPrice: 9.60, quantity: 1.5, unit: 'kg', totalPrice: 14.40 },
      { id: 'it_2', productId: 'p4', name: 'Kepak Ayam Segar', unitPrice: 14.00, quantity: 0.8, unit: 'kg', totalPrice: 11.20 },
      { id: 'it_3', productId: 'p9', name: 'Ayam Kampung', unitPrice: 18.00, quantity: 1.0, unit: 'ekor', totalPrice: 18.00 },
    ],
    subtotal: 43.60,
    discount: 0,
    deliveryFee: 5.00,
    isDelivery: true,
    deliveryNotes: 'Saujana Impian (One-Off)',
    totalAmount: 48.60,
    paymentMethod: 'tunai',
    amountPaid: 50.00,
    changeAmount: 1.40,
    cashierName: 'Khairul',
    status: 'completed',
  };

  const handleChange = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveToast(null);

    try {
      const res = await onSaveConfig(config);
      if (res && res.success === false) {
        sound.playVoidBeep();
        setSaveError(res.error || 'Gagal menyimpan reka bentuk resit ke pangkalan data.');
      } else {
        sound.playCashRegister();
        setSaveToast('✓ Reka bentuk resit berjaya disimpan secara kekal ke pangkalan data!');
        setTimeout(() => setSaveToast(null), 3500);
      }
    } catch (err: any) {
      console.error('Save receipt config error:', err);
      sound.playVoidBeep();
      setSaveError(err?.message || 'Ralat semasa menyimpan tetapan resit.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = () => {
    printReceiptWindow(sampleTx, config);
  };

  const handleResetToDefault = () => {
    setShowResetConfirm(true);
  };

  const confirmResetToDefault = () => {
    sound.playKeyBeep(500, 0.04);
    setConfig(initialConfig);
    setShowResetConfirm(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setConfig((prev) => ({
            ...prev,
            logoType: 'custom_url',
            customLogoUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>RECEIPT DESIGNER</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                V1 RESIT KHAIRUL
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="designer-test-print-btn"
            onClick={handleTestPrint}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95 shadow-sm"
            title="Uji cetak resit ke printer atau PDF"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Uji Cetak</span>
          </button>

          <button
            id="designer-save-btn"
            disabled={isSaving}
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 active:bg-emerald-700 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/60 active:scale-95"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 transition shadow-md">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Save Error Banner */}
      {saveError && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 transition shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>⚠️ {saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="p-0.5 hover:bg-rose-700 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Responsive layout: Grid on wider screens, Tabbed on mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Form Controls */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/80 text-xs font-bold">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'info'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Maklumat Kedai
            </button>
            <button
              onClick={() => setActiveTab('logo')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'logo'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Logo & Ikon
            </button>
            <button
              onClick={() => setActiveTab('layout')}
              className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                activeTab === 'layout'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Susun Atur & Saiz
            </button>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
            {/* Tab 1: Info Kedai */}
            {activeTab === 'info' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Nama Syarikat / Perniagaan
                  </label>
                  <input
                    type="text"
                    value={config.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Contoh: KHAIRUL FRESH AND FROZEN FOOD"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="Contoh: Pilihan Segar, Bersih & Halal Setiap Hari"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      No. Pendaftaran (SSM)
                    </label>
                    <input
                      type="text"
                      value={config.ssmNumber}
                      onChange={(e) => handleChange('ssmNumber', e.target.value)}
                      placeholder="SSM: 202403198822 (003456789-V)"
                      className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      No. Telefon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="012-345 6789"
                      className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Alamat Premis / Pasar
                  </label>
                  <textarea
                    rows={2}
                    value={config.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="No. 12 & 14, Pasar Basah Sentral, Kajang..."
                    className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Website / Laman Sosial
                  </label>
                  <input
                    type="text"
                    value={config.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="facebook.com/khairulfreshfood"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Ucapan / Pesanan Bawah Resit (Footer)
                  </label>
                  <textarea
                    rows={2}
                    value={config.footerMessage}
                    onChange={(e) => handleChange('footerMessage', e.target.value)}
                    placeholder="Terima kasih atas sokongan anda! Sila datang lagi."
                    className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Logo & Branding */}
            {activeTab === 'logo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-2 uppercase tracking-wider">
                    Pilihan Jenis Logo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleChange('logoType', 'icon')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        config.logoType === 'icon'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 mx-auto mb-1" />
                      <span className="font-bold">Ikon Vektor</span>
                    </button>

                    <button
                      onClick={() => handleChange('logoType', 'custom_url')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        config.logoType === 'custom_url'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <span className="font-bold">Muat Naik Logo</span>
                    </button>

                    <button
                      onClick={() => handleChange('logoType', 'none')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        config.logoType === 'none'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="font-bold block my-2">Tiada Logo</span>
                    </button>
                  </div>
                </div>

                {config.logoType === 'icon' && (
                  <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/60">
                    <label className="block text-slate-400 font-bold mb-2 uppercase tracking-wider">
                      Pilih Ikon Lambang Kedai
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'poultry', label: 'Ayam Segar', icon: Sparkles },
                        { id: 'meat', label: 'Daging Segar', icon: Beef },
                        { id: 'fish', label: 'Ikan & Makanan Laut', icon: Fish },
                        { id: 'halal', label: 'Halal Stamp', icon: CheckCircle },
                        { id: 'store', label: 'Kedai Fresh', icon: Store },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = config.selectedIcon === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleChange('selectedIcon', item.id as any)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold text-center leading-tight">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {config.logoType === 'custom_url' && (
                  <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        Muat Naik Fail Gambar (PNG/JPG)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        Atau Masukkan URL Imej Logo
                      </label>
                      <input
                        type="url"
                        value={config.customLogoUrl}
                        onChange={(e) => handleChange('customLogoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-slate-950 text-slate-100 rounded-xl px-3 py-2.5 border border-slate-800 text-xs font-mono"
                      />
                    </div>

                    {config.customLogoUrl && (
                      <div className="p-2 bg-white rounded-xl inline-block">
                        <img
                          src={config.customLogoUrl}
                          alt="Logo Preview"
                          className="max-h-16 max-w-[150px] object-contain grayscale"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Layout & Paparan */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                {/* Saiz Tulisan */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                    Saiz Tulisan Resit (Font Size)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'small', label: 'Kecil (Padat)' },
                      { id: 'medium', label: 'Sederhana (Standard)' },
                      { id: 'large', label: 'Besar (Jelas / Warga Emas)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleChange('fontSize', s.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          config.fontSize === s.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lebar Kertas */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                    Lebar Kertas Thermal Printer
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChange('paperWidth', '58mm')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        config.paperWidth === '58mm'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      58mm (Sunmi V3 Handheld Standard)
                    </button>
                    <button
                      onClick={() => handleChange('paperWidth', '80mm')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        config.paperWidth === '80mm'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      80mm (Printer Kaunter Besar)
                    </button>
                  </div>
                </div>

                {/* Field Visibility Toggles */}
                <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                  <div className="font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Paparan Butiran Pada Resit
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk No. Invoice / Resit</span>
                    <input
                      type="checkbox"
                      checked={config.showInvoiceNo}
                      onChange={(e) => handleChange('showInvoiceNo', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk Tarikh & Masa Transaksi</span>
                    <input
                      type="checkbox"
                      checked={config.showDateTime}
                      onChange={(e) => handleChange('showDateTime', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk Nama Juruwang / Cashier</span>
                    <input
                      type="checkbox"
                      checked={config.showCashier}
                      onChange={(e) => handleChange('showCashier', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk Nama Pelanggan</span>
                    <input
                      type="checkbox"
                      checked={config.showCustomer}
                      onChange={(e) => handleChange('showCustomer', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk Maklumat Bayaran & Baki</span>
                    <input
                      type="checkbox"
                      checked={config.showPaymentDetails}
                      onChange={(e) => handleChange('showPaymentDetails', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk Caj Penghantaran di Resit & PDF</span>
                    <input
                      type="checkbox"
                      checked={config.showDeliveryFee ?? true}
                      onChange={(e) => handleChange('showDeliveryFee', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Tunjuk QR Code / WhatsApp Bawah Resit</span>
                    <input
                      type="checkbox"
                      checked={config.showQrCode}
                      onChange={(e) => handleChange('showQrCode', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Thermal Receipt Preview */}
        <div className="flex-1 bg-slate-950/80 p-4 flex flex-col items-center justify-start overflow-y-auto border-t md:border-t-0 border-slate-800">
          <div className="flex items-center justify-between w-full max-w-[340px] mb-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-slate-300">Pratonton Langsung</span>
            </div>
            <span className="font-mono text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
              {config.paperWidth}
            </span>
          </div>

          {/* Paper Slip */}
          <div
            className={`bg-[#fcfbf7] text-zinc-950 shadow-2xl p-4 rounded-sm font-mono border-t-8 border-amber-500 transition-all ${
              config.paperWidth === '58mm' ? 'w-full max-w-[310px]' : 'w-full max-w-[360px]'
            } ${
              config.fontSize === 'small'
                ? 'text-[11px]'
                : config.fontSize === 'large'
                ? 'text-[14px]'
                : 'text-[12.5px]'
            }`}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.7)',
            }}
          >
            {/* Header / Logo */}
            <div className="text-center pb-2 border-b border-dashed border-zinc-400">
              {config.logoType === 'custom_url' && config.customLogoUrl ? (
                <img
                  src={config.customLogoUrl}
                  alt="Logo"
                  className="max-h-12 max-w-[120px] mx-auto mb-1.5 grayscale contrast-150 object-contain"
                />
              ) : config.logoType === 'icon' ? (
                <div className="mb-1 font-bold text-center text-xs">
                  [ IKON: {config.selectedIcon.toUpperCase()} ]
                </div>
              ) : null}

              <div className="font-black text-sm uppercase tracking-tight text-black">
                {config.companyName || 'NAMA KEDAI'}
              </div>
              {config.tagline && (
                <div className="text-[10px] italic text-zinc-600">{config.tagline}</div>
              )}
              {config.ssmNumber && (
                <div className="text-[9.5px] text-zinc-500">{config.ssmNumber}</div>
              )}
              {config.address && (
                <div className="text-[10px] text-zinc-600 mt-1 leading-tight">{config.address}</div>
              )}
              {config.phone && (
                <div className="text-[10.5px] font-bold text-black mt-0.5">
                  TEL: {config.phone}
                </div>
              )}
              {config.website && (
                <div className="text-[9.5px] text-zinc-500">{config.website}</div>
              )}
            </div>

            {/* Meta */}
            <div className="py-2 border-b border-dashed border-zinc-400 text-[11px] space-y-0.5">
              {config.showInvoiceNo && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">No. Resit:</span>
                  <span className="font-bold">{sampleTx.invoiceNo}</span>
                </div>
              )}
              {config.showDateTime && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Tarikh:</span>
                  <span>26/08/2026 10:32 AM</span>
                </div>
              )}
              {config.showCashier && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Juruwang:</span>
                  <span>Khairul</span>
                </div>
              )}
              {config.showCustomer && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Pelanggan:</span>
                  <span className="font-bold">Pelanggan Runcit</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-1.5">
              {sampleTx.items.map((it) => (
                <div key={it.id}>
                  <div className="flex justify-between font-bold">
                    <span>{it.name}</span>
                    <span>{formatCurrency(it.totalPrice, config.currencySymbol)}</span>
                  </div>
                  <div className="text-[10.5px] text-zinc-600 flex justify-between">
                    <span>
                      {it.quantity.toFixed(2)} {it.unit} × {formatCurrency(it.unitPrice, config.currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal, Delivery & Grand Total */}
            <div className="py-2 border-b-2 border-zinc-900 space-y-1">
              <div className="flex justify-between text-[10.5px] text-zinc-600">
                <span>Subjumlah:</span>
                <span className="font-mono">{formatCurrency(sampleTx.subtotal, config.currencySymbol)}</span>
              </div>

              {(config.showDeliveryFee ?? true) && (sampleTx.deliveryFee || 0) > 0 && (
                <div>
                  <div className="flex justify-between text-[10.5px] text-zinc-900 font-bold">
                    <span>Caj Penghantaran:</span>
                    <span className="font-mono">+{formatCurrency(sampleTx.deliveryFee || 0, config.currencySymbol)}</span>
                  </div>
                  {sampleTx.deliveryNotes && (
                    <div className="text-[9.5px] text-zinc-500 italic pl-1">
                      Nota: {sampleTx.deliveryNotes}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between font-black text-sm sm:text-base pt-1 border-t border-zinc-300">
                <span>JUMLAH:</span>
                <span>{formatCurrency(sampleTx.subtotal + ((config.showDeliveryFee ?? true) ? (sampleTx.deliveryFee || 0) : 0), config.currencySymbol)}</span>
              </div>

              {config.showPaymentDetails && (
                <div className="pt-1 border-t border-dashed border-zinc-300 text-[10.5px] space-y-0.5 text-zinc-700">
                  <div className="flex justify-between">
                    <span>Bayaran (Tunai):</span>
                    <span>{formatCurrency(50.0, config.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span>Baki Tunai:</span>
                    <span>{formatCurrency(6.4, config.currencySymbol)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-2.5 space-y-1 text-[10.5px] text-zinc-600">
              <div>{config.footerMessage}</div>
              <div className="font-bold tracking-widest text-black pt-0.5">
                *** TERIMA KASIH ***
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={handleResetToDefault}
          className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Set Semula Asal</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 active:bg-emerald-700 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/60 active:scale-95"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Reka Bentuk</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Resetting to Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  Set Semula Resit?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adakah anda pasti untuk kembalikan tetapan reka bentuk resit kepada pilihan asal Khairul Fresh?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetToDefault}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Set Semula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
