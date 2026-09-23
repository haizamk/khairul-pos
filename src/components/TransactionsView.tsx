import React, { useState, useMemo } from 'react';
import { Transaction, ReceiptConfig } from '../types';
import { 
  ArrowLeft, 
  Search, 
  Printer, 
  Ban, 
  Share2, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Calendar,
  Filter,
  MessageSquare,
  Download
} from 'lucide-react';
import { formatCurrency, formatDateTime, printReceiptWindow } from '../utils/receiptPrinter';
import { generateReceiptPdf } from '../utils/pdfReceiptGenerator';
import { sound } from '../utils/audio';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  receiptConfig: ReceiptConfig;
  adminPin: string;
  onVoidTransaction: (transactionId: string, reason: string) => void;
  onViewReceipt: (tx: Transaction) => void;
  onClose: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  receiptConfig,
  adminPin,
  onVoidTransaction,
  onViewReceipt,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'voided'>('all');
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<Transaction | null>(null);
  const [whatsAppTx, setWhatsAppTx] = useState<Transaction | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [voidReason, setVoidReason] = useState('Salah timbang / Salah kuantiti');
  const [pinError, setPinError] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  const handleOpenVoidModal = (tx: Transaction) => {
    sound.playKeyBeep(450, 0.04);
    setSelectedTxForVoid(tx);
    setEnteredPin('');
    setVoidReason('Salah timbang / Salah kuantiti');
    setPinError(false);
  };

  const handleConfirmVoid = () => {
    if (!selectedTxForVoid) return;
    if (enteredPin !== adminPin) {
      sound.playVoidBeep();
      setPinError(true);
      return;
    }
    sound.playVoidBeep();
    onVoidTransaction(selectedTxForVoid.id, voidReason);
    setSelectedTxForVoid(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
            REKOD TRANSAKSI & JUALAN
          </h1>
        </div>
        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
          {filteredTransactions.length} Rekod
        </span>
      </div>

      {/* Search & Filters */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no. invoice, nama pelanggan, produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setStatusFilter('voided')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'voided'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
            }`}
          >
            Dibatalkan (Void)
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredTransactions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <p>Tiada rekod transaksi dijumpai.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const { date, time } = formatDateTime(tx.timestamp);
            const isVoided = tx.status === 'voided';
            return (
              <div
                key={tx.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isVoided
                    ? 'bg-rose-500/5 border-rose-500/20 opacity-80'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-100 font-mono">
                        {tx.invoiceNo}
                      </span>
                      {isVoided ? (
                        <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          VOID
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          {tx.paymentMethod}
                        </span>
                      )}
                      {tx.whatsappStatus === 'sent' && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span>✓ WA Dihantar</span>
                        </span>
                      )}
                      {tx.whatsappStatus === 'failed' && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span>✕ WA Gagal</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {date} • {time} • Pelanggan: <span className="text-slate-200 font-bold">{tx.customer.name}</span>
                      {tx.cashierName && (
                        <span> • Juruwang: <span className="text-slate-200 font-bold">{tx.cashierName}</span></span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-base font-black font-mono ${
                        isVoided ? 'text-slate-500 line-through' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(tx.totalAmount, receiptConfig.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx.items.length} item
                    </div>
                  </div>
                </div>

                {/* Items summary */}
                <div className="mt-2.5 text-xs text-slate-400 border-t border-slate-700/50 pt-2 line-clamp-2">
                  {tx.items.map((it) => `${it.name} (${it.quantity.toFixed(1)} ${it.unit})`).join(', ')}
                </div>

                {isVoided && tx.voidReason && (
                  <div className="mt-2 text-[11px] text-rose-300 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    Sebab Batal: {tx.voidReason}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onViewReceipt(tx)}
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Resit</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sound.playKeyBeep(550, 0.04);
                        setWhatsAppTx(tx);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer border border-slate-700"
                      title="Hantar Resit WhatsApp (Fonnte)"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={async () => {
                        sound.playKeyBeep(550, 0.04);
                        try {
                          const { doc, filename } = await generateReceiptPdf(tx, receiptConfig);
                          doc.save(filename);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                      title="Muat Turun PDF Resit"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => printReceiptWindow(tx, receiptConfig)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                      title="Cetak Semula Resit"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {!isVoided && (
                      <button
                        onClick={() => handleOpenVoidModal(tx)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Batal (Void)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* WhatsApp Delivery Modal */}
      {whatsAppTx && (
        <WhatsAppReceiptModal
          isOpen={!!whatsAppTx}
          transaction={whatsAppTx}
          receiptConfig={receiptConfig}
          onClose={() => setWhatsAppTx(null)}
        />
      )}

      {/* Admin PIN & Reason Modal for Voiding */}
      {selectedTxForVoid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-700/80 p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="font-extrabold text-sm uppercase">
                Batal Transaksi ({selectedTxForVoid.invoiceNo})
              </h2>
            </div>

            <p className="text-xs text-slate-300">
              Membatalkan transaksi akan mengubah status rekod jualan ini kepada VOID dan menolak jumlah daripada laporan jualan.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Sebab Pembatalan
              </label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 text-xs border border-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="Salah timbang / Salah kuantiti">Salah timbang / Salah kuantiti</option>
                <option value="Pelanggan batalkan pesanan">Pelanggan batalkan pesanan</option>
                <option value="Salah harga / Salah produk">Salah harga / Salah produk</option>
                <option value="Masalah kaedah pembayaran">Masalah kaedah pembayaran</option>
                <option value="Ujian sistem POS">Ujian sistem POS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Masukkan Admin PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Default: 1234"
                className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 text-center text-lg font-mono tracking-widest border border-slate-700 focus:outline-none focus:border-rose-500"
              />
              {pinError && (
                <div className="text-[11px] text-rose-400 font-bold mt-1">
                  PIN salah! Sila cuba lagi.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSelectedTxForVoid(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Sahkan Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
