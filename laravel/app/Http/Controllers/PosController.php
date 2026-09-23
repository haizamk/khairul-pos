<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ProductService;
use App\Services\CustomerService;
use App\Services\SettingsService;
use App\Services\FirestoreService;

class PosController extends Controller
{
    public function index(
        ProductService $productService,
        CustomerService $customerService,
        SettingsService $settingsService,
        FirestoreService $firestore
    ) {
        $products = $productService->getAllProducts();
        $customers = $customerService->getAllCustomers();
        $settings = $settingsService->getSettings();
        $cloudStatus = $firestore->testConnection();

        return view('pos.index', compact('products', 'customers', 'settings', 'cloudStatus'));
    }
}
