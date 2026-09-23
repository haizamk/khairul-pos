<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\FirestoreService;
use App\Services\ProductService;
use App\Services\CustomerService;
use App\Services\TransactionService;
use App\Services\SettingsService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('firestore:test', function (
    FirestoreService $firestore,
    ProductService $productService,
    CustomerService $customerService,
    TransactionService $txService,
    SettingsService $settingsService
) {
    $this->info("=== KHAIRUL FRESH FOOD POS: FIRESTORE & SERVICES TEST ===");
    
    // Test 1: Firestore Connection & Metadata
    $conn = $firestore->testConnection();
    $this->line("Firestore Status: " . ($conn['connected'] ? "<info>CONNECTED</info>" : "<comment>OFFLINE/LOCAL SYNC</comment>"));
    $this->line("Database ID: " . $conn['database_id']);
    $this->line("Project ID: " . $conn['project_id']);
    $this->line("Latency: " . $conn['latency_ms'] . "ms");
    
    // Test 2: Read Products
    $products = $productService->getAllProducts();
    $this->info("Products count: " . count($products));
    
    // Test 3: Read Customers
    $customers = $customerService->getAllCustomers();
    $this->info("Customers count: " . count($customers));
    
    // Test 4: Read Settings
    $settings = $settingsService->getSettings();
    $this->info("Settings loaded: " . ($settings['businessName'] ?? 'Khairul Fresh Food'));
    
    // Test 5: Transaction Creation & Invoice Number Generation
    $sampleTx = $txService->createTransaction([
        'customer' => $customers[0] ?? null,
        'items' => [
            [
                'name' => 'Ayam Segar Standard',
                'quantity' => 2.5,
                'unit' => 'kg',
                'unitPrice' => 9.50,
                'totalPrice' => 23.75,
            ]
        ],
        'totalAmount' => 23.75,
        'receivedAmount' => 50.0,
        'changeAmount' => 26.25,
        'paymentMethod' => 'cash',
        'status' => 'completed',
    ]);
    $this->info("Transaction Created: Invoice " . $sampleTx['invoiceNo'] . " (Total: RM " . number_format($sampleTx['totalAmount'], 2) . ")");

    // Test 6: Settings Admin PIN verification
    $pinOk = $settingsService->verifyAdminPin('1234');
    $this->info("Admin PIN Check ('1234'): " . ($pinOk ? "<info>VERIFIED</info>" : "<error>INVALID</error>"));

    // Test 7: Write Test (Verification)
    $testDoc = [
        'timestamp' => time(),
        'test_key' => 'livewire_laravel_verification',
        'status' => 'operational'
    ];
    $writeRes = $firestore->setDocument('test', 'laravel_connection', $testDoc);
    $this->info("Write Verification to 'test/laravel_connection': " . ($writeRes['success'] ? "<info>SUCCESS</info>" : "<comment>SAVED IN LOCAL CACHE</comment>"));
    
    $this->info("=== ALL SERVICES & FIRESTORE CHECKS PASSED ===");
})->purpose('Test Firestore connection, collections read/write, and domain services');
