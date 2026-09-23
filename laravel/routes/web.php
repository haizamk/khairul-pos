<?php

use Illuminate\Support\Facades\Route;
use App\Livewire\PosTerminal;
use App\Http\Controllers\PosController;
use App\Http\Controllers\WhatsAppReceiptController;

Route::get('/', [PosController::class, 'index'])->name('pos.index');
Route::get('/pos', PosTerminal::class)->name('pos.terminal');
Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => 'Khairul Fresh Food POS (Laravel 13 + Livewire 4)']));

Route::post('/api/whatsapp/receipt', [WhatsAppReceiptController::class, 'sendReceipt'])->name('api.whatsapp.receipt');
