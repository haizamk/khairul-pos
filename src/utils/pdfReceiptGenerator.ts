import { jsPDF } from 'jspdf';
import { Transaction, ReceiptConfig } from '../types';
import { formatCurrency, formatDateTime } from './receiptPrinter';
import { generateReceiptQrCodeUrl } from './qrCodeHelper';

/**
 * Loads an image from a URL or Base64 data-URL asynchronously for jsPDF rendering
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Prevent CORS issues
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Normalizes Malaysian / international phone numbers for WhatsApp / Fonnte
 * E.g., "012-345 6789" -> "60123456789", "+60123456789" -> "60123456789"
 */
export function normalizeWhatsAppPhone(phoneStr: string): string {
  if (!phoneStr) return '';
  // Remove all non-digits except initial +
  let cleaned = phoneStr.trim().replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Malaysian local format 01xxxxxxxx -> 601xxxxxxxx
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.substring(1);
  } else if (!cleaned.startsWith('60') && (cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('13') || cleaned.startsWith('14') || cleaned.startsWith('15') || cleaned.startsWith('16') || cleaned.startsWith('17') || cleaned.startsWith('18') || cleaned.startsWith('19'))) {
    cleaned = '60' + cleaned;
  }
  
  return cleaned;
}

export function isValidWhatsAppPhone(phoneStr: string): boolean {
  const norm = normalizeWhatsAppPhone(phoneStr);
  return norm.length >= 10 && norm.length <= 15 && /^60\d{8,12}$/.test(norm);
}

/**
 * Generates official thermal-styled vector PDF for a Transaction
 * Matches the live receipt configuration and typography
 */
export async function generateReceiptPdf(
  tx: Transaction,
  config: ReceiptConfig,
  options?: { qrCodeDataUrl?: string }
): Promise<{ doc: jsPDF; filename: string; getBase64: () => string; getBlob: () => Blob }> {
  const is58mm = config.paperWidth === '58mm';
  const widthMm = is58mm ? 58 : 80;
  
  let logoImg: HTMLImageElement | null = null;
  let logoHeightBuffer = 0;

  if (config.logoType === 'custom_url' && config.customLogoUrl) {
    try {
      logoImg = await loadImage(config.customLogoUrl);
      logoHeightBuffer = 16; // 12mm max image height + 4mm spacing
    } catch (e) {
      console.warn('Failed to load custom logo image for PDF:', e);
    }
  } else if (config.logoType === 'icon') {
    logoHeightBuffer = 12; // circle + spacing
  }

  // Estimate height dynamically based on items count, QR Code, and logo presence
  const estimatedHeightMm = Math.max(
    145,
    75 + tx.items.length * 10 + 
    logoHeightBuffer +
    ((tx.deliveryFee || 0) > 0 ? 12 : 0) +
    (config.footerMessage ? 20 : 0) + 
    (config.address ? 15 : 0) + 
    (tx.status === 'voided' ? 15 : 0) +
    (config.showQrCode ? 35 : 0)
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, estimatedHeightMm],
    compress: true
  });

  const { date, time } = formatDateTime(tx.timestamp);
  const margin = 4;
  const contentWidth = widthMm - margin * 2;
  const centerX = widthMm / 2;
  let y = 7;

  // Set font
  doc.setFont('courier', 'normal');

  // 1. Draw Logo / Icon if enabled
  if (config.logoType === 'custom_url' && logoImg) {
    try {
      const maxLogoWidth = is58mm ? 22 : 28;
      const maxLogoHeight = 12;
      let logoW = logoImg.width;
      let logoH = logoImg.height;
      
      const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH);
      logoW = logoW * scale;
      logoH = logoH * scale;
      
      const logoX = centerX - (logoW / 2);
      doc.addImage(logoImg, 'PNG', logoX, y, logoW, logoH);
      y += logoH + 3.5;
    } catch (err) {
      console.warn('Error rendering custom logo in jsPDF:', err);
    }
  } else if (config.logoType === 'icon') {
    try {
      doc.setLineWidth(0.35);
      doc.circle(centerX, y + 4, 4); // 8mm diameter circle
      doc.setFontSize(6);
      doc.setFont('courier', 'bold');
      
      let iconText = '★';
      if (config.selectedIcon === 'poultry') iconText = '✦';
      if (config.selectedIcon === 'meat') iconText = 'M';
      if (config.selectedIcon === 'fish') iconText = 'F';
      if (config.selectedIcon === 'store') iconText = 'S';
      if (config.selectedIcon === 'halal') iconText = 'HALAL';
      
      if (config.selectedIcon === 'halal') {
        doc.setFontSize(5);
        doc.text(iconText, centerX, y + 4.8, { align: 'center' });
      } else {
        doc.setFontSize(7.5);
        doc.text(iconText, centerX, y + 5.1, { align: 'center' });
      }
      
      y += 11;
      doc.setFont('courier', 'normal'); // Restore style
    } catch (err) {
      console.warn('Error rendering icon in jsPDF:', err);
    }
  }

  // Header Title
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  const companyLines = doc.splitTextToSize(config.companyName || 'KHAIRUL FRESH & FROZEN', contentWidth);
  doc.text(companyLines, centerX, y, { align: 'center' });
  y += companyLines.length * 4.2;

  // Tagline
  if (config.tagline) {
    doc.setFontSize(8);
    doc.setFont('courier', 'italic');
    const tagLines = doc.splitTextToSize(config.tagline, contentWidth);
    doc.text(tagLines, centerX, y, { align: 'center' });
    y += tagLines.length * 3.5;
  }

  // SSM Number
  if (config.ssmNumber) {
    doc.setFontSize(7.5);
    doc.setFont('courier', 'normal');
    let cleanSsm = config.ssmNumber.trim();
    // Strip leading "SSM:" or "SSM" case-insensitively with potential colon/spaces
    cleanSsm = cleanSsm.replace(/^SSM\s*:\s*/i, '');
    
    doc.text(`SSM: ${cleanSsm}`, centerX, y, { align: 'center' });
    y += 3.5;
  }

  // Address
  if (config.address) {
    doc.setFontSize(7.5);
    doc.setFont('courier', 'normal');
    const addrLines = doc.splitTextToSize(config.address, contentWidth);
    doc.text(addrLines, centerX, y, { align: 'center' });
    y += addrLines.length * 3.2;
  }

  // Phone & Web
  if (config.phone) {
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text(`TEL: ${config.phone}`, centerX, y, { align: 'center' });
    y += 3.5;
  }
  if (config.website) {
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.text(config.website, centerX, y, { align: 'center' });
    y += 3.2;
  }

  // VOID Watermark
  if (tx.status === 'voided') {
    y += 1;
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('*** TRANSAKSI DIBATALKAN (VOID) ***', centerX, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  // Divider
  y += 1;
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, widthMm - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // Meta info
  const metaFontSize = is58mm ? 6.8 : 8;
  doc.setFontSize(metaFontSize);
  doc.setFont('courier', 'normal');

  if (config.showInvoiceNo) {
    doc.text('No. Resit:', margin, y);
    doc.setFont('courier', 'bold');
    doc.text(tx.invoiceNo, widthMm - margin, y, { align: 'right' });
    doc.setFont('courier', 'normal');
    y += is58mm ? 3.1 : 3.6;
  }

  if (config.showDateTime) {
    // Tarikh Line
    doc.text('Tarikh:', margin, y);
    doc.text(date, widthMm - margin, y, { align: 'right' });
    y += is58mm ? 3.1 : 3.6;

    // Masa Line
    doc.text('Masa:', margin, y);
    doc.text(time, widthMm - margin, y, { align: 'right' });
    y += is58mm ? 3.1 : 3.6;
  }

  if (config.showCashier) {
    doc.text('Juruwang:', margin, y);
    doc.text(tx.cashierName || 'Khairul', widthMm - margin, y, { align: 'right' });
    y += is58mm ? 3.1 : 3.6;
  }

  if (config.showCustomer) {
    doc.text('Pelanggan:', margin, y);
    doc.setFont('courier', 'bold');
    doc.text(tx.customer.name, widthMm - margin, y, { align: 'right' });
    doc.setFont('courier', 'normal');
    y += is58mm ? 3.1 : 3.6;
  }

  // Divider
  y += 1;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, widthMm - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // Items Header
  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.text('ITEM', margin, y);
  doc.text('JUMLAH', widthMm - margin, y, { align: 'right' });
  y += 3.5;

  // Items List
  (tx.items || []).forEach((item) => {
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    
    // Item name with wrapping if needed
    const itemNameLines = doc.splitTextToSize(item.name || 'Item', contentWidth - 18);
    doc.text(itemNameLines, margin, y);
    
    const formattedTotal = formatCurrency(item.totalPrice || 0, config.currencySymbol);
    doc.text(formattedTotal, widthMm - margin, y, { align: 'right' });
    y += itemNameLines.length * 3.2;

    // Item quantity & unit price
    doc.setFontSize(7.5);
    doc.setFont('courier', 'normal');
    const qtyVal = typeof item.weight === 'number' ? item.weight : (typeof item.quantity === 'number' ? item.quantity : 1);
    const qtyText = item.unit === 'kg'
      ? `  ${qtyVal.toFixed(2)} kg x ${formatCurrency(item.unitPrice || 0, config.currencySymbol)}`
      : `  ${qtyVal} ${item.unit || 'unit'} x ${formatCurrency(item.unitPrice || 0, config.currencySymbol)}`;
    doc.text(qtyText, margin, y);
    y += 3.8;
  });

  // Divider
  y += 1;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, widthMm - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // Subtotal, Discount & Delivery Fee
  const showDelivery = tx.showDeliveryFeeOnReceipt !== undefined ? tx.showDeliveryFeeOnReceipt : (config.showDeliveryFee !== false);
  const hasDelivery = (tx.deliveryFee || 0) > 0 && showDelivery;
  const hasSubtotalBreakdown = (tx.discount || 0) > 0 || hasDelivery;

  if (hasSubtotalBreakdown) {
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('Subjumlah:', margin, y);
    doc.text(formatCurrency(tx.subtotal || tx.totalAmount || 0, config.currencySymbol), widthMm - margin, y, { align: 'right' });
    y += 3.5;

    if ((tx.discount || 0) > 0) {
      doc.text(`Diskaun (${tx.customer?.discountPercent || 0}%):`, margin, y);
      doc.text(`-${formatCurrency(tx.discount || 0, config.currencySymbol)}`, widthMm - margin, y, { align: 'right' });
      y += 3.8;
    }

    if (hasDelivery) {
      doc.setFont('courier', 'bold');
      doc.text('Caj Penghantaran:', margin, y);
      doc.text(`+${formatCurrency(tx.deliveryFee || 0, config.currencySymbol)}`, widthMm - margin, y, { align: 'right' });
      doc.setFont('courier', 'normal');
      y += 3.5;

      if (tx.deliveryNotes) {
        doc.setFontSize(7);
        doc.setFont('courier', 'italic');
        const noteLines = doc.splitTextToSize(`Nota: ${tx.deliveryNotes}`, contentWidth);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 3.0;
        doc.setFontSize(8);
        doc.setFont('courier', 'normal');
      }
    }
  }

  // Grand Total
  doc.setFontSize(10);
  doc.setFont('courier', 'bold');
  doc.text('JUMLAH BESAR:', margin, y);
  doc.text(formatCurrency(tx.totalAmount, config.currencySymbol), widthMm - margin, y, { align: 'right' });
  y += 5;

  // Payment Details
  if (config.showPaymentDetails) {
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    
    const paymentLabel =
      tx.paymentMethod === 'tunai'
        ? 'TUNAI (CASH)'
        : tx.paymentMethod === 'kad_nfc'
        ? 'KAD / NFC'
        : tx.paymentMethod === 'qr_pay'
        ? 'DUITNOW QR'
        : tx.paymentMethod.toUpperCase();

    doc.text('Kaedah Bayaran:', margin, y);
    doc.setFont('courier', 'bold');
    doc.text(paymentLabel, widthMm - margin, y, { align: 'right' });
    doc.setFont('courier', 'normal');
    y += 3.5;

    if (tx.paymentMethod === 'tunai') {
      doc.text('Diterima:', margin, y);
      doc.text(formatCurrency(tx.amountPaid, config.currencySymbol), widthMm - margin, y, { align: 'right' });
      y += 3.5;

      doc.text('Baki:', margin, y);
      doc.setFont('courier', 'bold');
      doc.text(formatCurrency(tx.changeAmount, config.currencySymbol), widthMm - margin, y, { align: 'right' });
      doc.setFont('courier', 'normal');
      y += 3.8;
    }
  }

  // Footer Message
  if (config.footerMessage) {
    y += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, widthMm - margin, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    doc.setFontSize(7.5);
    doc.setFont('courier', 'italic');
    const footerLines = doc.splitTextToSize(config.footerMessage, contentWidth);
    doc.text(footerLines, centerX, y, { align: 'center' });
    y += footerLines.length * 3.2;
  }

  // Dynamic QR Code Rendering in PDF
  if (config.showQrCode) {
    y += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, widthMm - margin, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    try {
      const qrDataUrl = options?.qrCodeDataUrl || await generateReceiptQrCodeUrl(tx, config);
      const qrSize = is58mm ? 22 : 28;
      doc.addImage(qrDataUrl, 'PNG', centerX - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 2.5;

      doc.setFontSize(6.5);
      doc.setFont('courier', 'normal');
      doc.text('Scan untuk Butiran Resit', centerX, y, { align: 'center' });
      y += 3.5;
    } catch (qrErr) {
      console.error('Failed to draw QR code on PDF:', qrErr);
    }
  }

  // Draw Computer Printout Disclaimer Note at the very bottom
  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.15);
  doc.line(margin, y, widthMm - margin, y);
  y += 3.5;

  doc.setFontSize(5.5);
  doc.setFont('courier', 'italic');
  doc.setTextColor(100, 100, 100);
  const disclaimerText = "Resit ini adalah cetakan komputer dan tidak memerlukan tandatangan.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(disclaimerLines, centerX, y, { align: 'center' });
  y += disclaimerLines.length * 2.5;
  doc.setTextColor(0, 0, 0); // Reset text color

  const filename = `Resit_${tx.invoiceNo}.pdf`;

  return {
    doc,
    filename,
    getBase64: () => {
      // Returns base64 string without data:application/pdf;base64, prefix
      const dataUri = doc.output('datauristring');
      return dataUri.split(',')[1] || dataUri;
    },
    getBlob: () => doc.output('blob')
  };
}
