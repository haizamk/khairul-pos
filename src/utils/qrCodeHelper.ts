import QRCode from 'qrcode';
import { Transaction, ReceiptConfig } from '../types';
import { formatCurrency, formatDateTime } from './receiptPrinter';

/**
 * Builds the structured summary of the receipt to encode into a QR Code.
 */
export function getReceiptQrContent(tx: Transaction, config: ReceiptConfig): string {
  const { date, time } = formatDateTime(tx.timestamp);
  
  const itemsSummary = (tx.items || [])
    .map(item => {
      const qtyVal = item.weight ?? item.quantity ?? 1;
      const qtyStr = item.unit === 'kg' ? `${qtyVal.toFixed(2)}kg` : `${qtyVal}${item.unit}`;
      return `- ${item.name} (${qtyStr}): ${formatCurrency(item.totalPrice, config.currencySymbol)}`;
    })
    .join('\n');

  return `${config.companyName || 'KHAIRUL FRESH AND FROZEN FOOD'}
===================================
No. Resit: ${tx.invoiceNo}
Tarikh: ${date} ${time}
Pelanggan: ${tx.customer?.name || 'Pelanggan Runcit'}
Juruwang: ${tx.cashierName || 'Khairul'}
-----------------------------------
${itemsSummary}
-----------------------------------
JUMLAH BESAR: ${formatCurrency(tx.totalAmount, config.currencySymbol)}
Kaedah Bayaran: ${tx.paymentMethod.toUpperCase()}
===================================
Terima kasih atas sokongan anda!`;
}

/**
 * Generates a Base64 QR Code Data URL (PNG) for a given transaction.
 * Runs asynchronously and works offline perfectly.
 */
export async function generateReceiptQrCodeUrl(tx: Transaction, config: ReceiptConfig): Promise<string> {
  try {
    const text = getReceiptQrContent(tx, config);
    const dataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR Code:', err);
    // Return empty fallback image or google chart URL fallback
    const text = getReceiptQrContent(tx, config);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;
  }
}
