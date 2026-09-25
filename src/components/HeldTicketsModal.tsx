import React from 'react';
import { HeldTicket } from '../types';
import { BookmarkCheck, Trash2, ArrowRight, X, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/receiptPrinter';
import { sound } from '../utils/audio';

interface HeldTicketsModalProps {
  heldTickets: HeldTicket[];
  currencySymbol: string;
  onRestoreTicket: (ticket: HeldTicket) => void;
  onDeleteHeldTicket: (ticketId: string) => void;
  onClose: () => void;
}

export const HeldTicketsModal: React.FC<HeldTicketsModalProps> = ({
  heldTickets,
  currencySymbol,
  onRestoreTicket,
  onDeleteHeldTicket,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
              TIKET DISIMPAN ({heldTickets.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Held Tickets */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          {heldTickets.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-semibold">
              Tiada tiket disimpan pada masa ini.
            </div>
          ) : (
            heldTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">
                      Tiket #{ticket.ticketNumber}
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      {ticket.customer.name}
                    </span>
                    {(ticket.deliveryFee || 0) > 0 && (
                      <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        🚚 +{currencySymbol}{(ticket.deliveryFee || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {ticket.items.length} item • {ticket.items.map((i) => i.name).slice(0, 2).join(', ')}
                    {ticket.items.length > 2 ? '...' : ''}
                    {ticket.deliveryNotes ? ` • Nota: ${ticket.deliveryNotes}` : ''}
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-400 mt-1">
                    {formatCurrency(ticket.subtotal + (ticket.deliveryFee || 0), currencySymbol)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sound.playVoidBeep();
                      onDeleteHeldTicket(ticket.id);
                    }}
                    className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20 active:scale-95"
                    title="Padam Tiket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      sound.playOkBeep();
                      onRestoreTicket(ticket);
                      onClose();
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/50 active:scale-95"
                  >
                    <span>Buka</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
