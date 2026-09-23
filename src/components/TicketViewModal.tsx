import React, { useMemo } from 'react';
import { CartItem, Customer } from '../types';
import { Trash2, Plus, ArrowLeft, Save, CreditCard, User, AlertCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface TicketViewModalProps {
  cartItems: CartItem[];
  customer: Customer;
  currencySymbol: string;
  onBackToProducts: () => void;
  onClearCart: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItemQuantity: (itemId: string, newQty: number) => void;
  onHoldTicket: () => void;
  onProceedToPayment: () => void;
  onSelectCustomer: () => void;
}

export const TicketViewModal: React.FC<TicketViewModalProps> = ({
  cartItems,
  customer,
  currencySymbol,
  onBackToProducts,
  onClearCart,
  onRemoveItem,
  onUpdateItemQuantity,
  onHoldTicket,
  onProceedToPayment,
  onSelectCustomer,
}) => {
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (customer.discountPercent && customer.discountPercent > 0) {
      return (subtotal * customer.discountPercent) / 100;
    }
    return 0;
  }, [subtotal, customer.discountPercent]);

  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleClear = () => {
    if (cartItems.length === 0) return;
    if (window.confirm('Padam semua item dalam tiket ini?')) {
      sound.playVoidBeep();
      onClearCart();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Top Header matching diagram: TICKET with Trash icon */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            id="ticket-back-btn"
            onClick={onBackToProducts}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Tambah produk lagi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm uppercase tracking-wider text-slate-100">
              TICKET
            </span>
            <span className="bg-emerald-600 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              {cartItems.length}
            </span>
          </div>
        </div>

        <button
          id="clear-ticket-btn"
          onClick={handleClear}
          disabled={cartItems.length === 0}
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-all cursor-pointer"
          title="Padam Semua Tiket"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Customer Info Strip */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <User className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-medium">Pelanggan:</span>
          <span className="font-bold text-slate-200">{customer.name}</span>
          {customer.discountPercent ? (
            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
              Diskaun {customer.discountPercent}%
            </span>
          ) : null}
        </div>
        <button
          onClick={onSelectCustomer}
          className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors cursor-pointer"
        >
          Ubah
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-800/60 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        {cartItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center p-4">
            <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-bold text-slate-300">Tiket Kosong</p>
            <p className="text-xs text-slate-500 mt-1">
              Sila pilih produk dari senarai untuk menambah ke tiket.
            </p>
            <button
              id="empty-add-product-btn"
              onClick={onBackToProducts}
              className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/60 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Pilih Produk Sekarang</span>
            </button>
          </div>
        ) : (
          cartItems.map((item, idx) => (
            <div
              key={item.id}
              className="py-3 px-3 flex flex-col gap-2 bg-slate-800/40 hover:bg-slate-800/70 rounded-2xl my-1 border border-slate-700/60 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 font-semibold">{idx + 1}.</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 pl-4">
                    {item.quantity.toFixed(2)} {item.unit} × {currencySymbol}
                    {item.unitPrice.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {currencySymbol}
                    {item.totalPrice.toFixed(2)}
                  </div>
                  <button
                    onClick={() => {
                      sound.playKeyBeep(450, 0.04);
                      onRemoveItem(item.id);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium hover:underline mt-0.5 cursor-pointer"
                  >
                    Padam
                  </button>
                </div>
              </div>

              {/* Quick Qty adjuster buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Ubah kuantiti:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const newQty = Math.max(0.1, item.quantity - 0.5);
                      onUpdateItemQuantity(item.id, newQty);
                      sound.playKeyBeep(500, 0.03);
                    }}
                    className="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                  >
                    -0.5
                  </button>
                  <button
                    onClick={() => {
                      const newQty = Math.max(0.1, item.quantity - 0.1);
                      onUpdateItemQuantity(item.id, newQty);
                      sound.playKeyBeep(500, 0.03);
                    }}
                    className="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                  >
                    -0.1
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-100 text-xs">
                    {item.quantity.toFixed(2)} {item.unit}
                  </span>
                  <button
                    onClick={() => {
                      const newQty = item.quantity + 0.1;
                      onUpdateItemQuantity(item.id, newQty);
                      sound.playKeyBeep(550, 0.03);
                    }}
                    className="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                  >
                    +0.1
                  </button>
                  <button
                    onClick={() => {
                      const newQty = item.quantity + 0.5;
                      onUpdateItemQuantity(item.id, newQty);
                      sound.playKeyBeep(550, 0.03);
                    }}
                    className="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                  >
                    +0.5
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Button to add more items */}
      <div className="px-3 py-2.5 bg-slate-900 border-t border-slate-800">
        <button
          id="add-more-products-btn"
          onClick={onBackToProducts}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/80 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ Tambah Produk Lain ke Tiket</span>
        </button>
      </div>

      {/* Summary Section matching diagram: JUMLAH RMxx.xx */}
      <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Jumlah Kecil ({cartItems.length} item)</span>
          <span className="font-mono font-medium">
            {currencySymbol}
            {subtotal.toFixed(2)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Diskaun ({customer.discountPercent}%)</span>
            <span className="font-mono font-medium">
              -{currencySymbol}
              {discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
          <span className="text-sm font-black uppercase text-slate-200 tracking-wider">
            JUMLAH
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {currencySymbol}
            {totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bottom Action Bar matching diagram: [SIMPAN] (left) and [BAYAR] (right) */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-3 gap-2.5 shadow-lg">
        <button
          id="hold-ticket-btn"
          onClick={() => {
            sound.playKeyBeep(550, 0.04);
            onHoldTicket();
          }}
          disabled={cartItems.length === 0}
          className="col-span-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          title="Simpan tiket untuk disambung nanti (Park Order)"
        >
          <Save className="w-4 h-4 text-amber-400" />
          <span>SIMPAN</span>
        </button>

        <button
          id="proceed-payment-btn"
          onClick={() => {
            sound.playOkBeep();
            onProceedToPayment();
          }}
          disabled={cartItems.length === 0}
          className="col-span-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-black text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/70 border border-emerald-400/40 active:scale-95"
        >
          <CreditCard className="w-5 h-5" />
          <span>BAYAR {currencySymbol}{totalAmount.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
};
