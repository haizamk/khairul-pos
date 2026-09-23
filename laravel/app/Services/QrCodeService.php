<?php

namespace App\Services;

use chillerlan\QRCode\QRCode;

class QrCodeService
{
    /**
     * Generate a base64 SVG Data URI QR code for an invoice number or verification payload.
     * Offline capable, crisp vector format for thermal printing.
     */
    public static function generateInvoiceQrDataUri(string $invoiceNo): string
    {
        try {
            $qr = new QRCode();
            return (string)$qr->render($invoiceNo);
        } catch (\Throwable $e) {
            // Fallback lightweight SVG inline data-uri in case of any anomaly
            $fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="55" font-family="monospace" font-size="10" text-anchor="middle" fill="#000">' . htmlspecialchars($invoiceNo) . '</text></svg>';
            return 'data:image/svg+xml;base64,' . base64_encode($fallbackSvg);
        }
    }
}
