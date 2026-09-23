@props([
    'transaction' => null,
    'receiptSettings' => [],
    'isPrint' => false,
    'previewWidth' => null, // '58mm' or '80mm' override
    'previewFontSize' => null, // 'compact', 'standard', 'large' override
])

@php
    $tx = $transaction ?? [
        'invoiceNo' => 'INV-' . date('Ymd') . '-0001',
        'date' => date('Y-m-d H:i:s'),
        'customer' => ['name' => 'Runcit (Walk-In)'],
        'items' => [
            ['name' => 'Ayam Segar Standard', 'quantity' => 2.50, 'unit' => 'kg', 'unitPrice' => 9.60, 'totalPrice' => 24.00],
            ['name' => 'Daging Lembu Batang Pinang', 'quantity' => 1.20, 'unit' => 'kg', 'unitPrice' => 38.00, 'totalPrice' => 45.60],
            ['name' => 'Udang Harimau XL', 'quantity' => 1.00, 'unit' => 'kg', 'unitPrice' => 42.00, 'totalPrice' => 42.00],
        ],
        'subtotal' => 111.60,
        'discountAmount' => 0.00,
        'totalAmount' => 111.60,
        'paymentMethod' => 'cash',
        'amountReceived' => 120.00,
        'change' => 8.40,
    ];

    $cfg = array_merge([
        'companyName' => 'KHAIRUL FRESH AND FROZEN FOOD',
        'phone' => '012-3456789',
        'address' => "Pasar Borong Harian, Lot 12-14,\n50300 Kuala Lumpur",
        'website' => 'www.khairulfresh.com',
        'footer' => "Terima Kasih!\nSila Datang Lagi",
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
    ], (array)$receiptSettings);

    $effectiveWidth = $previewWidth ?? ($cfg['width'] ?? '58mm');
    $effectiveFontSize = $previewFontSize ?? ($cfg['fontSize'] ?? 'standard');

    // Font size classes
    $fontClass = match($effectiveFontSize) {
        'compact' => 'text-[10px] leading-tight',
        'large' => 'text-xs sm:text-sm leading-snug',
        default => 'text-[11px] sm:text-xs leading-normal',
    };

    // Width classes
    $widthClass = ($effectiveWidth === '80mm') ? 'w-[76mm] max-w-[320px]' : 'w-[54mm] max-w-[240px]';
    
    // Date & Time formatting
    $txDateRaw = $tx['date'] ?? date('Y-m-d H:i:s');
    $txTimestamp = is_numeric($txDateRaw) ? $txDateRaw / 1000 : strtotime($txDateRaw);
    $formattedDate = date('d/m/Y', $txTimestamp);
    $formattedTime = date('h:i A', $txTimestamp);

    // Items list
    $items = $tx['items'] ?? [];
    $subtotal = (float)($tx['subtotal'] ?? 0.0);
    $discount = (float)($tx['discountAmount'] ?? 0.0);
    $totalAmount = (float)($tx['totalAmount'] ?? $subtotal);
    $amountReceived = (float)($tx['amountReceived'] ?? $tx['receivedAmount'] ?? $totalAmount);
    $change = (float)($tx['change'] ?? $tx['changeAmount'] ?? 0.0);
    $paymentMethod = strtoupper($tx['paymentMethod'] ?? 'CASH');
    if ($paymentMethod === 'CASH') $paymentMethod = 'TUNAI (CASH)';
    elseif ($paymentMethod === 'QR') $paymentMethod = 'DUITNOW QR';
    elseif ($paymentMethod === 'CARD') $paymentMethod = 'KAD / NFC';
@endphp

<div class="thermal-receipt bg-white text-black font-mono mx-auto p-2 sm:p-3 {{ $widthClass }} {{ $fontClass }} select-none shadow-sm rounded-sm">
    <!-- Header: Company & Logo -->
    <div class="text-center pb-2 border-b border-dashed border-neutral-400">
        @if(!empty($cfg['showLogo']) && !empty($cfg['logo']))
            <div class="mb-1 flex justify-center">
                <img src="{{ $cfg['logo'] }}" alt="Logo" class="h-8 max-w-[80%] object-contain filter grayscale contrast-200">
            </div>
        @endif

        <h2 class="font-extrabold tracking-tight text-xs sm:text-sm uppercase leading-tight text-neutral-900">
            {{ $cfg['companyName'] ?: 'KHAIRUL FRESH AND FROZEN FOOD' }}
        </h2>

        @if(!empty($cfg['address']))
            <p class="text-[9px] sm:text-[10px] text-neutral-600 whitespace-pre-line mt-0.5 leading-tight">
                {{ $cfg['address'] }}
            </p>
        @endif

        <div class="text-[9px] sm:text-[10px] text-neutral-700 mt-0.5 flex flex-wrap justify-center gap-x-2">
            @if(!empty($cfg['phone']))
                <span>Tel: {{ $cfg['phone'] }}</span>
            @endif
            @if(!empty($cfg['website']))
                <span>{{ $cfg['website'] }}</span>
            @endif
        </div>
    </div>

    <!-- Metadata: Invoice, Date, Cashier, Customer -->
    <div class="py-1.5 border-b border-dashed border-neutral-400 text-[10px] sm:text-[11px] space-y-0.5">
        @if(!empty($cfg['showInvoice']))
            <div class="flex justify-between items-center font-bold">
                <span>INVOIS:</span>
                <span class="tracking-wider">{{ $tx['invoiceNo'] ?? '-' }}</span>
            </div>
        @endif

        @if(!empty($cfg['showDate']) || !empty($cfg['showTime']))
            <div class="flex justify-between items-center text-neutral-600">
                <span>TARIKH/MASA:</span>
                <span>
                    @if(!empty($cfg['showDate'])) {{ $formattedDate }} @endif
                    @if(!empty($cfg['showTime'])) {{ $formattedTime }} @endif
                </span>
            </div>
        @endif

        @if(!empty($cfg['showCashier']))
            <div class="flex justify-between items-center text-neutral-600">
                <span>JURUWANG:</span>
                <span class="font-semibold text-neutral-800">{{ $receiptSettings['cashierName'] ?? 'Juruwang 1' }}</span>
            </div>
        @endif

        @if(!empty($cfg['showCustomer']))
            <div class="flex justify-between items-center text-neutral-600">
                <span>PELANGGAN:</span>
                <span class="font-bold text-neutral-900 truncate max-w-[120px]">{{ $tx['customer']['name'] ?? 'Runcit' }}</span>
            </div>
        @endif
    </div>

    <!-- Items Section -->
    <div class="py-1.5 border-b border-dashed border-neutral-400">
        <div class="flex justify-between text-[9px] sm:text-[10px] font-bold text-neutral-500 uppercase pb-1 border-b border-neutral-200">
            <span>ITEM</span>
            <span>JUMLAH</span>
        </div>

        <div class="divide-y divide-neutral-100 py-1 space-y-1">
            @forelse($items as $item)
                <div class="pt-1">
                    <div class="font-bold text-neutral-900 truncate leading-snug">
                        {{ strtoupper($item['name'] ?? 'ITEM') }}
                    </div>
                    <div class="flex justify-between text-[9px] sm:text-[10px] text-neutral-600">
                        <span>
                            {{ number_format((float)($item['quantity'] ?? 1), 2) }} {{ strtoupper($item['unit'] ?? 'KG') }} x RM{{ number_format((float)($item['unitPrice'] ?? 0), 2) }}
                        </span>
                        <span class="font-bold text-neutral-900">
                            RM{{ number_format((float)($item['totalPrice'] ?? 0), 2) }}
                        </span>
                    </div>
                </div>
            @empty
                <div class="text-center py-2 text-neutral-400 italic">Tiada item</div>
            @endforelse
        </div>
    </div>

    <!-- Totals & Discounts -->
    <div class="py-1.5 border-b border-dashed border-neutral-400 text-[10px] sm:text-[11px] space-y-0.5">
        <div class="flex justify-between text-neutral-600">
            <span>SUBTOTAL:</span>
            <span>RM {{ number_format($subtotal, 2) }}</span>
        </div>

        @if($discount > 0)
            <div class="flex justify-between text-neutral-600">
                <span>DISKAUN:</span>
                <span>- RM {{ number_format($discount, 2) }}</span>
            </div>
        @endif

        <div class="flex justify-between items-baseline font-black text-xs sm:text-sm text-neutral-900 pt-1 border-t border-neutral-300">
            <span>JUMLAH BESAR:</span>
            <span class="text-sm sm:text-base">RM {{ number_format($totalAmount, 2) }}</span>
        </div>
    </div>

    <!-- Payment & Change -->
    @if(!empty($cfg['showPayment']))
        <div class="py-1.5 border-b border-dashed border-neutral-400 text-[10px] sm:text-[11px] space-y-0.5">
            <div class="flex justify-between text-neutral-700">
                <span>KAEDAH BAYARAN:</span>
                <span class="font-bold">{{ $paymentMethod }}</span>
            </div>
            <div class="flex justify-between text-neutral-700">
                <span>DITERIMA:</span>
                <span class="font-semibold">RM {{ number_format($amountReceived, 2) }}</span>
            </div>
            <div class="flex justify-between font-bold text-neutral-900 pt-0.5">
                <span>BAKI (CHANGE):</span>
                <span>RM {{ number_format($change, 2) }}</span>
            </div>
        </div>
    @endif

    <!-- QR Code Section -->
    @if(!empty($cfg['showQr']))
        @php
            $invoiceQrValue = !empty($tx['invoiceNo']) ? (string)$tx['invoiceNo'] : 'KHAIRUL-POS';
            $qrDataUri = \App\Services\QrCodeService::generateInvoiceQrDataUri($invoiceQrValue);
        @endphp
        <div class="py-2 flex flex-col items-center justify-center text-center">
            <div class="w-18 h-18 sm:w-20 sm:h-20 p-1 bg-white border border-neutral-300 flex items-center justify-center mb-1">
                <img src="{{ $qrDataUri }}" alt="QR {{ $invoiceQrValue }}" class="w-full h-full object-contain" />
            </div>
            <span class="text-[8px] sm:text-[9px] text-neutral-600 font-mono tracking-wider font-semibold">
                {{ $invoiceQrValue }}
            </span>
        </div>
    @endif

    <!-- Footer Thank You Note -->
    @if(!empty($cfg['footer']))
        <div class="pt-2 text-center text-[9px] sm:text-[10px] text-neutral-600 font-semibold whitespace-pre-line leading-snug">
            {{ $cfg['footer'] }}
        </div>
    @endif

    <div class="pt-2 text-center text-[8px] text-neutral-400">
        *** SALINAN RASMI ***
    </div>
</div>
