import React, { useState, useMemo } from 'react';
import { Transaction, ReceiptConfig } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Banknote, 
  QrCode, 
  CreditCard, 
  Printer, 
  BarChart2, 
  Sparkles,
  ShoppingBag,
  FileSpreadsheet,
  Clock,
  Flame,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from 'recharts';
import { formatCurrency } from '../utils/receiptPrinter';
import { sound } from '../utils/audio';

interface ReportsViewProps {
  transactions: Transaction[];
  receiptConfig: ReceiptConfig;
  onClose: () => void;
}

type ChartViewType = '7days' | 'hourly' | 'monthly';

const MONTH_NAMES = [
  { short: 'Jan', full: 'Januari', index: 0 },
  { short: 'Feb', full: 'Februari', index: 1 },
  { short: 'Mac', full: 'Mac', index: 2 },
  { short: 'Apr', full: 'April', index: 3 },
  { short: 'Mei', full: 'Mei', index: 4 },
  { short: 'Jun', full: 'Jun', index: 5 },
  { short: 'Jul', full: 'Julai', index: 6 },
  { short: 'Ogo', full: 'Ogos', index: 7 },
  { short: 'Sep', full: 'September', index: 8 },
  { short: 'Okt', full: 'Oktober', index: 9 },
  { short: 'Nov', full: 'November', index: 10 },
  { short: 'Dis', full: 'Disember', index: 11 },
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  receiptConfig,
  onClose,
}) => {
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartView, setChartView] = useState<ChartViewType>('7days');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const allCompletedTxs = useMemo(() => {
    return transactions.filter((tx) => tx.status === 'completed');
  }, [transactions]);

  // Extract all available years from transactions + current year
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear]);
    allCompletedTxs.forEach((tx) => {
      const yr = new Date(tx.timestamp).getFullYear();
      if (!isNaN(yr) && yr > 2000) {
        yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allCompletedTxs]);

  // --- CHART DATA GENERATION ---
  // 1. Past 7 Days Trend
  const past7DaysData = useMemo(() => {
    const result: Array<{
      dateKey: string;
      label: string;
      fullDate: string;
      dayName: string;
      sales: number;
      txCount: number;
      isToday: boolean;
    }> = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('ms-MY', { weekday: 'short' });
      const dayNum = d.getDate();
      const label = `${dayName} ${dayNum}`;
      const fullDate = d.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const isToday = i === 0;

      let sales = 0;
      let txCount = 0;

      allCompletedTxs.forEach((tx) => {
        const txDate = new Date(tx.timestamp);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        if (txKey === dateKey) {
          sales += tx.totalAmount;
          txCount++;
        }
      });

      result.push({
        dateKey,
        label,
        fullDate,
        dayName,
        sales: Math.round(sales * 100) / 100,
        txCount,
        isToday,
      });
    }

    return result;
  }, [allCompletedTxs]);

  // 2. Daily Hourly Breakdown (Today or active hours)
  const hourlyData = useMemo(() => {
    const hoursMap = new Map<number, { sales: number; txCount: number }>();
    for (let h = 7; h <= 21; h++) {
      hoursMap.set(h, { sales: 0, txCount: 0 });
    }

    const now = new Date();
    allCompletedTxs.forEach((tx) => {
      const txDate = new Date(tx.timestamp);
      // Filter for today's transactions
      if (
        txDate.getDate() === now.getDate() &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      ) {
        const hour = txDate.getHours();
        if (hoursMap.has(hour)) {
          const current = hoursMap.get(hour)!;
          current.sales += tx.totalAmount;
          current.txCount += 1;
        } else if (hour >= 6 && hour <= 23) {
          hoursMap.set(hour, { sales: tx.totalAmount, txCount: 1 });
        }
      }
    });

    const entries = Array.from(hoursMap.entries()).sort((a, b) => a[0] - b[0]);
    return entries.map(([hour, data]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      sales: Math.round(data.sales * 100) / 100,
      txCount: data.txCount,
    }));
  }, [allCompletedTxs]);

  // 3. Monthly Sales Performance for the Current/Selected Year (Jan - Dec)
  const monthlyData = useMemo(() => {
    const now = new Date();

    return MONTH_NAMES.map((m) => {
      let sales = 0;
      let txCount = 0;

      allCompletedTxs.forEach((tx) => {
        const txDate = new Date(tx.timestamp);
        if (
          txDate.getFullYear() === selectedYear &&
          txDate.getMonth() === m.index
        ) {
          sales += tx.totalAmount;
          txCount++;
        }
      });

      const isCurrentMonth = selectedYear === now.getFullYear() && m.index === now.getMonth();
      const isPastOrCurrent = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && m.index <= now.getMonth());

      return {
        monthIndex: m.index,
        monthKey: `${selectedYear}-${String(m.index + 1).padStart(2, '0')}`,
        shortName: m.short,
        label: m.short,
        fullName: `${m.full} ${selectedYear}`,
        sales: Math.round(sales * 100) / 100,
        txCount,
        avgTicket: txCount > 0 ? Math.round((sales / txCount) * 100) / 100 : 0,
        isCurrentMonth,
        isPastOrCurrent,
      };
    });
  }, [allCompletedTxs, selectedYear]);

  // Annual Summary Metrics
  const yearSummary = useMemo(() => {
    const totalSales = monthlyData.reduce((acc, m) => acc + m.sales, 0);
    const totalTx = monthlyData.reduce((acc, m) => acc + m.txCount, 0);
    const avgTicket = totalTx > 0 ? totalSales / totalTx : 0;
    return {
      totalSales: Math.round(totalSales * 100) / 100,
      totalTx,
      avgTicket: Math.round(avgTicket * 100) / 100,
    };
  }, [monthlyData]);

  // Find Peak / Busy Periods
  const peak7Days = useMemo(() => {
    const sorted = [...past7DaysData].sort((a, b) => b.sales - a.sales);
    return sorted[0]?.sales > 0 ? sorted[0] : null;
  }, [past7DaysData]);

  const peakHourly = useMemo(() => {
    const sorted = [...hourlyData].sort((a, b) => b.sales - a.sales);
    return sorted[0]?.sales > 0 ? sorted[0] : null;
  }, [hourlyData]);

  const peakMonthly = useMemo(() => {
    const sorted = [...monthlyData].sort((a, b) => b.sales - a.sales);
    return sorted[0]?.sales > 0 ? sorted[0] : null;
  }, [monthlyData]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      if (reportPeriod === 'daily') {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      } else if (reportPeriod === 'weekly') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      } else {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
    });
  }, [transactions, reportPeriod]);

  const activeTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => tx.status === 'completed');
  }, [filteredTransactions]);

  const voidedTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => tx.status === 'voided');
  }, [filteredTransactions]);

  // Financial Metrics
  const grossSales = useMemo(() => {
    return activeTransactions.reduce((acc, tx) => acc + tx.totalAmount, 0);
  }, [activeTransactions]);

  const deliveryFeesTotal = useMemo(() => {
    return activeTransactions.reduce((acc, tx) => acc + (tx.deliveryFee || 0), 0);
  }, [activeTransactions]);

  const voidedTotal = useMemo(() => {
    return voidedTransactions.reduce((acc, tx) => acc + tx.totalAmount, 0);
  }, [voidedTransactions]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      tunai: { count: 0, total: 0 },
      kad_nfc: { count: 0, total: 0 },
      qr_pay: { count: 0, total: 0 },
      others: { count: 0, total: 0 },
    };

    activeTransactions.forEach((tx) => {
      if (tx.paymentMethod === 'tunai') {
        breakdown.tunai.count++;
        breakdown.tunai.total += tx.totalAmount;
      } else if (tx.paymentMethod === 'kad_nfc') {
        breakdown.kad_nfc.count++;
        breakdown.kad_nfc.total += tx.totalAmount;
      } else if (tx.paymentMethod === 'qr_pay') {
        breakdown.qr_pay.count++;
        breakdown.qr_pay.total += tx.totalAmount;
      } else {
        breakdown.others.count++;
        breakdown.others.total += tx.totalAmount;
      }
    });

    return breakdown;
  }, [activeTransactions]);

  // Top Products Sold
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; qty: number; total: number }>();
    activeTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const existing = map.get(item.name) || {
          name: item.name,
          unit: item.unit,
          qty: 0,
          total: 0,
        };
        existing.qty += item.quantity;
        existing.total += item.totalPrice;
        map.set(item.name, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeTransactions]);

  const handlePrintZReport = () => {
    sound.playKeyBeep(700, 0.05);
    const dateStr = new Date().toLocaleDateString('ms-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString('ms-MY');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Z-Report Penyata Jualan</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 280px;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .between { display: flex; justify-content: space-between; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(function(){ window.close(); }, 500);">
        <div class="center bold">
          <div>${receiptConfig.companyName}</div>
          <div>PENYATA PENUTUP (${reportPeriod.toUpperCase()})</div>
          <div>TARIKH: ${dateStr} ${timeStr}</div>
        </div>
        <div class="divider"></div>
        <div class="between"><span>Jumlah Transaksi:</span><span class="bold">${activeTransactions.length}</span></div>
        <div class="between"><span>Transaksi Batal (Void):</span><span>${voidedTransactions.length}</span></div>
        <div class="divider"></div>
        <div class="between bold" style="font-size: 14px;">
          <span>JUMLAH BERSIH:</span>
          <span>${formatCurrency(grossSales, receiptConfig.currencySymbol)}</span>
        </div>
        <div class="divider"></div>
        <div class="bold">PECAHAN BAYARAN:</div>
        <div class="between"><span>Tunai (Cash):</span><span>${formatCurrency(paymentBreakdown.tunai.total, receiptConfig.currencySymbol)} (${paymentBreakdown.tunai.count})</span></div>
        <div class="between"><span>Kad / NFC:</span><span>${formatCurrency(paymentBreakdown.kad_nfc.total, receiptConfig.currencySymbol)} (${paymentBreakdown.kad_nfc.count})</span></div>
        <div class="between"><span>DuitNow QR:</span><span>${formatCurrency(paymentBreakdown.qr_pay.total, receiptConfig.currencySymbol)} (${paymentBreakdown.qr_pay.count})</span></div>
        <div class="between"><span>Lain-lain:</span><span>${formatCurrency(paymentBreakdown.others.total, receiptConfig.currencySymbol)} (${paymentBreakdown.others.count})</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 8px;">
          *** TAMAT LAPORAN SUNMI POS ***
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=400,height=500');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPeak = peakMonthly && data.sales > 0 && data.sales === peakMonthly.sales && chartView === 'monthly';
      const pctOfYear = yearSummary.totalSales > 0 ? ((data.sales / yearSummary.totalSales) * 100).toFixed(1) : '0';

      return (
        <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-sm z-50 min-w-[170px]">
          <div className="font-extrabold text-slate-200 flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <span>{data.fullName || data.fullDate || data.label || label}</span>
            {data.isToday && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Hari Ini
              </span>
            )}
            {data.isCurrentMonth && chartView === 'monthly' && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Bulan Ini
              </span>
            )}
            {isPeak && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                ★ Puncak
              </span>
            )}
          </div>

          <div>
            <div className="text-[10px] text-slate-400">Jumlah Jualan</div>
            <div className="text-emerald-400 font-mono font-black text-sm">
              {formatCurrency(payload[0].value, receiptConfig.currencySymbol)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-0.5 border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block">Transaksi:</span>
              <strong className="text-slate-200 font-mono">{data.txCount || 0} resit</strong>
            </div>
            {chartView === 'monthly' && (
              <div>
                <span className="text-slate-500 block">Sumbangan:</span>
                <strong className="text-cyan-300 font-mono">{pctOfYear}%</strong>
              </div>
            )}
            {chartView === 'monthly' && data.avgTicket > 0 && (
              <div className="col-span-2 pt-0.5">
                <span className="text-slate-500">Purata/resit: </span>
                <strong className="text-slate-200 font-mono">{formatCurrency(data.avgTicket, receiptConfig.currencySymbol)}</strong>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
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
            LAPORAN & ANALISIS JUALAN
          </h1>
        </div>

        <button
          onClick={handlePrintZReport}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/60 active:scale-95"
          title="Cetak Penyata Penutup Harian (Z-Report)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Z-Report</span>
        </button>
      </div>

      {/* Period Filter Tabs */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {[
            { id: 'daily', label: 'Hari Ini (Harian)' },
            { id: 'weekly', label: 'Minggu Ini' },
            { id: 'monthly', label: 'Bulan Ini' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playKeyBeep(500, 0.03);
                setReportPeriod(tab.id as any);
              }}
              className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                reportPeriod === tab.id
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60'
                  : 'bg-slate-800/90 text-slate-400 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Gross Sales */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Jumlah Jualan Bersih</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {formatCurrency(grossSales, receiptConfig.currencySymbol)}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Daripada {activeTransactions.length} transaksi selesai</span>
              {deliveryFeesTotal > 0 && (
                <span className="text-cyan-400 font-medium">🚚 Caj Delivery: {formatCurrency(deliveryFeesTotal, receiptConfig.currencySymbol)}</span>
              )}
            </div>
          </div>

          {/* Average Ticket */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Purata Setiap Resit</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {formatCurrency(
                activeTransactions.length > 0 ? grossSales / activeTransactions.length : 0,
                receiptConfig.currencySymbol
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              {voidedTransactions.length} void ({formatCurrency(voidedTotal, receiptConfig.currencySymbol)})
            </div>
          </div>
        </div>

        {/* --- VISUAL SALES TREND CHART (RECHARTS) --- */}
        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3.5">
          {/* Chart Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Carta Trend & Prestasi Jualan
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                {chartView === 'monthly'
                  ? `Prestasi jualan bulanan sepanjang tahun ${selectedYear} berasaskan rekod transaksi POS`
                  : 'Visual corak jualan untuk kenal pasti hari & masa paling sibuk'}
              </p>
            </div>

            {/* Chart Mode Toggle & Year Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {chartView === 'monthly' && availableYears.length > 1 && (
                <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 px-2 py-0.5">
                  <span className="text-[10px] text-slate-500 font-bold mr-1.5 uppercase">Tahun:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      sound.playKeyBeep(520, 0.03);
                      setSelectedYear(Number(e.target.value));
                    }}
                    className="bg-transparent text-xs font-extrabold text-cyan-300 focus:outline-none cursor-pointer py-1"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr} className="bg-slate-900 text-slate-200">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(520, 0.03);
                    setChartView('7days');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartView === '7days'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(520, 0.03);
                    setChartView('hourly');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartView === 'hourly'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Harian (Jam)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(520, 0.03);
                    setChartView('monthly');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartView === 'monthly'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bulanan ({selectedYear})
                </button>
              </div>
            </div>
          </div>

          {/* Peak / Busy Period Insight Banner */}
          {chartView === '7days' && peak7Days && (
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span className="text-slate-300">
                  Hari Paling Sibuk: <strong className="text-emerald-300 font-extrabold">{peak7Days.fullDate}</strong>
                </span>
              </div>
              <div className="font-mono font-bold text-emerald-400">
                {formatCurrency(peak7Days.sales, receiptConfig.currencySymbol)} ({peak7Days.txCount} resit)
              </div>
            </div>
          )}

          {chartView === 'hourly' && peakHourly && (
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300">
                  Waktu Puncak Hari Ini: <strong className="text-amber-300 font-extrabold">{peakHourly.label}</strong>
                </span>
              </div>
              <div className="font-mono font-bold text-amber-400">
                {formatCurrency(peakHourly.sales, receiptConfig.currencySymbol)} ({peakHourly.txCount} resit)
              </div>
            </div>
          )}

          {chartView === 'monthly' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-slate-300">
                    Bulan Puncak ({selectedYear}):
                  </span>
                </div>
                <div className="font-mono font-extrabold text-cyan-300">
                  {peakMonthly && peakMonthly.sales > 0 ? (
                    <span>{peakMonthly.shortName} ({formatCurrency(peakMonthly.sales, receiptConfig.currencySymbol)})</span>
                  ) : (
                    <span className="text-slate-500 font-normal">Tiada Data</span>
                  )}
                </div>
              </div>

              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">
                    Jumlah Jualan {selectedYear}:
                  </span>
                </div>
                <div className="font-mono font-black text-emerald-400">
                  {formatCurrency(yearSummary.totalSales, receiptConfig.currencySymbol)}
                </div>
              </div>

              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">
                    Purata / Resit:
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-200">
                  {formatCurrency(yearSummary.avgTicket, receiptConfig.currencySymbol)} ({yearSummary.totalTx} resit)
                </div>
              </div>
            </div>
          )}

          {/* Recharts Canvas */}
          <div className="w-full h-56 pt-2">
            {chartView === '7days' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={past7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient7" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => `${receiptConfig.currencySymbol}${val}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGradient7)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#0f172a' }}
                    activeDot={{ r: 5, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartView === 'hourly' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => `${receiptConfig.currencySymbol}${val}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => {
                      const isPeak = peakHourly && entry.sales === peakHourly.sales && entry.sales > 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isPeak ? '#f59e0b' : entry.sales > 0 ? '#10b981' : '#334155'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* MONTHLY BAR CHART FOR CURRENT YEAR */}
            {chartView === 'monthly' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
                  <XAxis 
                    dataKey="shortName" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => {
                      if (val >= 1000) {
                        return `${receiptConfig.currencySymbol}${(val / 1000).toFixed(1)}k`;
                      }
                      return `${receiptConfig.currencySymbol}${val}`;
                    }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="sales" radius={[5, 5, 0, 0]} name="Jualan">
                    {monthlyData.map((entry, index) => {
                      const isPeak = peakMonthly && entry.sales === peakMonthly.sales && entry.sales > 0;
                      const isCurrent = entry.isCurrentMonth;
                      
                      let fillColor = '#334155'; // default zero/inactive
                      if (isPeak) {
                        fillColor = '#f59e0b'; // Amber gold peak
                      } else if (isCurrent) {
                        fillColor = '#10b981'; // Emerald current month
                      } else if (entry.sales > 0) {
                        fillColor = '#06b6d4'; // Cyan active
                      }

                      return (
                        <Cell 
                          key={`cell-month-${index}`} 
                          fill={fillColor} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Bar Chart Legend & Highlights */}
          {chartView === 'monthly' && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span>Puncak (Tertinggi)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span>Bulan Semasa</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
                  <span>Ada Jualan</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 inline-block" />
                  <span>Tiada Jualan</span>
                </span>
              </div>

              <div className="text-slate-400 font-medium">
                12 Bulan ({selectedYear})
              </div>
            </div>
          )}
        </div>

        {/* Payment Breakdown Cards */}
        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Pecahan Kaedah Pembayaran</span>
            <span className="text-[11px] text-slate-400 font-normal">Kutipan Tunai & Digital</span>
          </h2>

          <div className="space-y-2 text-xs">
            {/* Tunai */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Tunai (Cash)</div>
                  <div className="text-[10px] text-slate-500">{paymentBreakdown.tunai.count} resit</div>
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-emerald-400">
                {formatCurrency(paymentBreakdown.tunai.total, receiptConfig.currencySymbol)}
              </div>
            </div>

            {/* DuitNow QR */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">DuitNow QR Pay</div>
                  <div className="text-[10px] text-slate-500">{paymentBreakdown.qr_pay.count} resit</div>
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-amber-400">
                {formatCurrency(paymentBreakdown.qr_pay.total, receiptConfig.currencySymbol)}
              </div>
            </div>

            {/* Kad / NFC */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Kad / NFC Touch-to-Pay</div>
                  <div className="text-[10px] text-slate-500">{paymentBreakdown.kad_nfc.count} resit</div>
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-blue-400">
                {formatCurrency(paymentBreakdown.kad_nfc.total, receiptConfig.currencySymbol)}
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Produk Paling Laris
          </h2>

          {topProducts.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">Tiada rekod jualan dalam tempoh ini.</div>
          ) : (
            <div className="divide-y divide-slate-750">
              {topProducts.slice(0, 7).map((prod, idx) => (
                <div key={prod.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-mono font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200">{prod.name}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {prod.qty.toFixed(2)} {prod.unit} terjual
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-400">
                    {formatCurrency(prod.total, receiptConfig.currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
