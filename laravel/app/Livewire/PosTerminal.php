<?php

namespace App\Livewire;

use Livewire\Component;
use App\Services\ProductService;
use App\Services\CustomerService;
use App\Services\TransactionService;
use App\Services\SettingsService;
use App\Services\FirestoreService;

class PosTerminal extends Component
{
    // POS Workflow state
    // 'product_list' or 'ticket_view' (Keypad overlays are handled instantly via Alpine.js)
    public string $currentStep = 'product_list';

    // Active Cart & Ticket
    public array $cartItems = [];
    public ?array $selectedCustomer = null;

    // Held Tickets from Firestore
    public array $heldTickets = [];
    public bool $isHeldTicketsModalOpen = false;

    // Customer Selection & Management (Phase 2)
    public bool $isCustomerModalOpen = false;
    public string $customerSearchQuery = '';
    public bool $isAddCustomerFormOpen = false;
    public string $newCustomerName = '';
    public string $newCustomerPhone = '';
    public string $newCustomerType = 'runcit';

    // Payment & Checkout (Phase 2)
    public bool $isPaymentModalOpen = false;
    public string $paymentMethod = 'cash'; // 'cash', 'qr', 'card'
    public bool $isSaleSuccessModalOpen = false;
    public ?array $lastTransaction = null;
    public ?string $paymentError = null;

    // View options
    public bool $isWideMode = false;
    public string $searchTerm = '';
    public string $selectedCategory = 'Semua';

    // Diagnostics / System info
    public array $cloudStatus = [];
    public ?string $toastMessage = null;

    // Phase 3: Receipt, Designer, Preview, Reprint & Sound
    public array $receiptSettings = [];
    public bool $isReceiptDesignerOpen = false;
    public string $designerCompanyName = 'KHAIRUL FRESH AND FROZEN FOOD';
    public string $designerPhone = '012-3456789';
    public string $designerAddress = "Pasar Borong Harian, Lot 12-14,\n50300 Kuala Lumpur";
    public string $designerWebsite = 'www.khairulfresh.com';
    public string $designerFooter = "Terima Kasih!\nSila Datang Lagi";
    public string $designerLogo = '';
    public string $designerWidth = '58mm';
    public string $designerFontSize = 'standard';
    public bool $designerShowLogo = false;
    public bool $designerShowInvoice = true;
    public bool $designerShowDate = true;
    public bool $designerShowTime = true;
    public bool $designerShowCashier = true;
    public bool $designerShowCustomer = true;
    public bool $designerShowPayment = true;
    public bool $designerShowQr = true;
    public bool $designerPrintSoundEnabled = true;

    // Dedicated Preview & Reprint state
    public bool $isReceiptPreviewModalOpen = false;
    public ?array $previewTransaction = null;
    public bool $isReprintModalOpen = false;
    public array $recentTransactions = [];
    public string $reprintSearchQuery = '';
    public string $reprintDateFilter = 'all';

    // Admin PIN & Settings Protection (Settings/Designer require Admin PIN; Cashier sales & reprint NEVER require PIN)
    public bool $isAdminAuthenticated = false;
    public bool $isAdminPinModalOpen = false;
    public string $adminPinInput = '';
    public string $adminPinError = '';
    public string $adminActionTarget = 'settings'; // 'settings' or 'designer'
    public bool $isSettingsModalOpen = false;

    public function mount(
        CustomerService $customerService,
        TransactionService $txService,
        FirestoreService $firestore,
        SettingsService $settingsService
    ) {
        $this->selectedCustomer = $customerService->getDefaultCustomer();
        $this->heldTickets = $txService->getHeldTickets();
        $this->cloudStatus = $firestore->testConnection();
        $this->receiptSettings = $settingsService->getReceiptSettings();
        $this->syncDesignerPropsWithSettings();
    }

    public function syncDesignerPropsWithSettings(): void
    {
        $cfg = $this->receiptSettings;
        $this->designerCompanyName = $cfg['companyName'] ?? 'KHAIRUL FRESH AND FROZEN FOOD';
        $this->designerPhone = $cfg['phone'] ?? '012-3456789';
        $this->designerAddress = $cfg['address'] ?? "Pasar Borong Harian, Lot 12-14,\n50300 Kuala Lumpur";
        $this->designerWebsite = $cfg['website'] ?? 'www.khairulfresh.com';
        $this->designerFooter = $cfg['footer'] ?? "Terima Kasih!\nSila Datang Lagi";
        $this->designerLogo = $cfg['logo'] ?? '';
        $this->designerWidth = $cfg['width'] ?? '58mm';
        $this->designerFontSize = $cfg['fontSize'] ?? 'standard';
        $this->designerShowLogo = (bool)($cfg['showLogo'] ?? false);
        $this->designerShowInvoice = (bool)($cfg['showInvoice'] ?? true);
        $this->designerShowDate = (bool)($cfg['showDate'] ?? true);
        $this->designerShowTime = (bool)($cfg['showTime'] ?? true);
        $this->designerShowCashier = (bool)($cfg['showCashier'] ?? true);
        $this->designerShowCustomer = (bool)($cfg['showCustomer'] ?? true);
        $this->designerShowPayment = (bool)($cfg['showPayment'] ?? true);
        $this->designerShowQr = (bool)($cfg['showQr'] ?? true);
        $this->designerPrintSoundEnabled = (bool)($this->receiptSettings['printSoundEnabled'] ?? true);
    }

    /**
     * Add item to ticket after keypad confirmation (called directly by Alpine)
     */
    public function addItemToTicket(
        string $productId,
        string $name,
        float $unitPrice,
        float $quantity,
        string $unit
    ) {
        $unitPrice = round(max(0, $unitPrice), 2);
        $quantity = round(max(0.01, $quantity), 2);
        $totalPrice = round($unitPrice * $quantity, 2);

        $this->cartItems[] = [
            'id' => 'cart_' . time() . '_' . substr(md5(uniqid()), 0, 4),
            'productId' => $productId,
            'name' => $name,
            'unitPrice' => $unitPrice,
            'quantity' => $quantity,
            'unit' => strtolower($unit),
            'totalPrice' => $totalPrice,
        ];

        $this->currentStep = 'ticket_view';
        $this->toastMessage = "Item {$name} ditambah ke tiket";
    }

    /**
     * Update quantity of an existing item in ticket
     */
    public function updateItemQuantity(string $itemId, float $newQty)
    {
        $newQty = round(max(0, $newQty), 2);
        if ($newQty <= 0) {
            $this->removeItem($itemId);
            return;
        }

        foreach ($this->cartItems as &$item) {
            if ($item['id'] === $itemId) {
                $item['quantity'] = $newQty;
                $item['totalPrice'] = round($newQty * $item['unitPrice'], 2);
                break;
            }
        }
    }

    /**
     * Edit item price directly from ticket
     */
    public function updateItemPrice(string $itemId, float $newPrice)
    {
        $newPrice = round(max(0, $newPrice), 2);
        foreach ($this->cartItems as &$item) {
            if ($item['id'] === $itemId) {
                $item['unitPrice'] = $newPrice;
                $item['totalPrice'] = round($item['quantity'] * $newPrice, 2);
                break;
            }
        }
    }

    /**
     * Remove single item from ticket
     */
    public function removeItem(string $itemId)
    {
        $this->cartItems = array_values(array_filter($this->cartItems, fn($it) => $it['id'] !== $itemId));
        if (empty($this->cartItems)) {
            $this->currentStep = 'product_list';
        }
    }

    /**
     * Clear all items from ticket
     */
    public function clearCart()
    {
        $this->cartItems = [];
        $this->currentStep = 'product_list';
        $this->toastMessage = "Tiket telah dikosongkan";
    }

    /**
     * Switch view between Product List and Ticket
     */
    public function setStep(string $step)
    {
        if (in_array($step, ['product_list', 'ticket_view'])) {
            $this->currentStep = $step;
        }
    }

    /**
     * Hold ticket (SIMPAN) to Firestore
     */
    public function holdCurrentTicket(TransactionService $txService)
    {
        if (empty($this->cartItems)) {
            return;
        }

        $heldData = [
            'ticketNumber' => count($this->heldTickets) + 1,
            'customer' => $this->selectedCustomer,
            'items' => $this->cartItems,
            'subtotal' => $this->getSubtotalProperty(),
            'totalAmount' => $this->getTotalAmountProperty(),
            'createdAt' => time() * 1000,
        ];

        $txService->holdTicket($heldData);
        $this->heldTickets = $txService->getHeldTickets();

        $this->cartItems = [];
        $this->currentStep = 'product_list';
        $this->toastMessage = "Tiket disimpan dalam Firestore";
    }

    /**
     * Restore a held ticket from Firestore
     */
    public function restoreHeldTicket(string $heldTicketId, TransactionService $txService)
    {
        foreach ($this->heldTickets as $held) {
            if (($held['id'] ?? '') === $heldTicketId) {
                $this->cartItems = $held['items'] ?? [];
                if (!empty($held['customer'])) {
                    $this->selectedCustomer = $held['customer'];
                }
                $txService->deleteHeldTicket($heldTicketId);
                $this->heldTickets = $txService->getHeldTickets();
                $this->isHeldTicketsModalOpen = false;
                $this->currentStep = 'ticket_view';
                $this->toastMessage = "Tiket disimpan telah dimuat semula";
                return;
            }
        }
    }

    public function toggleHeldTicketsModal()
    {
        $this->isHeldTicketsModalOpen = !$this->isHeldTicketsModalOpen;
    }

    public function toggleWideMode()
    {
        $this->isWideMode = !$this->isWideMode;
    }

    public function toggleCustomerModal()
    {
        $this->isCustomerModalOpen = !$this->isCustomerModalOpen;
        $this->isAddCustomerFormOpen = false;
        $this->customerSearchQuery = '';
    }

    public function selectCustomer(string $customerId, CustomerService $customerService)
    {
        $customer = $customerService->getCustomerById($customerId);
        if ($customer) {
            $this->selectedCustomer = $customer;
            $this->isCustomerModalOpen = false;
            $this->toastMessage = "Pelanggan dipilih: {$customer['name']}";
        }
    }

    public function resetCustomerToDefault(CustomerService $customerService)
    {
        $this->selectedCustomer = $customerService->getDefaultCustomer();
        $this->isCustomerModalOpen = false;
        $this->toastMessage = "Pelanggan diset ke Runcit";
    }

    public function toggleAddCustomerForm()
    {
        $this->isAddCustomerFormOpen = !$this->isAddCustomerFormOpen;
    }

    public function saveNewCustomer(CustomerService $customerService)
    {
        $name = trim($this->newCustomerName);
        if (empty($name)) {
            return;
        }

        $newCustomer = $customerService->saveCustomer([
            'name' => $name,
            'phone' => trim($this->newCustomerPhone),
            'type' => $this->newCustomerType ?: 'runcit',
            'specialPriceEnabled' => in_array($this->newCustomerType, ['restoran', 'pemborong']),
        ]);

        $this->selectedCustomer = $newCustomer;
        $this->newCustomerName = '';
        $this->newCustomerPhone = '';
        $this->newCustomerType = 'runcit';
        $this->isAddCustomerFormOpen = false;
        $this->isCustomerModalOpen = false;
        $this->toastMessage = "Pelanggan baru ditambah: {$name}";
    }

    public function openPaymentModal()
    {
        if (empty($this->cartItems)) {
            return;
        }

        $this->isPaymentModalOpen = true;
        $this->paymentMethod = 'cash';
        $this->paymentError = null;
    }

    public function closePaymentModal()
    {
        $this->isPaymentModalOpen = false;
        $this->paymentError = null;
    }

    public function setPaymentMethod(string $method)
    {
        if (in_array($method, ['cash', 'qr', 'card'])) {
            $this->paymentMethod = $method;
            $this->paymentError = null;
        }
    }

    public function completeSale(
        string $method,
        float $receivedAmount,
        TransactionService $txService,
        CustomerService $customerService
    ) {
        if (empty($this->cartItems)) {
            $this->paymentError = "Tiada item dalam tiket.";
            return;
        }

        $totalAmount = $this->getTotalAmountProperty();
        $receivedAmount = round((float)$receivedAmount, 2);

        if ($method === 'cash') {
            if ($receivedAmount < $totalAmount) {
                $this->paymentError = "TUNAI TIDAK MENCUKUPI";
                return;
            }
            $changeAmount = round(max(0, $receivedAmount - $totalAmount), 2);
        } else {
            // For QR or Card (placeholder architecture)
            $receivedAmount = $totalAmount;
            $changeAmount = 0.0;
        }

        $invoiceNo = $txService->getNextInvoiceNo();

        $txData = [
            'invoiceNo' => $invoiceNo,
            'customer' => [
                'id' => $this->selectedCustomer['id'] ?? 'cust_runcit',
                'name' => $this->selectedCustomer['name'] ?? 'Runcit',
                'type' => $this->selectedCustomer['type'] ?? 'runcit',
                'phone' => $this->selectedCustomer['phone'] ?? '',
            ],
            'items' => array_map(function ($item) {
                return [
                    'id' => $item['productId'] ?? $item['id'],
                    'name' => $item['name'],
                    'quantity' => (float)$item['quantity'],
                    'unit' => (string)$item['unit'],
                    'unitPrice' => (float)$item['unitPrice'],
                    'totalPrice' => (float)$item['totalPrice'],
                ];
            }, $this->cartItems),
            'subtotal' => $this->getSubtotalProperty(),
            'discountAmount' => $this->getDiscountAmountProperty(),
            'totalAmount' => $totalAmount,
            'paymentMethod' => $method,
            'paymentStatus' => $method === 'cash' ? 'paid' : 'pending',
            'amountReceived' => $receivedAmount,
            'receivedAmount' => $receivedAmount,
            'change' => $changeAmount,
            'changeAmount' => $changeAmount,
            'timestamp' => time() * 1000,
            'date' => date('Y-m-d H:i:s'),
        ];

        try {
            $savedTx = $txService->createTransaction($txData);
            
            // Set transaction and open success modal
            $this->lastTransaction = $savedTx;
            $this->previewTransaction = $savedTx;
            $this->isPaymentModalOpen = false;
            $this->isSaleSuccessModalOpen = true;
            $this->paymentError = null;

            // Reset Ticket state immediately
            $this->cartItems = [];
            $this->selectedCustomer = $customerService->getDefaultCustomer();
            $this->currentStep = 'product_list';
            $this->toastMessage = "Jualan selesai: {$invoiceNo}";
            $this->dispatch('sale-completed');
        } catch (\Throwable $e) {
            $this->paymentError = "GAGAL SIMPAN JUALAN: Sila tekan CUBA LAGI.";
        }
    }

    public function closeSuccessModal()
    {
        $this->isSaleSuccessModalOpen = false;
        $this->lastTransaction = null;
        $this->currentStep = 'product_list';
        $this->dispatch('step-changed', step: 'product_list');
    }

    // ==========================================
    // Phase 3: Receipt Designer & Admin PIN Protection
    // ==========================================
    public function requestAdminAccess(string $target = 'settings')
    {
        $this->adminActionTarget = $target;

        if ($this->isAdminAuthenticated) {
            if ($target === 'designer') {
                $this->openReceiptDesigner(app(SettingsService::class));
            } else {
                $this->isSettingsModalOpen = true;
            }
            return;
        }

        $this->adminPinInput = '';
        $this->adminPinError = '';
        $this->isAdminPinModalOpen = true;
    }

    public function appendAdminPin(string $digit)
    {
        if (strlen($this->adminPinInput) < 6) {
            $this->adminPinInput .= $digit;
            $this->adminPinError = '';
        }
    }

    public function backspaceAdminPin()
    {
        $this->adminPinInput = substr($this->adminPinInput, 0, -1);
        $this->adminPinError = '';
    }

    public function clearAdminPin()
    {
        $this->adminPinInput = '';
        $this->adminPinError = '';
    }

    public function verifyAdminPin(SettingsService $settingsService)
    {
        if (empty($this->adminPinInput)) {
            $this->adminPinError = 'Sila masukkan Admin PIN.';
            return;
        }

        if ($settingsService->verifyAdminPin($this->adminPinInput)) {
            $this->isAdminAuthenticated = true;
            $this->isAdminPinModalOpen = false;
            $this->adminPinInput = '';
            $this->adminPinError = '';

            if ($this->adminActionTarget === 'designer') {
                $this->openReceiptDesigner($settingsService);
            } else {
                $this->isSettingsModalOpen = true;
            }
        } else {
            $this->adminPinError = 'Admin PIN tidak tepat! Sila cuba lagi.';
            $this->adminPinInput = '';
        }
    }

    public function closeAdminPinModal()
    {
        $this->isAdminPinModalOpen = false;
        $this->adminPinInput = '';
        $this->adminPinError = '';
    }

    public function closeSettingsModal()
    {
        $this->isSettingsModalOpen = false;
    }

    public function openReceiptDesigner(SettingsService $settingsService)
    {
        $this->receiptSettings = $settingsService->getReceiptSettings();
        $this->syncDesignerPropsWithSettings();
        $this->isReceiptDesignerOpen = true;
    }

    public function closeReceiptDesigner()
    {
        $this->isReceiptDesignerOpen = false;
    }

    public function saveReceiptDesignerSettings(SettingsService $settingsService)
    {
        $data = [
            'companyName' => trim($this->designerCompanyName) ?: 'KHAIRUL FRESH AND FROZEN FOOD',
            'phone' => trim($this->designerPhone),
            'address' => trim($this->designerAddress),
            'website' => trim($this->designerWebsite),
            'footer' => trim($this->designerFooter),
            'logo' => trim($this->designerLogo),
            'width' => in_array($this->designerWidth, ['58mm', '80mm']) ? $this->designerWidth : '58mm',
            'fontSize' => in_array($this->designerFontSize, ['compact', 'standard', 'large']) ? $this->designerFontSize : 'standard',
            'showLogo' => (bool)$this->designerShowLogo,
            'showInvoice' => (bool)$this->designerShowInvoice,
            'showDate' => (bool)$this->designerShowDate,
            'showTime' => (bool)$this->designerShowTime,
            'showCashier' => (bool)$this->designerShowCashier,
            'showCustomer' => (bool)$this->designerShowCustomer,
            'showPayment' => (bool)$this->designerShowPayment,
            'showQr' => (bool)$this->designerShowQr,
            'printSoundEnabled' => (bool)$this->designerPrintSoundEnabled,
        ];

        $updated = $settingsService->saveReceiptSettings($data);
        $this->receiptSettings = $updated['receipt'] ?? $data;
        $this->toastMessage = "Tetapan resit disimpan ke Firestore";
        $this->dispatch('receipt-settings-saved', settings: $this->receiptSettings);
    }

    // ==========================================
    // Phase 3: Reprint Actions
    // ==========================================
    public function openReprintModal(TransactionService $txService)
    {
        $all = $txService->getAllTransactions();
        // Sort newest first
        usort($all, function ($a, $b) {
            $tA = $a['timestamp'] ?? (strtotime($a['date'] ?? '') * 1000);
            $tB = $b['timestamp'] ?? (strtotime($b['date'] ?? '') * 1000);
            return $tB <=> $tA;
        });
        $this->recentTransactions = $all;
        $this->isReprintModalOpen = true;
        $this->reprintSearchQuery = '';
    }

    public function closeReprintModal()
    {
        $this->isReprintModalOpen = false;
    }

    public function openReceiptPreview(string $transactionId, TransactionService $txService)
    {
        $tx = $txService->getTransactionById($transactionId);
        if (!$tx) {
            foreach ($this->recentTransactions as $r) {
                if (($r['id'] ?? '') === $transactionId || ($r['invoiceNo'] ?? '') === $transactionId) {
                    $tx = $r;
                    break;
                }
            }
        }

        if ($tx) {
            $this->previewTransaction = $tx;
            $this->isReceiptPreviewModalOpen = true;
            $this->isReprintModalOpen = false;
        }
    }

    public function backToTransactionList()
    {
        $this->isReceiptPreviewModalOpen = false;
        $this->isReprintModalOpen = true;
    }

    public function setReprintDateFilter(string $filter)
    {
        $this->reprintDateFilter = $filter;
    }

    public function closeReceiptPreviewModal()
    {
        $this->isReceiptPreviewModalOpen = false;
        $this->previewTransaction = null;
    }

    public function setDesignerWidth(string $width)
    {
        if (in_array($width, ['58mm', '80mm'])) {
            $this->designerWidth = $width;
            $this->receiptSettings['width'] = $width;
        }
    }

    public function getSubtotalProperty(): float
    {
        return round(array_reduce($this->cartItems, fn($acc, $item) => $acc + (float)$item['totalPrice'], 0.0), 2);
    }

    public function getDiscountAmountProperty(): float
    {
        $sub = $this->getSubtotalProperty();
        $discountPercent = (float)($this->selectedCustomer['discountPercent'] ?? 0);
        if ($discountPercent > 0) {
            return round(($sub * $discountPercent) / 100, 2);
        }
        return 0.0;
    }

    public function getTotalAmountProperty(): float
    {
        return round(max(0, $this->getSubtotalProperty() - $this->getDiscountAmountProperty()), 2);
    }

    public function getFilteredTransactionsProperty(): array
    {
        $list = $this->recentTransactions;

        // Date Filter
        if ($this->reprintDateFilter === 'today') {
            $today = date('Y-m-d');
            $list = array_filter($list, function ($tx) use ($today) {
                $d = '';
                if (!empty($tx['timestamp'])) {
                    $d = date('Y-m-d', $tx['timestamp'] / 1000);
                } elseif (!empty($tx['date'])) {
                    $d = date('Y-m-d', strtotime($tx['date']));
                }
                return $d === $today;
            });
        } elseif (!empty($this->reprintDateFilter) && $this->reprintDateFilter !== 'all') {
            $target = $this->reprintDateFilter;
            $list = array_filter($list, function ($tx) use ($target) {
                $d = '';
                if (!empty($tx['timestamp'])) {
                    $d = date('Y-m-d', $tx['timestamp'] / 1000);
                } elseif (!empty($tx['date'])) {
                    $d = date('Y-m-d', strtotime($tx['date']));
                }
                return $d === $target;
            });
        }

        // Search Filter (Invoice number or Customer name)
        if (!empty($this->reprintSearchQuery)) {
            $query = strtolower(trim($this->reprintSearchQuery));
            $list = array_filter($list, function ($tx) use ($query) {
                $inv = strtolower($tx['invoiceNo'] ?? '');
                $cust = strtolower($tx['customer']['name'] ?? '');
                $date = strtolower($tx['date'] ?? '');
                return str_contains($inv, $query) || str_contains($cust, $query) || str_contains($date, $query);
            });
        }

        return array_values($list);
    }

    public function render(ProductService $productService, CustomerService $customerService, SettingsService $settingsService)
    {
        $allProducts = $productService->getAllProducts();
        $allCustomers = $customerService->getAllCustomers();

        return view('livewire.pos-terminal', [
            'products' => $allProducts,
            'customers' => $allCustomers,
            'settings' => $settingsService->getSettings(),
            'receiptSettings' => $this->receiptSettings,
            'isReceiptDesignerOpen' => $this->isReceiptDesignerOpen,
            'isReceiptPreviewModalOpen' => $this->isReceiptPreviewModalOpen,
            'previewTransaction' => $this->previewTransaction,
            'isReprintModalOpen' => $this->isReprintModalOpen,
            'recentTransactions' => $this->recentTransactions,
            'filteredTransactions' => $this->getFilteredTransactionsProperty(),
            'reprintDateFilter' => $this->reprintDateFilter,
            'printableTransaction' => $this->previewTransaction ?? $this->lastTransaction,
            'subtotal' => $this->getSubtotalProperty(),
            'discountAmount' => $this->getDiscountAmountProperty(),
            'totalAmount' => $this->getTotalAmountProperty(),
            'heldTickets' => $this->heldTickets ?? [],
            'isHeldTicketsModalOpen' => $this->isHeldTicketsModalOpen,
            'isCustomerModalOpen' => $this->isCustomerModalOpen,
            'isAddCustomerFormOpen' => $this->isAddCustomerFormOpen,
            'isPaymentModalOpen' => $this->isPaymentModalOpen,
            'isSaleSuccessModalOpen' => $this->isSaleSuccessModalOpen,
            'paymentMethod' => $this->paymentMethod,
            'lastTransaction' => $this->lastTransaction,
            'paymentError' => $this->paymentError,
            'cartItems' => $this->cartItems ?? [],
            'selectedCustomer' => $this->selectedCustomer,
            'cloudStatus' => $this->cloudStatus,
            'isWideMode' => $this->isWideMode,
            'currentStep' => $this->currentStep,
            'isAdminAuthenticated' => $this->isAdminAuthenticated,
            'isAdminPinModalOpen' => $this->isAdminPinModalOpen,
            'adminPinInput' => $this->adminPinInput,
            'adminPinError' => $this->adminPinError,
            'isSettingsModalOpen' => $this->isSettingsModalOpen,
        ])->layout('layouts.app');
    }
}
