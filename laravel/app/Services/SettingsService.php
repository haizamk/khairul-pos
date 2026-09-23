<?php

namespace App\Services;

class SettingsService
{
    protected FirestoreService $firestore;
    protected string $collection = 'settings';
    protected string $docId = 'global';

    public function __construct(FirestoreService $firestore)
    {
        $this->firestore = $firestore;
    }

    public function getSettings(): array
    {
        $settings = $this->firestore->getDocument($this->collection, $this->docId);
        if (!$settings) {
            return $this->getDefaultSettings();
        }
        $defaults = $this->getDefaultSettings();
        $merged = array_merge($defaults, $settings);
        if (isset($settings['receipt'])) {
            $merged['receipt'] = array_merge($defaults['receipt'], (array)$settings['receipt']);
        }
        return $merged;
    }

    public function getReceiptSettings(): array
    {
        $settings = $this->getSettings();
        return $settings['receipt'] ?? $this->getDefaultSettings()['receipt'];
    }

    public function saveReceiptSettings(array $receiptData): array
    {
        $current = $this->getSettings();
        $currentReceipt = $current['receipt'] ?? $this->getDefaultSettings()['receipt'];
        $mergedReceipt = array_merge($currentReceipt, $receiptData);
        $current['receipt'] = $mergedReceipt;
        
        // Also sync printSoundEnabled if passed
        if (isset($receiptData['printSoundEnabled'])) {
            $current['printSoundEnabled'] = (bool)$receiptData['printSoundEnabled'];
        }

        $this->firestore->setDocument($this->collection, $this->docId, $current);
        return $current;
    }

    public function saveSettings(array $data): array
    {
        $current = $this->getSettings();
        $merged = array_merge($current, $data);
        $this->firestore->setDocument($this->collection, $this->docId, $merged);
        return $merged;
    }

    public function verifyAdminPin(string $pin): bool
    {
        $settings = $this->getSettings();
        return ($settings['adminPin'] ?? '1234') === $pin;
    }

    public function changeAdminPin(string $newPin): bool
    {
        return !empty($this->saveSettings(['adminPin' => $newPin]));
    }

    public function getDefaultSettings(): array
    {
        return [
            'businessName' => 'KHAIRUL FRESH AND FROZEN FOOD',
            'businessAddress' => 'Pasar Borong Harian, Lot 12-14, 50300 Kuala Lumpur',
            'businessPhone' => '012-3456789',
            'adminPin' => '1234',
            'currency' => 'RM',
            'soundEnabled' => true,
            'printSoundEnabled' => true,
            'receipt' => [
                'companyName' => 'KHAIRUL FRESH AND FROZEN FOOD',
                'phone' => '012-3456789',
                'address' => 'Pasar Borong Harian, Lot 12-14, 50300 Kuala Lumpur',
                'website' => 'www.khairulfresh.com',
                'footer' => "Terima Kasih\nDatang Lagi",
                'logo' => '',
                'width' => '58mm',
                'fontSize' => 'standard',
                'showLogo' => false,
                'showInvoice' => true,
                'showDate' => true,
                'showTime' => true,
                'showCashier' => true,
                'showCustomer' => true,
                'showPayment' => true,
                'showQr' => true,
            ],
            'receiptConfig' => [
                'paperWidth' => '58mm',
                'headerText' => 'KHAIRUL FRESH AND FROZEN FOOD',
                'subHeaderText' => 'Ayam, Daging & Makanan Laut Segar',
                'footerText' => "Terima Kasih\nDatang Lagi",
                'showLogo' => false,
                'showCashier' => true,
                'showTax' => false,
                'taxRate' => 0,
            ],
            'paymentConfig' => [
                'cashEnabled' => true,
                'qrEnabled' => true,
                'cardEnabled' => true,
            ],
        ];
    }
}
