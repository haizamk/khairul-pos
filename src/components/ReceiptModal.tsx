import React, { useState, useEffect } from 'react';
import { Transaction, ReceiptConfig } from '../types';
import { 
  Printer, 
  Share2, 
  CheckCircle, 
  FileText, 
  Store, 
  Phone, 
  MapPin, 
  RotateCcw,
  Sparkles,
  Beef,
  Fish,
  ShoppingBag,
  Download,
  MessageSquare,
  Truck,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatCurrency, formatDateTime, printReceiptWindow } from '../utils/receiptPrinter';
import { generateReceiptPdf } from '../utils/pdfReceiptGenerator';
import { generateReceiptQrCodeUrl } from '../utils/qrCodeHelper';
import { sound } from '../utils/audio';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';

interface ReceiptModalProps {
  transaction: Transaction;
  receiptConfig: ReceiptConfig;
  printSoundEnabled?: boolean;
  onNewSale: () => void;
  onClose?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  receiptConfig,
  printSoundEnabled = true,
  onNewSale,
  onClose,
}) => {
  const { date, time } = formatDateTime(transaction.timestamp);
  const is58mm = receiptConfig.paperWidth === '58mm';
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Delivery fee visibility toggle (can be turned ON/OFF on the fly for receipts & PDF)
  const initialShowDelivery = transaction.showDeliveryFeeOnReceipt !== undefined
    ? transaction.showDeliveryFeeOnReceipt
    : (receiptConfig.showDeliveryFee !== false);
  const [showDeliveryFee, setShowDeliveryFee] = useState<boolean>(initialShowDelivery);

  useEffect(() => {
    if (transaction.showDeliveryFeeOnReceipt !== undefined) {
      setShowDeliveryFee(transaction.showDeliveryFeeOnReceipt);
    } else {
      setShowDeliveryFee(receiptConfig.showDeliveryFee !== false);
    }
  }, [transaction.id, transaction.showDeliveryFeeOnReceipt, receiptConfig.showDeliveryFee]);

  const effectiveTransaction: Transaction = {
    ...transaction,
    showDeliveryFeeOnReceipt: showDeliveryFee,
  };

  const effectiveReceiptConfig: ReceiptConfig = {
    ...receiptConfig,
    showDeliveryFee: showDeliveryFee,
  };

  // Generate QR code data URL once upon mount / config change
  useEffect(() => {
    let active = true;
    const generateQr = async () => {
      if (receiptConfig.showQrCode) {
        try {
          const url = await generateReceiptQrCodeUrl(effectiveTransaction, effectiveReceiptConfig);
          if (active) {
            setQrCodeDataUrl(url);
          }
        } catch (err) {
          console.error('Failed to pre-generate QR code', err);
        }
      }
    };
    generateQr();
    return () => {
      active = false;
    };
  }, [transaction, receiptConfig, showDeliveryFee]);

  const handlePrint = () => {
    printReceiptWindow(effectiveTransaction, effectiveReceiptConfig, { 
      printSoundEnabled, 
      qrCodeDataUrl: qrCodeDataUrl || undefined 
    });
  };

  const handleOpenWhatsApp = () => {
    sound.playKeyBeep(650, 0.04);
    setIsWhatsAppModalOpen(true);
  };

  const handleDownloadPdf = async () => {
    sound.playKeyBeep(550, 0.04);
    try {
      const { doc, filename } = await generateReceiptPdf(effectiveTransaction, effectiveReceiptConfig, {
        qrCodeDataUrl: qrCodeDataUrl || undefined
      });
      doc.save(filename);
    } catch (e) {
      console.error('Download PDF error:', e);
    }
  };

  const renderReceiptIcon = () => {
    switch (receiptConfig.selectedIcon) {
      case 'poultry':
        return <Sparkles className="w-8 h-8 text-zinc-900 mx-auto" />;
      case 'meat':
        return <Beef className="w-8 h-8 text-zinc-900 mx-auto" />;
      case 'fish':
        return <Fish className="w-8 h-8 text-zinc-900 mx-auto" />;
      case 'halal':
        return (
          <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-[10px] mx-auto">
            HALAL
          </div>
        );
      default:
        return <Store className="w-8 h-8 text-zinc-900 mx-auto" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Banner */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
            TRANSAKSI SELESAI
          </span>
        </div>
        <span className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
          {transaction.invoiceNo}
        </span>
      </div>

      {/* Quick Toggle for Delivery Fee Display in Receipt & PDF */}
      {(transaction.deliveryFee || 0) > 0 && (
        <div className="px-4 py-2 bg-slate-800/95 border-b border-slate-750 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-200">Caj Penghantaran:</span>
              <span className="text-xs font-mono font-bold text-cyan-300 ml-1.5">
                +{receiptConfig.currencySymbol}{(transaction.deliveryFee || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="toggle-delivery-fee-receipt-btn"
            onClick={() => {
              sound.playKeyBeep(600, 0.04);
              setShowDeliveryFee((prev) => !prev);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
              showDeliveryFee
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
            title="Klik untuk togol sama ada baris caj penghantaran dipaparkan di resit cetak dan PDF"
          >
            {showDeliveryFee ? (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                <span>Papar di Resit (ON)</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Sembunyi di Resit (OFF)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Realistic Sunmi Thermal Paper Slip Preview */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start bg-slate-950/60 scrollbar-thin scrollbar-thumb-slate-700">
        <div
          className={`bg-[#fdfcf7] text-slate-900 shadow-2xl p-4 sm:p-5 rounded-sm border-t-8 border-amber-500 font-mono transition-all duration-300 ${
            is58mm ? 'w-full max-w-[310px]' : 'w-full max-w-[380px]'
          } ${
            receiptConfig.fontSize === 'small'
              ? 'text-[11px]'
              : receiptConfig.fontSize === 'large'
              ? 'text-[14px]'
              : 'text-[12.5px]'
          }`}
          style={{
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.2)',
          }}
        >
          {/* Top Paper Tear Zig-Zag Edge */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            {receiptConfig.logoType === 'custom_url' && receiptConfig.customLogoUrl ? (
              <img
                src={receiptConfig.customLogoUrl}
                alt="Logo"
                className="max-h-12 max-w-[130px] mx-auto mb-1.5 grayscale contrast-150 object-contain"
              />
            ) : receiptConfig.logoType === 'icon' ? (
              <div className="mb-1">{renderReceiptIcon()}</div>
            ) : null}

            <h2 className="font-black text-sm sm:text-base uppercase tracking-tight text-black">
              {receiptConfig.companyName}
            </h2>
            {receiptConfig.tagline && (
              <div className="text-[10.5px] italic text-slate-600 mt-0.5">
                {receiptConfig.tagline}
              </div>
            )}
            {receiptConfig.ssmNumber && (
              <div className="text-[10px] text-slate-500 font-medium">
                {receiptConfig.ssmNumber}
              </div>
            )}
            {receiptConfig.address && (
              <div className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                {receiptConfig.address}
              </div>
            )}
            {receiptConfig.phone && (
              <div className="text-[11px] font-bold text-black mt-1 flex items-center justify-center gap-1">
                <span>TEL: {receiptConfig.phone}</span>
              </div>
            )}
            {receiptConfig.website && (
              <div className="text-[10px] text-slate-500">{receiptConfig.website}</div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
            {receiptConfig.showInvoiceNo && (
              <div className="flex justify-between">
                <span className="text-slate-600">No. Resit:</span>
                <span className="font-bold">{transaction.invoiceNo}</span>
              </div>
            )}
            {receiptConfig.showDateTime && (
              <div className="flex justify-between">
                <span className="text-slate-600">Tarikh/Masa:</span>
                <span>
                  {date} {time}
                </span>
              </div>
            )}
            {receiptConfig.showCashier && (
              <div className="flex justify-between">
                <span className="text-slate-600">Juruwang:</span>
                <span>{transaction.cashierName || 'Khairul'}</span>
              </div>
            )}
            {receiptConfig.showCustomer && (
              <div className="flex justify-between">
                <span className="text-slate-600">Pelanggan:</span>
                <span className="font-bold">{transaction.customer.name}</span>
              </div>
            )}
          </div>

          {/* Items Breakdown */}
          <div className="py-2.5 space-y-2 border-b border-dashed border-slate-400">
            {transaction.items.map((item, idx) => (
              <div key={item.id || idx}>
                <div className="flex justify-between font-bold">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.totalPrice, receiptConfig.currencySymbol)}</span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between">
                  <span>
                    {item.quantity.toFixed(2)} {item.unit} × {formatCurrency(item.unitPrice, receiptConfig.currencySymbol)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal, Discount, Delivery & Grand Total */}
          <div className="py-2 border-b-2 border-slate-900 space-y-1">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Subjumlah:</span>
              <span className="font-mono font-medium">
                {formatCurrency(transaction.subtotal || transaction.totalAmount, receiptConfig.currencySymbol)}
              </span>
            </div>

            {transaction.discount > 0 && (
              <div className="flex justify-between text-xs text-rose-600">
                <span>Diskaun ({transaction.customer.discountPercent || 0}%):</span>
                <span className="font-mono font-medium">
                  -{formatCurrency(transaction.discount, receiptConfig.currencySymbol)}
                </span>
              </div>
            )}

            {(transaction.deliveryFee || 0) > 0 && showDeliveryFee && (
              <div>
                <div className="flex justify-between text-xs text-slate-900 font-bold">
                  <span>Caj Penghantaran:</span>
                  <span className="font-mono">
                    +{formatCurrency(transaction.deliveryFee || 0, receiptConfig.currencySymbol)}
                  </span>
                </div>
                {transaction.deliveryNotes && (
                  <div className="text-[10px] text-slate-500 italic pl-1">
                    Nota: {transaction.deliveryNotes}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between font-black text-base sm:text-lg pt-1 border-t border-slate-300">
              <span>JUMLAH:</span>
              <span>{formatCurrency(transaction.totalAmount, receiptConfig.currencySymbol)}</span>
            </div>

            {receiptConfig.showPaymentDetails && (
              <div className="pt-1.5 border-t border-dashed border-slate-300 text-[11px] space-y-0.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Kaedah Bayaran:</span>
                  <span className="font-bold uppercase">{transaction.paymentMethod}</span>
                </div>
                {transaction.paymentMethod === 'tunai' && (
                  <>
                    <div className="flex justify-between">
                      <span>Diterima (Tunai):</span>
                      <span>{formatCurrency(transaction.amountPaid, receiptConfig.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-black">
                      <span>Baki:</span>
                      <span>{formatCurrency(transaction.changeAmount, receiptConfig.currencySymbol)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="text-center pt-3 space-y-1 text-[11px] text-slate-600">
            <div>{receiptConfig.footerMessage}</div>
            <div className="font-bold tracking-widest text-black pt-1">
              *** TERIMA KASIH ***
            </div>
            {receiptConfig.showQrCode && (
              <div className="pt-2.5 pb-1 flex flex-col items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Receipt QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold animate-pulse rounded border border-dashed border-slate-300">
                    Menjana QR...
                  </div>
                )}
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
                  Scan untuk Butiran Resit
                </span>
              </div>
            )}
            
            {/* Computer Printout Disclaimer Note */}
            <div className="text-[9.5px] text-slate-400 italic pt-2 mt-2 border-t border-dotted border-slate-300 leading-tight">
              Resit ini adalah cetakan komputer dan tidak memerlukan tandatangan.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2 shadow-lg">
        <div className="grid grid-cols-3 gap-2">
          <button
            id="print-receipt-btn"
            onClick={handlePrint}
            className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak</span>
          </button>

          <button
            id="whatsapp-receipt-btn"
            onClick={handleOpenWhatsApp}
            title="Share via WhatsApp using Fonnte API or Direct Share"
            className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-400/40 shadow-md shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-emerald-100" />
            <span>Share via WhatsApp</span>
          </button>

          <button
            id="download-pdf-btn"
            onClick={handleDownloadPdf}
            className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>PDF Resit</span>
          </button>
        </div>

        <button
          id="new-sale-btn"
          onClick={() => {
            sound.playKeyBeep(700, 0.05);
            onNewSale();
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 border border-emerald-400/30 active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Selesai / Jualan Baru</span>
        </button>
      </div>

      {/* WhatsApp Delivery Modal */}
      <WhatsAppReceiptModal
        isOpen={isWhatsAppModalOpen}
        transaction={effectiveTransaction}
        receiptConfig={effectiveReceiptConfig}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
};
