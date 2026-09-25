import React, { useState, useEffect } from 'react';
import { Customer, HeldTicket, ReceiptConfig } from '../types';
import { useApiSync } from '../context/ApiSyncContext';
import { 
  Users, 
  Clock, 
  Wifi, 
  BatteryMedium, 
  Receipt, 
  History, 
  BarChart3, 
  Settings, 
  BookmarkCheck,
  Store,
  Download,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  AlertTriangle,
  User as UserIcon,
  Shield
} from 'lucide-react';
import { sound } from '../utils/audio';

interface PosHeaderProps {
  receiptConfig: ReceiptConfig;
  selectedCustomer: Customer;
  onOpenCustomerSelect: () => void;
  heldTickets: HeldTicket[];
  onOpenHeldTickets: () => void;
  onOpenTransactions: () => void;
  onOpenReports: () => void;
  onOpenReceiptDesigner: () => void;
  onOpenSettings: () => void;
  onOpenInstallGuide?: () => void;
  onOpenLogin?: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  receiptConfig,
  selectedCustomer,
  onOpenCustomerSelect,
  heldTickets,
  onOpenHeldTickets,
  onOpenTransactions,
  onOpenReports,
  onOpenReceiptDesigner,
  onOpenSettings,
  onOpenInstallGuide,
  onOpenLogin,
}) => {
  const { user, currentUserProfile, isMasterAdmin, logout } = useApiSync();
  const [timeStr, setTimeStr] = useState('');
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStaffLogout = () => {
    sound.playVoidBeep();
    setShowConfirmLogout(true);
  };

  const confirmLogout = async () => {
    sound.playKeyBeep(450, 0.04);
    setShowConfirmLogout(false);
    await logout();
    if (onOpenLogin) {
      onOpenLogin();
    }
  };

  const roleName = currentUserProfile?.role === 'master_admin' || isMasterAdmin
    ? 'Master Admin'
    : currentUserProfile?.role === 'admin'
    ? 'Admin'
    : 'Cashier';

  return (
    <header className="bg-slate-900 border-b border-slate-800/90 text-slate-200 select-none shadow-sm px-3 py-2 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
      {/* 1. Left Section: Customer Selector Button */}
      <button
        id="customer-selector-btn"
        onClick={onOpenCustomerSelect}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-left transition-all cursor-pointer flex-1 min-w-[130px] max-w-[170px] shadow-sm active:scale-95"
        title="Tukar Pelanggan (Runcit / Tetap)"
      >
        <div className="w-5.5 h-5.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Users className="w-3 h-3" />
        </div>
        <div className="overflow-hidden">
          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Pelanggan</div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-100 truncate mt-0.5">
            {selectedCustomer.name}
          </div>
        </div>
      </button>

      {/* 2. Right Section: Navigation Icons, Active User Info & Logout Button */}
      <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap ml-auto shrink-0">
        {/* Held Tickets Button */}
        {heldTickets.length > 0 && (
          <button
            id="held-tickets-btn"
            onClick={onOpenHeldTickets}
            className="relative p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:bg-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Tiket Disimpan (Parked Orders)"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
              {heldTickets.length}
            </span>
          </button>
        )}

        {/* Receipt Designer Shortcut */}
        <button
          id="receipt-designer-btn"
          onClick={onOpenReceiptDesigner}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Receipt Designer (Ubah Logo, Alamat, Format Resit)"
        >
          <Receipt className="w-4 h-4" />
        </button>

        {/* Transaksi (History) */}
        <button
          id="transactions-history-btn"
          onClick={onOpenTransactions}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Rekod Transaksi & Batal / Void"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Reports */}
        <button
          id="reports-btn"
          onClick={onOpenReports}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Laporan Jualan (Harian/Mingguan/Bulanan)"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          id="settings-btn"
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Tetapan Produk, Harga, Pelanggan, Admin PIN, Pengurusan Staf"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Install Guide Button */}
        {onOpenInstallGuide && (
          <button
            id="install-guide-btn"
            onClick={onOpenInstallGuide}
            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Cara Pasang App (Sunmi V3 / Android / PC)"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Divider line */}
        <div className="w-[1px] h-5 bg-slate-800/80 mx-1 hidden xs:block" />

        {/* Active Staff User Badge & Red Log Out Button */}
        {user && currentUserProfile ? (
          <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
            <div 
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-extrabold shadow-sm ${
                currentUserProfile.role === 'master_admin' || isMasterAdmin
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : currentUserProfile.role === 'admin'
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }`}
              title={`Akaun Aktif: ${currentUserProfile.name} (${roleName})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="max-w-[70px] truncate">{currentUserProfile.name}</span>
            </div>

            <button
              id="pos-logout-btn"
              type="button"
              onClick={handleStaffLogout}
              title="Log Keluar"
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-400/30 shadow-md transition cursor-pointer active:scale-95 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-sm shrink-0"
              title="Log Masuk Staf / Juruwang"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Log Masuk</span>
            </button>
          )
        )}
      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showConfirmLogout && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  Log Keluar Akaun?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adakah anda pasti untuk log keluar daripada akaun <span className="text-emerald-300 font-bold">{currentUserProfile?.name || 'Master Admin'}</span> ({roleName})?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmLogout(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-logout"
                onClick={confirmLogout}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Log Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

