import { Transaction, ReceiptConfig } from '../types';
import { sound } from './audio';

export function formatCurrency(amount: number | undefined | null, symbol = 'RM'): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${symbol}${safeAmount.toFixed(2)}`;
}

export function formatDateTime(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    const date = d.toLocaleDateString('ms-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: isoString, time: '' };
  }
}

export function printReceiptWindow(
  tx: Transaction, 
  config: ReceiptConfig, 
  options?: { printSoundEnabled?: boolean; qrCodeDataUrl?: string }
): boolean {
  const { date, time } = formatDateTime(tx.timestamp);
  const is58mm = config.paperWidth === '58mm';
  const widthPx = is58mm ? '280px' : '380px';
  const fontSizePx = config.fontSize === 'small' ? '12px' : config.fontSize === 'large' ? '15px' : '13px';

  const itemsHtml = (tx.items || [])
    .map(
      (item) => {
        const qtyVal = typeof item.weight === 'number' ? item.weight : (typeof item.quantity === 'number' ? item.quantity : 1);
        const qtyStr = item.unit === 'kg' ? `${qtyVal.toFixed(2)} kg` : `${qtyVal} ${item.unit || 'unit'}`;
        return `
        <div style="margin-bottom: 6px;">
          <div style="font-weight: bold; display: flex; justify-content: space-between;">
            <span>${item.name || 'Barang'}</span>
            <span>${formatCurrency(item.totalPrice || 0, config.currencySymbol)}</span>
          </div>
          <div style="font-size: 0.88em; color: #333; display: flex; justify-content: space-between;">
            <span>${qtyStr} x ${formatCurrency(item.unitPrice || 0, config.currencySymbol)}</span>
          </div>
        </div>
      `;
      }
    )
    .join('');

  const paymentLabel =
    tx.paymentMethod === 'tunai'
      ? 'TUNAI (CASH)'
      : tx.paymentMethod === 'kad_nfc'
      ? 'KAD / NFC TAP'
      : tx.paymentMethod === 'qr_pay'
      ? 'DUITNOW QR'
      : tx.paymentMethod === 'stripe'
      ? 'STRIPE TOUCH'
      : tx.paymentMethod === 'hitpay'
      ? 'HITPAY'
      : 'HUTANG / LAIN-LAIN';

  const logoHtml =
    config.logoType === 'custom_url' && config.customLogoUrl
      ? `<img src="${config.customLogoUrl}" style="max-height: 55px; max-width: 140px; margin-bottom: 6px; filter: grayscale(100%) contrast(150%);" />`
      : `<div style="display:inline-block; border: 2px solid #000; border-radius: 50%; padding: 6px 10px; font-weight: 900; margin-bottom: 6px; font-size: 16px;">KF</div>`;

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Resit - ${tx.invoiceNo}</title>
      <style>
        @page {
          size: auto;
          margin: 0mm;
        }
        body {
          font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
          width: ${widthPx};
          margin: 0 auto;
          padding: 12px 8px;
          background: #fff;
          color: #000;
          font-size: ${fontSizePx};
          line-height: 1.35;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .double-divider { border-top: 2px solid #000; margin: 8px 0; }
        .flex-between { display: flex; justify-content: space-between; }
        .header-title { font-size: 1.15em; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
        .void-watermark {
          color: red;
          border: 2px solid red;
          font-size: 1.2em;
          font-weight: bold;
          text-align: center;
          padding: 4px;
          margin: 6px 0;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body onload="window.print(); setTimeout(function(){ window.close(); }, 500);">
      <div class="text-center">
        ${config.logoType !== 'none' ? logoHtml : ''}
        <div class="header-title">${config.companyName}</div>
        ${config.tagline ? `<div style="font-size: 0.85em; font-style: italic;">${config.tagline}</div>` : ''}
        ${config.ssmNumber ? `<div style="font-size: 0.8em;">${config.ssmNumber}</div>` : ''}
        ${config.address ? `<div style="font-size: 0.82em; margin-top: 3px;">${config.address}</div>` : ''}
        ${config.phone ? `<div style="font-size: 0.85em; font-weight: bold;">TEL: ${config.phone}</div>` : ''}
        ${config.website ? `<div style="font-size: 0.8em;">${config.website}</div>` : ''}
      </div>

      ${tx.status === 'voided' ? '<div class="void-watermark">*** TRANSAKSI DIBATALKAN (VOID) ***</div>' : ''}

      <div class="divider"></div>

      <div style="font-size: 0.88em;">
        ${config.showInvoiceNo ? `<div class="flex-between"><span>No. Resit:</span><span class="bold">${tx.invoiceNo}</span></div>` : ''}
        ${config.showDateTime ? `<div class="flex-between"><span>Tarikh/Masa:</span><span>${date} ${time}</span></div>` : ''}
        ${config.showCashier ? `<div class="flex-between"><span>Juruwang:</span><span>${tx.cashierName || 'Khairul'}</span></div>` : ''}
        ${config.showCustomer ? `<div class="flex-between"><span>Pelanggan:</span><span class="bold">${tx.customer.name}</span></div>` : ''}
      </div>

      <div class="divider"></div>

      <div>
        ${itemsHtml}
      </div>

      <div class="divider"></div>

      <div>
        ${(tx.discount > 0 || ((tx.deliveryFee || 0) > 0 && config.showDeliveryFee !== false)) ? `
          <div class="flex-between" style="font-size: 0.88em; margin: 2px 0;">
            <span>Subjumlah:</span>
            <span>${formatCurrency(tx.subtotal || tx.totalAmount, config.currencySymbol)}</span>
          </div>
          ${tx.discount > 0 ? `
            <div class="flex-between" style="font-size: 0.88em; margin: 2px 0; color: #333;">
              <span>Diskaun (${tx.customer?.discountPercent || 0}%):</span>
              <span>-${formatCurrency(tx.discount, config.currencySymbol)}</span>
            </div>
          ` : ''}
          ${(tx.deliveryFee || 0) > 0 && (tx.showDeliveryFeeOnReceipt !== undefined ? tx.showDeliveryFeeOnReceipt : config.showDeliveryFee !== false) ? `
            <div class="flex-between bold" style="font-size: 0.88em; margin: 2px 0;">
              <span>Caj Penghantaran:</span>
              <span>+${formatCurrency(tx.deliveryFee || 0, config.currencySymbol)}</span>
            </div>
            ${tx.deliveryNotes ? `<div style="font-size: 0.8em; color: #444; font-style: italic; margin-bottom: 2px;">Nota: ${tx.deliveryNotes}</div>` : ''}
          ` : ''}
          <div class="double-divider"></div>
        ` : ''}
        <div class="flex-between" style="font-size: 1.15em; font-weight: 900; margin: 4px 0;">
          <span>JUMLAH BESAR:</span>
          <span>${formatCurrency(tx.totalAmount, config.currencySymbol)}</span>
        </div>
        ${
          config.showPaymentDetails
            ? `
          <div class="divider"></div>
          <div class="flex-between" style="font-size: 0.88em;">
            <span>Kaedah Bayaran:</span>
            <span class="bold">${paymentLabel}</span>
          </div>
          ${
            tx.paymentMethod === 'tunai'
              ? `
            <div class="flex-between" style="font-size: 0.88em;">
              <span>Diterima (Cash):</span>
              <span>${formatCurrency(tx.amountPaid, config.currencySymbol)}</span>
            </div>
            <div class="flex-between bold" style="font-size: 0.95em;">
              <span>Baki Tunai:</span>
              <span>${formatCurrency(tx.changeAmount, config.currencySymbol)}</span>
            </div>
          `
              : ''
          }
        `
            : ''
        }
      </div>

      <div class="double-divider"></div>

      <div class="text-center" style="font-size: 0.85em; margin-top: 8px;">
        <div>${config.footerMessage}</div>
        <div style="margin-top: 6px; font-weight: bold; letter-spacing: 2px;">*** TERIMA KASIH ***</div>
        ${
          config.showQrCode
            ? `
          <div style="margin-top: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <img src="${
              options?.qrCodeDataUrl ||
              `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                `${config.companyName}\nNo. Resit: ${tx.invoiceNo}\nJumlah: ${formatCurrency(
                  tx.totalAmount,
                  config.currencySymbol
                )}`
              )}`
            }" style="width: 110px; height: 110px; display: inline-block; background: white; padding: 4px; border: 1px solid #ddd; border-radius: 4px;" />
            <div style="font-size: 0.75em; font-weight: bold; color: #444; margin-top: 4px;">SCAN UNTUK BUTIRAN RESIT</div>
          </div>
        `
            : ''
        }
        <div style="margin-top: 14px; font-size: 0.65em; color: #555; font-style: italic; border-top: 1px dotted #ccc; padding-top: 6px; line-height: 1.3;">
          Resit ini adalah cetakan komputer dan tidak memerlukan tandatangan.
        </div>
      </div>
    </body>
    </html>
  `;

  let printDispatched = false;
  const printWindow = window.open('', '_blank', 'width=450,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printDispatched = true;
  } else {
    // Fallback: If popup is blocked by the browser or running in an iframe
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // ignore
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 150);
        printDispatched = true;
      }
    } catch {
      printDispatched = false;
    }
  }

  // Auditory feedback: short beep specifically when thermal receipt print command is triggered
  if (printDispatched && options?.printSoundEnabled !== false) {
    sound.playPrintBeep();
  }

  return printDispatched;
}

export function generateWhatsAppMessage(tx: Transaction, config: ReceiptConfig): string {
  const { date, time } = formatDateTime(tx.timestamp);
  const itemsText = tx.items
    .map((item, idx) => `${idx + 1}. *${item.name}*\n   ${item.quantity.toFixed(2)} ${item.unit} x ${formatCurrency(item.unitPrice, config.currencySymbol)} = *${formatCurrency(item.totalPrice, config.currencySymbol)}*`)
    .join('\n');

  const text = `🧾 *RESIT PEMBELIAN - ${config.companyName}*
----------------------------------------
No. Resit: *${tx.invoiceNo}*
Tarikh: ${date} (${time})
Pelanggan: ${tx.customer.name}
Juruwang: ${tx.cashierName}
----------------------------------------
*SENARAI BARANG:*
${itemsText}
----------------------------------------
*JUMLAH KESELURUHAN: ${formatCurrency(tx.totalAmount, config.currencySymbol)}*
Bayaran: ${tx.paymentMethod.toUpperCase()}
${tx.paymentMethod === 'tunai' ? `Diterima: ${formatCurrency(tx.amountPaid, config.currencySymbol)} | Baki: ${formatCurrency(tx.changeAmount, config.currencySymbol)}\n` : ''}----------------------------------------
${config.footerMessage}
📞 Pertanyaan: ${config.phone}`;

  return encodeURIComponent(text);
}
