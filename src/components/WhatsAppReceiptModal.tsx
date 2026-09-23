import React, { useState, useEffect } from 'react';
import { Transaction, ReceiptConfig, Customer } from '../types';
import { useFirebaseSync } from '../context/FirebaseSyncContext';
import { generateReceiptPdf, normalizeWhatsAppPhone, isValidWhatsAppPhone } from '../utils/pdfReceiptGenerator';
import { formatCurrency, formatDateTime } from '../utils/receiptPrinter';
import { sound } from '../utils/audio';
import { 
  MessageSquare, 
  Send, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  User, 
  Phone, 
  FileText, 
  BookmarkCheck,
  Smartphone,
  Share2,
  Key,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface WhatsAppReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction;
  receiptConfig: ReceiptConfig;
  onClose: () => void;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({
  isOpen,
  transaction,
  receiptConfig,
  onClose,
}) => {
  const { saveCustomer, updateTransactionWhatsAppStatus, settings, saveFonnteToken, isAdmin } = useFirebaseSync();

  const [phone, setPhone] = useState<string>('');
  const [savePhoneToCustomer, setSavePhoneToCustomer] = useState<boolean>(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    status: 'idle' | 'success' | 'failed';
    message?: string;
  }>({ status: 'idle' });
  const [savedPhoneSuccess, setSavedPhoneSuccess] = useState<boolean>(false);

  // Fonnte Token State & Quick Config
  const [fonnteToken, setFonnteToken] = useState<string>('');
  const [showTokenConfig, setShowTokenConfig] = useState<boolean>(false);
  const [tokenSavedSuccess, setTokenSavedSuccess] = useState<boolean>(false);
  const [webShareTip, setWebShareTip] = useState<string | null>(null);

  // Initialize phone & message from transaction customer
  useEffect(() => {
    if (isOpen && transaction) {
      const initialPhone = transaction.customer?.phone || transaction.whatsappPhone || '';
      setPhone(initialPhone);
      setSavePhoneToCustomer(false);
      setSavedPhoneSuccess(false);
      setWebShareTip(null);
      setFonnteToken(settings.fonnteToken || '');

      setSendResult({
        status: transaction.whatsappStatus === 'sent' ? 'success' : 'idle',
        message: transaction.whatsappStatus === 'sent' ? 'Resit ini telah dihantar sebelum ini.' : undefined
      });

      const custName = transaction.customer?.name && transaction.customer.name !== 'Runcit (Pelanggan Am)' 
        ? transaction.customer.name 
        : 'Pelanggan';

      // Build itemized list for clear text receipt safely
      const itemsList = (transaction.items || []).map((item, idx) => {
        const qtyVal = typeof item.weight === 'number' ? item.weight : (typeof item.quantity === 'number' ? item.quantity : 1);
        const qtyStr = item.unit === 'kg' ? `${qtyVal.toFixed(2)} kg` : `${qtyVal} ${item.unit || 'unit'}`;
        const uPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
        const tPrice = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
        return `${idx + 1}. *${item.name || 'Barang'}*\n   ${qtyStr} × ${formatCurrency(uPrice, receiptConfig.currencySymbol)} = *${formatCurrency(tPrice, receiptConfig.currencySymbol)}*`;
      }).join('\n');

      const defaultMsg = `🧾 *RESIT PEMBELIAN RASMI*\n*${receiptConfig.companyName || 'KHAIRUL FRESH AND FROZEN FOOD'}*\n\n` +
        `Salam Sejahtera *${custName}*,\n` +
        `Terima kasih kerana membeli bersama kami.\n\n` +
        `📋 *No. Invois:* ${transaction.invoiceNo}\n` +
        `📅 *Tarikh:* ${date} ${time}\n` +
        `👤 *Juruwang:* ${transaction.cashierName || 'Khairul'}\n` +
        `💳 *Kaedah Bayaran:* ${transaction.paymentMethod ? transaction.paymentMethod.toUpperCase() : 'TUNAI'}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 *SENARAI BARANGAN:*\n` +
        `${itemsList}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *JUMLAH: ${formatCurrency(transaction.totalAmount, receiptConfig.currencySymbol)}*\n` +
        (transaction.discountAmount ? `🏷️ *Diskaun:* -${formatCurrency(transaction.discountAmount, receiptConfig.currencySymbol)}\n` : '') +
        (transaction.cashTendered ? `💵 *Tunai Diterima:* ${formatCurrency(transaction.cashTendered, receiptConfig.currencySymbol)}\n` : '') +
        (transaction.changeDue ? `🪙 *Baki:* ${formatCurrency(transaction.changeDue, receiptConfig.currencySymbol)}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🙏 _${receiptConfig.footerMessage || 'Terima kasih atas sokongan anda!'}_`;
      
      setCustomMessage(defaultMsg);
    }
  }, [isOpen, transaction, receiptConfig, settings.fonnteToken]);

  if (!isOpen || !transaction) return null;

  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const isValidPhone = isValidWhatsAppPhone(phone);
  const { date, time } = formatDateTime(transaction.timestamp);

  // Handler: Save phone to customer profile
  const handleSavePhoneToCustomer = async () => {
    if (!normalizedPhone || !transaction.customer) return;
    try {
      await saveCustomer({
        ...transaction.customer,
        phone: phone.trim()
      });
      setSavedPhoneSuccess(true);
      sound.playOkBeep();
      setTimeout(() => setSavedPhoneSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save customer phone', e);
    }
  };

  // Handler: Save Fonnte Token
  const handleSaveFonnteToken = async () => {
    if (!fonnteToken.trim()) return;
    try {
      sound.playKeyBeep(550, 0.04);
      const res = await saveFonnteToken(fonnteToken.trim());
      if (res.success) {
        setTokenSavedSuccess(true);
        sound.playOkBeep();
        setTimeout(() => setTokenSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save Fonnte token', e);
    }
  };

  // Handler: Direct Client PDF Download
  const handleDownloadPdf = async () => {
    sound.playKeyBeep(550, 0.04);
    try {
      const { doc, filename } = await generateReceiptPdf(transaction, receiptConfig);
      doc.save(filename);
      setWebShareTip(`Fail PDF "${filename}" telah dimuat turun.`);
    } catch (err) {
      console.error('Download PDF error:', err);
    }
  };

  // Handler: Native Web Share API (Directly shares the real PDF file into WhatsApp on Android / iOS)
  const handleSharePdfDirectly = async () => {
    sound.playKeyBeep(550, 0.04);
    try {
      const { getBlob, filename } = await generateReceiptPdf(transaction, receiptConfig);
      const blob = getBlob();
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Automatically copy text to clipboard for quick paste if needed
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(customMessage).catch(() => {});
      }

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Only share the file so Android WhatsApp doesn't discard the attachment in favor of text
        await navigator.share({
          files: [file]
        });
        sound.playOkBeep();
        setWebShareTip('Fail PDF resit telah dibuka dalam perkongsian WhatsApp. (Teks resit juga telah disalin ke papan keratan/clipboard).');
        return;
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Native share error, fallback to download & open WhatsApp:', err);
      } else {
        return; // User cancelled share dialog
      }
    }

    // Fallback if device does not support file sharing directly via browser
    handleOpenDirectWhatsAppWithAutoDownload();
  };

  // Handler: Open Direct WhatsApp Web/App Link + Auto-download PDF
  const handleOpenDirectWhatsAppWithAutoDownload = async () => {
    sound.playKeyBeep(550, 0.04);
    try {
      // 1. Automatically download the PDF to device
      const { doc, filename } = await generateReceiptPdf(transaction, receiptConfig);
      doc.save(filename);
    } catch (err) {
      console.error('Download PDF error:', err);
    }

    // 2. Open WhatsApp chat with recipient and message
    const encodedText = encodeURIComponent(customMessage);
    const targetUrl = normalizedPhone 
      ? `https://wa.me/${normalizedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(targetUrl, '_blank');

    setWebShareTip('Fail PDF resit telah dimuat turun secara automatik. Sila tekan ikon lampiran klip kertas (📎) di WhatsApp untuk sertakan PDF kepada pelanggan.');
  };

  // Handler: Send via Fonnte Server API
  const handleSendViaFonnte = async () => {
    if (!normalizedPhone) {
      sound.playVoidBeep();
      setSendResult({
        status: 'failed',
        message: 'Sila masukkan nombor WhatsApp yang sah (cth: 0123456789).'
      });
      return;
    }

    setIsSending(true);
    setSendResult({ status: 'idle' });
    sound.playKeyBeep(550, 0.04);

    try {
      // Step 1: Generate PDF receipt as Blob binary
      const { filename, getBlob, getBase64 } = await generateReceiptPdf(transaction, receiptConfig);
      const pdfBlob = getBlob();
      const pdfBase64 = getBase64();

      // 11. Diagnostic logging (client-side)
      console.log('=== [DIAGNOSTIC] WHATSAPP RECEIPT CLIENT ===');
      console.log('PDF Filename:', filename);
      console.log('PDF Blob Size (bytes):', pdfBlob.size);
      console.log('PDF MIME Type:', pdfBlob.type || 'application/pdf');
      console.log('============================================');

      // Step 2: Auto-save phone to customer profile if checked
      if (savePhoneToCustomer && transaction.customer && transaction.customer.id !== 'c1') {
        try {
          await saveCustomer({
            ...transaction.customer,
            phone: phone.trim()
          });
        } catch (e) {
          console.warn('Could not auto-save customer phone:', e);
        }
      }

      // Step 3: Create multipart/form-data payload containing the binary PDF
      const formData = new FormData();
      formData.append('file', pdfBlob, filename);
      formData.append('phone', normalizedPhone);
      formData.append('message', customMessage);
      formData.append('filename', filename);
      formData.append('transactionId', transaction.id);
      formData.append('invoiceNo', transaction.invoiceNo);
      // Fallback base64 string in case environment strips binary
      formData.append('pdfBase64', pdfBase64);
      
      if (fonnteToken && fonnteToken.trim()) {
        formData.append('token', fonnteToken.trim());
      }

      // Step 4: Call Server-Side Route using multipart/form-data
      const response = await fetch('/api/whatsapp/receipt', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.status === 'warning' || result.pdfAttached === false) {
          sound.playVoidBeep();
          const warningMsg = result.reason 
            ? `⚠️ Mesej WhatsApp berjaya dihantar, tetapi PDF gagal dilampirkan.\n\n${result.reason}`
            : '⚠️ Mesej WhatsApp berjaya dihantar, tetapi PDF resit gagal dilampirkan.';
            
          setSendResult({
            status: 'failed',
            message: warningMsg
          });
          try {
            await updateTransactionWhatsAppStatus(transaction.id, 'failed', normalizedPhone, result.reason || 'PDF resit gagal dilampirkan.');
          } catch (e) {
            console.warn('Status update sync note:', e);
          }
        } else {
          sound.playOkBeep();
          setSendResult({
            status: 'success',
            message: 'Resit PDF berjaya dihantar ke WhatsApp pelanggan!'
          });
          // Update Firestore transaction WhatsApp status safely
          try {
            await updateTransactionWhatsAppStatus(transaction.id, 'sent', normalizedPhone);
          } catch (e) {
            console.warn('Status update sync note:', e);
          }
        }
      } else {
        sound.playVoidBeep();
        let errMsg = result.message || 'Gagal menghantar melalui pelayan Fonnte.';
        if (result.fonnteConfigured === false || !fonnteToken.trim()) {
          setShowTokenConfig(true);
        }
        setSendResult({
          status: 'failed',
          message: errMsg
        });
        // Update Firestore transaction WhatsApp status safely
        try {
          await updateTransactionWhatsAppStatus(transaction.id, 'failed', normalizedPhone, errMsg);
        } catch (e) {
          console.warn('Status update sync note:', e);
        }
      }
    } catch (err: any) {
      sound.playVoidBeep();
      console.error('WhatsApp send request error:', err);
      let errMsg = 'Ralat sambungan ke pelayan semasa menghantar WhatsApp.';
      if (typeof err?.message === 'string' && !err.message.includes('{')) {
        errMsg = err.message;
      }
      setSendResult({
        status: 'failed',
        message: errMsg
      });
      try {
        await updateTransactionWhatsAppStatus(transaction.id, 'failed', normalizedPhone, errMsg);
      } catch (e) {
        console.warn('Status update sync note:', e);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>HANTAR RESIT WHATSAPP</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {transaction.invoiceNo} • {date} {time}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Summary Box */}
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Pelanggan:</div>
              <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{transaction.customer?.name || 'Runcit (Pelanggan Am)'}</span>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1">
                Juruwang: <span className="text-slate-200 font-semibold">{transaction.cashierName || 'Khairul'}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400">Jumlah Bayaran:</div>
              <div className="text-base font-black font-mono text-emerald-400">
                {formatCurrency(transaction.totalAmount, receiptConfig.currencySymbol)}
              </div>
              <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                {transaction.paymentMethod}
              </div>
            </div>
          </div>

          {/* WhatsApp Phone Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>No. Telefon WhatsApp Pelanggan</span>
                <span className="text-rose-400">*</span>
              </label>
              {normalizedPhone && (
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  +{normalizedPhone}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (sendResult.status !== 'idle') setSendResult({ status: 'idle' });
                }}
                placeholder="Contoh: 0123456789 / 01112345678"
                className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 pl-10 border border-slate-800 font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
              <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {!phone && (
              <p className="text-[11px] text-amber-400 font-medium">
                Nombor WhatsApp customer belum dimasukkan. Sila taip nombor di atas.
              </p>
            )}

            {phone && transaction.customer && transaction.customer.id !== 'c1' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={savePhoneToCustomer}
                    onChange={(e) => setSavePhoneToCustomer(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>Simpan nombor ini ke profil pelanggan ({transaction.customer.name})</span>
                </label>

                {!savePhoneToCustomer && (
                  <button
                    type="button"
                    onClick={handleSavePhoneToCustomer}
                    className="text-[10.5px] text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <BookmarkCheck className="w-3 h-3" />
                    <span>{savedPhoneSuccess ? 'Tersimpan!' : 'Simpan Sekarang'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fonnte Device Token Quick Setup Toggle */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2">
            <button
              type="button"
              onClick={() => setShowTokenConfig(!showTokenConfig)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 text-slate-300 font-bold text-[11px]">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Device Token Fonnte (Penghantaran Automatik)</span>
                {fonnteToken.trim() ? (
                  <span className="text-[9.5px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                    Tersedia
                  </span>
                ) : (
                  <span className="text-[9.5px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    Perlu Token
                  </span>
                )}
              </div>
              {showTokenConfig ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showTokenConfig && (
              <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in">
                <p className="text-[10.5px] text-slate-400">
                  Dapatkan Device Token dari akaun <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">fonnte.com</a> anda untuk menghantar resit PDF automatik dari server:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="Masukkan Token Fonnte anda..."
                    className="flex-1 bg-slate-900 text-slate-100 rounded-xl px-3 py-2 border border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSaveFonnteToken}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition active:scale-95 shrink-0"
                    >
                      {tokenSavedSuccess ? 'Tersimpan!' : 'Simpan'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message Preview Section */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mesej WhatsApp & Lampiran PDF</span>
            </label>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 rounded-xl p-3 border border-slate-800 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-slate-500 italic">
              * Fail PDF rasmi (Resit_{transaction.invoiceNo}.pdf) akan dilampirkan secara automatik.
            </p>
          </div>

          {/* Web Share / Download Tip */}
          {webShareTip && (
            <div className="p-3 bg-cyan-500/15 border border-cyan-500/40 rounded-2xl text-cyan-200 flex items-start gap-2.5 animate-in fade-in">
              <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
              <div className="text-[11px] leading-snug">
                {webShareTip}
              </div>
            </div>
          )}

          {/* Feedback Banners */}
          {sendResult.status === 'success' && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <div className="font-extrabold text-xs">✅ RESIT PDF BERJAYA DIHANTAR KE WHATSAPP</div>
                <div className="text-[11px] text-emerald-200/90 mt-0.5 leading-snug">
                  {sendResult.message || 'Mesej WhatsApp dan resit PDF rasmi telah dihantar ke telefon pelanggan.'}
                </div>
              </div>
            </div>
          )}

          {sendResult.status === 'failed' && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <div className="font-extrabold text-xs">STATUS PENGHANTARAN FONNTE</div>
                <div className="text-[11px] text-rose-200/90 mt-0.5 leading-snug">
                  {sendResult.message}
                </div>
                <div className="mt-2 text-[10.5px] text-slate-300">
                  💡 <strong>Alternatif:</strong> Anda boleh tekan butang <strong>"Kongsi PDF Terus ke WhatsApp"</strong> di bawah untuk hantar terus fail PDF melalui aplikasi WhatsApp telefon anda.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2.5 shrink-0">
          
          {/* Main Send Button via Fonnte */}
          <button
            type="button"
            id="btn-send-whatsapp-fonnte"
            disabled={isSending || !phone.trim()}
            onClick={handleSendViaFonnte}
            className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all active:scale-98 ${
              isSending || !phone.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-emerald-950/60'
            }`}
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Menjana PDF & Menghantar WhatsApp...</span>
              </>
            ) : sendResult.status === 'failed' ? (
              <>
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Cuba Lagi (Fonnte API)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Hantar Resit PDF WhatsApp (Fonnte)</span>
              </>
            )}
          </button>

          {/* Primary Mobile Direct Sharing with real PDF attachment (Web Share API) */}
          <button
            type="button"
            id="btn-share-pdf-direct"
            onClick={handleSharePdfDirectly}
            className="w-full py-3 px-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-teal-400 active:scale-98 shadow-md"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>📎 Lampirkan Fail PDF ke WhatsApp (Mobile)</span>
          </button>

          {/* Secondary Alternative Options */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              id="btn-open-whatsapp-direct"
              onClick={handleOpenDirectWhatsAppWithAutoDownload}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700/60 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>💬 Buka Teks WhatsApp</span>
            </button>

            <button
              type="button"
              id="btn-download-receipt-pdf"
              onClick={handleDownloadPdf}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700/60 active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>📥 Muat Turun PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

