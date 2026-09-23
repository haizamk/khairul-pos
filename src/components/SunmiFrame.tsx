import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface SunmiFrameProps {
  children: React.ReactNode;
  isFrameMode: boolean;
  onToggleFrameMode: () => void;
}

export const SunmiFrame: React.FC<SunmiFrameProps> = ({
  children,
  isFrameMode,
  onToggleFrameMode,
}) => {
  if (!isFrameMode) {
    return (
      <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        {/* Top Minimal Toolbar */}
        <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-wide text-slate-200">Khairul Fresh POS</span>
          </div>
          <button
            id="toggle-sunmi-frame-btn"
            onClick={onToggleFrameMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700/70 transition-all text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paparan Handheld Sunmi</span>
          </button>
        </div>
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col p-2 sm:p-4">
          <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col bg-slate-900">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-start sm:py-6 px-2 text-slate-100 select-none font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Banner with Device Mode Switch */}
      <header className="w-full max-w-[440px] mb-3 flex items-center justify-between px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
          <span className="font-bold text-slate-200 tracking-wide">Khairul Fresh POS</span>
          <span className="text-[10px] bg-slate-800/90 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
            SIMPLE MODE
          </span>
        </div>
        <button
          id="toggle-fullscreen-view-btn"
          onClick={onToggleFrameMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
          title="Tukar ke mod tablet / skrin lebar"
        >
          <Monitor className="w-3.5 h-3.5 text-emerald-400" />
          <span>Skrin Lebar</span>
        </button>
      </header>

      {/* Sunmi V3 Realistic Device Casing */}
      <div className="relative w-full max-w-[440px] bg-[#1a1d24] rounded-[40px] p-3.5 shadow-2xl border-4 border-[#2c303b] ring-1 ring-slate-700/40 flex flex-col">
        {/* Top Thermal Printer Cylinder Slot / Header */}
        <div className="w-full bg-[#202530] rounded-t-[30px] pt-3 pb-2.5 px-4 flex flex-col items-center border-b border-slate-800/90 relative shadow-inner">
          {/* Orange Accent Bar (Sunmi Signature) */}
          <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-2 opacity-95 shadow-sm"></div>
          
          {/* Paper roll feeder slit */}
          <div className="w-48 h-1 bg-slate-950 rounded-full border-b border-slate-700/50 mb-1.5"></div>
          
          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-mono">
            <span className="font-bold tracking-wider text-slate-300">SUNMI V3</span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
              <span>58mm Thermal Ready</span>
            </div>
          </div>
        </div>

        {/* Device Screen Area */}
        <div className="w-full bg-slate-900 rounded-b-[26px] overflow-hidden flex flex-col min-h-[760px] max-h-[850px] shadow-2xl border border-slate-800 relative">
          {children}
        </div>

        {/* Bottom Sunmi Logo & NFC/Mic area */}
        <div className="w-full pt-3 pb-1 flex items-center justify-between px-6 text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full border border-slate-500 inline-block"></span>
            <span>NFC TAP</span>
          </div>
          <span className="text-slate-300 font-bold tracking-widest">SUNMI</span>
          <span className="text-slate-400 font-mono">5200mAh</span>
        </div>
      </div>
    </div>
  );
};
