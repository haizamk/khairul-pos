<div 
    x-data="posApp()" 
    x-init="init()"
    class="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none"
>
    <!-- Top System Bar -->
    <header class="h-13 sm:h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-md z-10">
        <!-- Brand & Store Info -->
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-extrabold text-white text-xs shadow-md shadow-emerald-950/50 border border-emerald-400/40">
                KF
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xs sm:text-sm font-extrabold tracking-tight text-slate-100">
                        {{ $settings['businessName'] ?? 'Khairul Fresh Food POS' }}
                    </h1>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                        Laravel 13 • Livewire 4
                    </span>
                </div>
                <div class="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Pasar Borong Terminal</span>
                    <span>•</span>
                    <span class="font-mono text-slate-300" x-text="currentTime"></span>
                </div>
            </div>
        </div>

        <!-- Top Actions: Status, Customer, Held Tickets & Screen Toggle -->
        <div class="flex items-center gap-2">
            <!-- Firestore Sync Status Pill -->
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] sm:text-xs">
                @if($cloudStatus['connected'] ?? false)
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span class="text-emerald-300 font-semibold hidden md:inline">Firestore Connected</span>
                    <span class="text-emerald-300 font-semibold md:hidden">Cloud OK</span>
                @else
                    <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span class="text-amber-300 font-semibold">Local Sync</span>
                @endif
            </div>

            <!-- Customer Pill (Default: Runcit) -->
            <button 
                wire:click="toggleCustomerModal"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white transition cursor-pointer active:scale-95 shadow-sm"
                title="Pilih atau tukar pelanggan"
            >
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span class="text-slate-400 hidden sm:inline">Pelanggan:</span>
                <span class="font-bold text-slate-100 max-w-[100px] truncate">{{ $selectedCustomer['name'] ?? 'Runcit' }}</span>
                <svg class="w-3 h-3 text-slate-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>

            <!-- Held Tickets Button (SIMPAN count) -->
            @if(count($heldTickets) > 0)
                <button
                    wire:click="toggleHeldTicketsModal"
                    class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition cursor-pointer active:scale-95"
                    title="Senarai Tiket Disimpan"
                >
                    <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                    <span>HOLD ({{ count($heldTickets) }})</span>
                </button>
            @endif

            <!-- Reprint / Sejarah Resit Button (Phase 3) -->
            <button
                wire:click="openReprintModal"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition cursor-pointer active:scale-95 shadow-sm"
                title="Senarai transaksi & cetak semula resit"
            >
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                <span class="font-bold text-slate-200">Transaksi</span>
                <span class="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono hidden md:inline">Reprint</span>
            </button>

            <!-- Receipt Designer Button (Phase 3) -->
            <button
                wire:click="requestAdminAccess('designer')"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white transition cursor-pointer active:scale-95 shadow-sm"
                title="Tetapan dan rekaan resit thermal (Perlu Admin PIN)"
            >
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="hidden sm:inline font-semibold">Designer Resit</span>
            </button>

            <!-- Screen Mode Switch (Sunmi Portrait / Skrin Lebar) -->
            <button
                wire:click="toggleWideMode"
                class="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer active:scale-95 transition"
                title="Tukar antara mod Sunmi Handheld dan Skrin Lebar"
            >
                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span>{{ $isWideMode ? 'Mod Sunmi' : 'Skrin Lebar' }}</span>
            </button>
        </div>
    </header>

    <!-- Main Workspace Container -->
    <div class="flex-1 w-full {{ $isWideMode ? 'max-w-6xl' : 'max-w-[480px]' }} mx-auto flex flex-col md:flex-row overflow-hidden relative sm:p-2">
        <div class="w-full h-full flex flex-col md:flex-row rounded-none sm:rounded-2xl border-0 sm:border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl relative">

            <!-- ======================================================== -->
            <!-- 1. PRODUCT LIST VIEW (When in product_list step)         -->
            <!-- ======================================================== -->
            <div 
                x-show="!isTicketStep"
                class="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none"
            >
                <!-- Step Subheader: SEMUA PRODUK + Total Items badge -->
                <div class="px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-200">
                            SEMUA PRODUK
                        </span>
                        <span class="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full font-mono font-semibold">
                            <span x-text="filteredProducts.length"></span> item
                        </span>
                    </div>

                    <!-- Step Indicator -->
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>1. Pilih Produk</span>
                    </div>
                </div>

                <!-- Quick Search & Category Chips -->
                <div class="p-2.5 bg-slate-900/60 border-b border-slate-800 space-y-2 shrink-0">
                    <!-- Search Input -->
                    <div class="relative">
                        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari produk ayam, daging, ikan..."
                            x-model="searchQuery"
                            class="w-full bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2.5 border border-slate-700/80 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
                        />
                        <button
                            x-show="searchQuery.length > 0"
                            @click="searchQuery = ''"
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <!-- Category Pills -->
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                        <template x-for="cat in categories" :key="cat">
                            <button
                                @click="playBeep(450, 0.03); selectedCategory = cat"
                                :class="selectedCategory === cat 
                                    ? 'bg-emerald-600 text-white font-bold shadow-emerald-950/60 border border-emerald-400/40' 
                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/70'"
                                class="px-3 py-1 rounded-xl whitespace-nowrap font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                                x-text="cat"
                            ></button>
                        </template>
                    </div>
                </div>

                <!-- Product List (Approved Sleek Interface - No images, big touch rows) -->
                <div class="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 scrollbar-thin scrollbar-thumb-slate-700">
                    <template x-if="filteredProducts.length === 0">
                        <div class="h-48 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                            <p>Tiada produk dijumpai untuk &quot;<span x-text="searchQuery"></span>&quot;</p>
                            <button
                                @click="searchQuery = ''; selectedCategory = 'Semua'"
                                class="mt-2 text-emerald-400 font-semibold underline cursor-pointer"
                            >
                                Set Semula Carian
                            </button>
                        </div>
                    </template>

                    <template x-for="(product, idx) in filteredProducts" :key="product.id">
                        <button
                            @click="openPriceKeypad(product)"
                            class="w-full text-left px-3 py-3 hover:bg-slate-800/70 active:bg-slate-750 flex items-center justify-between transition-all group cursor-pointer rounded-xl my-1 border border-transparent hover:border-slate-700/60 active:scale-[0.99] bg-slate-850/40"
                        >
                            <div class="flex items-center gap-3 overflow-hidden">
                                <span 
                                    class="text-[11px] font-mono font-semibold text-slate-500 w-5 text-center shrink-0" 
                                    x-text="idx + 1"
                                ></span>
                                <div>
                                    <div class="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                                        <span x-text="product.name"></span>
                                        <template x-if="product.isPopular">
                                            <span class="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded">Laris</span>
                                        </template>
                                    </div>
                                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                                        RM <span x-text="Number(product.defaultPrice).toFixed(2)"></span> / <span class="uppercase font-bold" x-text="product.defaultUnit"></span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 shrink-0">
                                <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                                    Pilih
                                </span>
                                <svg class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </button>
                    </template>
                </div>

                <!-- Bottom Sticky Bar: TETAPAN & TICKET (N) RMxx.xx -->
                <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shadow-lg shrink-0">
                    <!-- Settings Button (Protected by Admin PIN) -->
                    <button
                        wire:click="requestAdminAccess('settings')"
                        class="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer min-w-[105px] shadow-sm active:scale-95"
                    >
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>TETAPAN</span>
                    </button>

                    <!-- Ticket Button (Emerald) -->
                    <button
                        @click="playBeep(650, 0.05); isTicketStep = true"
                        class="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer active:scale-[0.98]"
                    >
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                            </svg>
                            <span>TICKET ({{ count($cartItems) }})</span>
                        </div>
                        <span class="font-mono text-base font-black">
                            RM {{ number_format($totalAmount, 2) }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 2. TICKET VIEW (When in ticket_view step)                 -->
            <!-- ======================================================== -->
            <div 
                x-show="isTicketStep"
                class="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none"
            >
                <!-- Top Header: Back to Products + TICKET badge + Trash icon -->
                <div class="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2.5">
                        <button
                            @click="playBeep(500, 0.04); isTicketStep = false"
                            class="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60"
                            title="Kembali ke senarai produk"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                        </button>
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-sm uppercase tracking-wider text-slate-100">
                                TICKET
                            </span>
                            <span class="bg-emerald-600 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                {{ count($cartItems) }}
                            </span>
                        </div>
                    </div>

                    <button
                        wire:click="clearCart"
                        wire:confirm="Padam semua item dalam tiket ini?"
                        @disabled(empty($cartItems))
                        class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-all cursor-pointer border border-transparent hover:border-rose-500/30"
                        title="Padam Semua Tiket"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>

                <!-- Customer Info Strip (Default: Runcit) -->
                <div class="px-3.5 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                    <div class="flex items-center gap-2.5 text-slate-300">
                        <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-slate-400 font-bold text-[10px] uppercase">PELANGGAN:</span>
                                <span class="font-extrabold text-slate-100 text-xs sm:text-sm">{{ $selectedCustomer['name'] ?? 'Runcit' }}</span>
                                <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-semibold border border-slate-700">
                                    {{ $selectedCustomer['type'] ?? 'runcit' }}
                                </span>
                                @if(($selectedCustomer['discountPercent'] ?? 0) > 0)
                                    <span class="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        -{{ $selectedCustomer['discountPercent'] }}%
                                    </span>
                                @endif
                            </div>
                        </div>
                    </div>
                    <button
                        wire:click="toggleCustomerModal"
                        class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-[11px] transition cursor-pointer active:scale-95 shadow-sm"
                        title="Tukar pelanggan untuk tiket ini"
                    >
                        TUKAR
                    </button>
                </div>

                <!-- Cart Items List -->
                <div class="flex-1 overflow-y-auto p-3 divide-y divide-slate-800/60 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                    @if(empty($cartItems))
                        <div class="h-64 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                            <svg class="w-10 h-10 mb-2 opacity-30 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                            </svg>
                            <p class="font-bold text-slate-300 text-sm">Tiket Kosong</p>
                            <p class="text-xs text-slate-500 mt-1 max-w-[220px]">
                                Sila pilih produk dari senarai untuk menambah ke tiket.
                            </p>
                            <button
                                @click="playBeep(650, 0.05); isTicketStep = false"
                                class="mt-4 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/60 active:scale-95"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                <span>Pilih Produk Sekarang</span>
                            </button>
                        </div>
                    @else
                        @foreach($cartItems as $idx => $item)
                            <div 
                                wire:key="cart-item-{{ $item['id'] }}"
                                class="py-3 px-3.5 flex flex-col gap-2.5 bg-slate-850/70 hover:bg-slate-800 rounded-2xl border border-slate-700/60 transition-colors shadow-sm"
                            >
                                <!-- Line 1: Name and Item Total -->
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                                            <span class="text-xs font-mono text-slate-500 font-semibold">{{ $idx + 1 }}.</span>
                                            <span>{{ $item['name'] }}</span>
                                        </div>
                                        <div class="text-xs text-slate-400 font-mono mt-0.5 pl-4">
                                            {{ number_format($item['quantity'], 2) }} {{ strtoupper($item['unit']) }} × RM {{ number_format($item['unitPrice'], 2) }}
                                        </div>
                                    </div>

                                    <div class="text-right">
                                        <div class="text-sm font-black font-mono text-emerald-400">
                                            RM {{ number_format($item['totalPrice'], 2) }}
                                        </div>
                                        <button
                                            wire:click="removeItem('{{ $item['id'] }}')"
                                            class="text-[11px] text-rose-400 hover:text-rose-300 font-semibold hover:underline mt-0.5 cursor-pointer"
                                        >
                                            Padam
                                        </button>
                                    </div>
                                </div>

                                <!-- Line 2: Quick Qty adjustments (-0.5, -0.1, Qty, +0.1, +0.5) -->
                                <div class="flex items-center justify-between pt-2 border-t border-slate-750 text-xs">
                                    <span class="text-[11px] text-slate-400 font-medium">Ubah kuantiti:</span>
                                    <div class="flex items-center gap-1.5">
                                        <button
                                            wire:click="updateItemQuantity('{{ $item['id'] }}', {{ max(0.1, $item['quantity'] - 0.5) }})"
                                            class="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                                        >
                                            -0.5
                                        </button>
                                        <button
                                            wire:click="updateItemQuantity('{{ $item['id'] }}', {{ max(0.1, $item['quantity'] - 0.1) }})"
                                            class="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                                        >
                                            -0.1
                                        </button>
                                        <span class="px-2 font-mono font-bold text-slate-100 text-xs">
                                            {{ number_format($item['quantity'], 2) }} {{ $item['unit'] }}
                                        </span>
                                        <button
                                            wire:click="updateItemQuantity('{{ $item['id'] }}', {{ $item['quantity'] + 0.1 }})"
                                            class="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                                        >
                                            +0.1
                                        </button>
                                        <button
                                            wire:click="updateItemQuantity('{{ $item['id'] }}', {{ $item['quantity'] + 0.5 }})"
                                            class="w-7 h-7 rounded-lg bg-slate-750 hover:bg-slate-700 active:bg-slate-650 text-slate-200 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                                        >
                                            +0.5
                                        </button>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    @endif
                </div>

                <!-- Button to add more items -->
                <div class="px-3 py-2 bg-slate-900 border-t border-slate-800 shrink-0">
                    <button
                        @click="playBeep(600, 0.04); isTicketStep = false"
                        class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/80 cursor-pointer active:scale-98"
                    >
                        <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        <span>+ Tambah Produk Lain ke Tiket</span>
                    </button>
                </div>

                <!-- Summary Section: SUBTOTAL & TOTAL -->
                <div class="p-3.5 bg-slate-900/95 border-t border-slate-800 space-y-1.5 shrink-0">
                    <div class="flex items-center justify-between text-xs text-slate-400">
                        <span>Jumlah Kecil ({{ count($cartItems) }} item)</span>
                        <span class="font-mono font-medium">
                            RM {{ number_format($subtotal, 2) }}
                        </span>
                    </div>

                    @if($discountAmount > 0)
                        <div class="flex items-center justify-between text-xs text-amber-400">
                            <span>Diskaun ({{ $selectedCustomer['discountPercent'] }}%)</span>
                            <span class="font-mono font-medium">
                                -RM {{ number_format($discountAmount, 2) }}
                            </span>
                        </div>
                    @endif

                    <div class="flex items-baseline justify-between pt-1 border-t border-slate-800">
                        <span class="text-sm font-black uppercase text-slate-200 tracking-wider">
                            JUMLAH
                        </span>
                        <span class="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                            RM {{ number_format($totalAmount, 2) }}
                        </span>
                    </div>
                </div>

                <!-- Bottom Action Bar: [SIMPAN] & [BAYAR] -->
                <div class="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-3 gap-2.5 shadow-lg shrink-0">
                    <!-- Hold Ticket Button -->
                    <button
                        wire:click="holdCurrentTicket"
                        @disabled(empty($cartItems))
                        class="col-span-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        title="Simpan tiket dalam Firestore (Park Order)"
                    >
                        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                        </svg>
                        <span>SIMPAN</span>
                    </button>

                    <!-- Bayar Button (Phase 2: Opens Sleek Payment Modal) -->
                    <button
                        wire:click="openPaymentModal"
                        @click="playBeep(750, 0.06); initCashPayment({{ $totalAmount }})"
                        @disabled(empty($cartItems))
                        class="col-span-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-black text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/70 border border-emerald-400/40 active:scale-95"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        <span>BAYAR RM {{ number_format($totalAmount, 2) }}</span>
                    </button>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 3. PRICE KEYPAD MODAL (100% Alpine.js - Zero Network Lag) -->
            <!-- ======================================================== -->
            <div 
                x-show="priceModalOpen" 
                x-transition:enter="transition ease-out duration-150"
                x-transition:enter-start="opacity-0 translate-y-4"
                x-transition:enter-end="opacity-100 translate-y-0"
                x-transition:leave="transition ease-in duration-100"
                x-transition:leave-start="opacity-100 translate-y-0"
                x-transition:leave-end="opacity-0 translate-y-4"
                class="absolute inset-0 bg-slate-900 z-30 flex flex-col text-slate-100 select-none"
                style="display: none;"
            >
                <!-- Top Bar: Back Arrow + Product Name -->
                <div class="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <button
                        @click="playBeep(450, 0.04); priceModalOpen = false"
                        class="flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span class="font-bold text-sm text-slate-100" x-text="selectedProduct ? selectedProduct.name : ''"></span>
                    </button>

                    <span class="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2.5 py-0.5 rounded-full">
                        Langkah 2/3
                    </span>
                </div>

                <!-- Main Display Box -->
                <div class="p-4 flex flex-col gap-2 shrink-0">
                    <div class="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                        <span>MASUKKAN HARGA (RM)</span>
                        <button
                            @click="resetDefaultPrice()"
                            class="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline cursor-pointer"
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <span>Harga Asal (RM <span x-text="selectedProduct ? Number(selectedProduct.defaultPrice).toFixed(2) : '0.00'"></span>)</span>
                        </button>
                    </div>

                    <!-- Large White/Emerald LCD Display -->
                    <div class="w-full bg-slate-950 text-slate-100 rounded-2xl p-3 sm:p-4 text-right shadow-inner flex items-baseline justify-end border border-slate-700/80">
                        <span class="text-xl sm:text-2xl font-bold text-slate-500 mr-2">RM</span>
                        <span class="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400" x-text="priceStr || '0.00'"></span>
                    </div>

                    <!-- Quick Price Adjustment Chips -->
                    <div class="flex items-center gap-2 mt-1">
                        <button
                            @click="addPriceDelta(0.5)"
                            class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            +0.50
                        </button>
                        <button
                            @click="addPriceDelta(1.0)"
                            class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            +1.00
                        </button>
                        <button
                            @click="addPriceDelta(2.0)"
                            class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            +2.00
                        </button>
                        <button
                            @click="clearPriceInput()"
                            class="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-xs font-bold text-rose-400 border border-rose-500/30 transition-all cursor-pointer active:scale-95"
                        >
                            Padam
                        </button>
                    </div>
                </div>

                <!-- Ergonomic Keypad Grid -->
                <div class="flex-1 px-4 pb-3 flex flex-col justify-end">
                    <div class="grid grid-cols-3 gap-2.5 max-w-[380px] mx-auto w-full">
                        <template x-for="d in ['1','2','3','4','5','6','7','8','9']" :key="d">
                            <button
                                @click="handlePriceDigit(d)"
                                class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                                x-text="d"
                            ></button>
                        </template>

                        <!-- Dot -->
                        <button
                            @click="handlePriceDigit('.')"
                            class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            .
                        </button>

                        <!-- Zero -->
                        <button
                            @click="handlePriceDigit('0')"
                            class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            0
                        </button>

                        <!-- Backspace -->
                        <button
                            @click="handlePriceBackspace()"
                            class="h-12 sm:h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 shadow-sm border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7 11 0a2 2 0 012 2v10a2 2 0 01-2 2H10l-7-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Bottom Action Bar: BATAL & OK -->
                <div class="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3 shadow-lg shrink-0">
                    <button
                        @click="playBeep(450, 0.04); priceModalOpen = false"
                        class="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-extrabold text-sm tracking-wider uppercase border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                        BATAL
                    </button>

                    <button
                        @click="confirmPriceAndOpenQty()"
                        :disabled="!priceStr || parseFloat(priceStr) <= 0"
                        class="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95"
                    >
                        OK
                    </button>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 4. QUANTITY KEYPAD MODAL (100% Alpine.js - Zero Lag)     -->
            <!-- ======================================================== -->
            <div 
                x-show="qtyModalOpen" 
                x-transition:enter="transition ease-out duration-150"
                x-transition:enter-start="opacity-0 translate-y-4"
                x-transition:enter-end="opacity-100 translate-y-0"
                x-transition:leave="transition ease-in duration-100"
                x-transition:leave-start="opacity-100 translate-y-0"
                x-transition:leave-end="opacity-0 translate-y-4"
                class="absolute inset-0 bg-slate-900 z-30 flex flex-col text-slate-100 select-none"
                style="display: none;"
            >
                <!-- Top Bar: Back Arrow + Product Name -->
                <div class="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <button
                        @click="playBeep(450, 0.04); qtyModalOpen = false; priceModalOpen = true"
                        class="flex items-center gap-2 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span class="font-bold text-sm text-slate-100" x-text="selectedProduct ? selectedProduct.name : ''"></span>
                    </button>

                    <span class="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2.5 py-0.5 rounded-full">
                        Langkah 3/3
                    </span>
                </div>

                <!-- Input Display + Unit Selector + Live Calculation Preview -->
                <div class="p-4 flex flex-col gap-2 shrink-0">
                    <!-- Unit Selector Row -->
                    <div class="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider relative">
                        <div class="flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
                            </svg>
                            <span>MASUKKAN KUANTITI</span>
                        </div>

                        <!-- Unit Selector Dropdown (KG, EKOR, PKT, SET) -->
                        <div class="relative">
                            <button
                                @click="unitDropdownOpen = !unitDropdownOpen"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:bg-emerald-500/30 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                                <span class="uppercase" x-text="selectedUnit"></span>
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>

                            <div 
                                x-show="unitDropdownOpen"
                                @click.outside="unitDropdownOpen = false"
                                class="absolute right-0 top-full mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-40 py-1 divide-y divide-slate-750"
                            >
                                <template x-for="u in [
                                    { id: 'kg', label: 'Kilogram (KG)' },
                                    { id: 'ekor', label: 'Ekor' },
                                    { id: 'pkt', label: 'Paket (PKT)' },
                                    { id: 'set', label: 'Set' }
                                ]" :key="u.id">
                                    <button
                                        @click="setUnit(u.id)"
                                        :class="selectedUnit === u.id ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-750'"
                                        class="w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                    >
                                        <span x-text="u.label"></span>
                                        <span x-show="selectedUnit === u.id" class="text-emerald-400">✓</span>
                                    </button>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- Large Display Box -->
                    <div class="w-full bg-slate-950 text-slate-100 rounded-2xl p-3 sm:p-4 text-right shadow-inner flex items-baseline justify-between border border-slate-700/80">
                        <span class="text-sm font-extrabold text-slate-400 uppercase tracking-wider" x-text="selectedUnit"></span>
                        <span class="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400" x-text="qtyStr || '0.00'"></span>
                    </div>

                    <!-- Live Calculation Preview Banner: Harga × Kuantiti = Jumlah -->
                    <div class="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between text-xs shadow-sm">
                        <div class="text-slate-300 font-medium font-mono">
                            <span x-text="qtyStr || '0'"></span> <span class="uppercase" x-text="selectedUnit"></span> × RM <span x-text="Number(confirmedPrice).toFixed(2)"></span>
                        </div>
                        <div class="text-emerald-400 font-black font-mono text-sm">
                            = RM <span x-text="(parseFloat(qtyStr || 0) * confirmedPrice).toFixed(2)"></span>
                        </div>
                    </div>

                    <!-- Quick Weight / Quantity Chips -->
                    <div class="grid grid-cols-4 gap-2 mt-1">
                        <template x-if="selectedUnit === 'kg'">
                            <div class="contents">
                                <button
                                    @click="quickAddQty(0.25)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    +0.25
                                </button>
                                <button
                                    @click="quickAddQty(0.50)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    +0.50
                                </button>
                                <button
                                    @click="quickAddQty(1.00)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    +1.00
                                </button>
                                <button
                                    @click="quickSetQty(1.50)"
                                    class="py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    1.50kg
                                </button>
                            </div>
                        </template>

                        <template x-if="selectedUnit !== 'kg'">
                            <div class="contents">
                                <button
                                    @click="quickSetQty(1)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    1
                                </button>
                                <button
                                    @click="quickSetQty(2)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    2
                                </button>
                                <button
                                    @click="quickSetQty(5)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    5
                                </button>
                                <button
                                    @click="quickSetQty(10)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/70 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    10
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Ergonomic Keypad Grid -->
                <div class="flex-1 px-4 pb-3 flex flex-col justify-end">
                    <div class="grid grid-cols-3 gap-2.5 max-w-[380px] mx-auto w-full">
                        <template x-for="d in ['1','2','3','4','5','6','7','8','9']" :key="d">
                            <button
                                @click="handleQtyDigit(d)"
                                class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                                x-text="d"
                            ></button>
                        </template>

                        <!-- Dot -->
                        <button
                            @click="handleQtyDigit('.')"
                            class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            .
                        </button>

                        <!-- Zero -->
                        <button
                            @click="handleQtyDigit('0')"
                            class="h-12 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 text-2xl sm:text-3xl font-bold text-slate-100 shadow-sm border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            0
                        </button>

                        <!-- Backspace -->
                        <button
                            @click="handleQtyBackspace()"
                            class="h-12 sm:h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 shadow-sm border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7 11 0a2 2 0 012 2v10a2 2 0 01-2 2H10l-7-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Bottom Action Bar: BATAL & OK -->
                <div class="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3 shadow-lg shrink-0">
                    <button
                        @click="playBeep(450, 0.04); qtyModalOpen = false; priceModalOpen = true"
                        class="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-extrabold text-sm tracking-wider uppercase border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                        BATAL
                    </button>

                    <button
                        @click="commitItemToTicket()"
                        :disabled="!qtyStr || parseFloat(qtyStr) <= 0"
                        class="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95"
                    >
                        OK
                    </button>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 5. HELD TICKETS MODAL (Firestore Parked Orders)          -->
            <!-- ======================================================== -->
            @if($isHeldTicketsModalOpen)
                <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-3">
                    <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[85%]">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div class="flex items-center gap-2">
                                <span class="font-extrabold text-sm text-slate-100">TIKET DISIMPAN (HOLD)</span>
                                <span class="text-xs bg-amber-500/10 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                    {{ count($heldTickets) }}
                                </span>
                            </div>
                            <button 
                                wire:click="toggleHeldTicketsModal"
                                class="text-slate-400 hover:text-white text-sm p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto py-3 space-y-2">
                            @forelse($heldTickets as $ht)
                                <div class="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                                    <div>
                                        <div class="text-xs font-bold text-slate-200">
                                            Tiket #{{ $ht['ticketNumber'] ?? '1' }} - {{ $ht['customer']['name'] ?? 'Runcit' }}
                                        </div>
                                        <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                                            {{ count($ht['items'] ?? []) }} item • RM {{ number_format($ht['totalAmount'] ?? 0, 2) }}
                                        </div>
                                    </div>
                                    <button
                                        wire:click="restoreHeldTicket('{{ $ht['id'] }}')"
                                        class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                                    >
                                        Muat Semula
                                    </button>
                                </div>
                            @empty
                                <div class="text-center py-8 text-xs text-slate-500">
                                    Tiada tiket disimpan dalam Firestore.
                                </div>
                            @endforelse
                        </div>

                        <button 
                            wire:click="toggleHeldTicketsModal"
                            class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 6. ADMIN PIN VERIFICATION & SETTINGS MODALS              -->
            <!-- ======================================================== -->
            @if($isAdminPinModalOpen)
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3">
                    <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
                        <!-- Header -->
                        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="font-extrabold text-sm sm:text-base text-slate-100">PENGESAHAN ADMIN PIN</h3>
                                    <p class="text-[11px] text-slate-400">Tetapan dilindungi oleh Admin PIN</p>
                                </div>
                            </div>
                            <button 
                                wire:click="closeAdminPinModal"
                                class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition active:scale-95"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- PIN Dots Display -->
                        <div class="py-2 flex flex-col items-center justify-center gap-2">
                            <div class="flex items-center gap-3">
                                @for($i = 0; $i < 4; $i++)
                                    <div class="w-4 h-4 rounded-full border-2 transition-all {{ strlen($adminPinInput) > $i ? 'bg-emerald-500 border-emerald-400 scale-110' : 'bg-slate-800 border-slate-700' }}"></div>
                                @endfor
                            </div>
                            @if($adminPinError)
                                <div class="text-[11px] text-red-400 font-semibold text-center mt-1">
                                    {{ $adminPinError }}
                                </div>
                            @else
                                <div class="text-[11px] text-slate-500 text-center">
                                    Sila masukkan 4 digit Admin PIN
                                </div>
                            @endif
                        </div>

                        <!-- Touch Numeric Keypad (Optimized for Sunmi V3) -->
                        <div class="grid grid-cols-3 gap-2">
                            @foreach([1, 2, 3, 4, 5, 6, 7, 8, 9] as $num)
                                <button
                                    type="button"
                                    wire:click="appendAdminPin('{{ $num }}')"
                                    class="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-100 font-bold text-lg transition active:scale-95 cursor-pointer shadow-sm border border-slate-700/60"
                                >
                                    {{ $num }}
                                </button>
                            @endforeach
                            <button
                                type="button"
                                wire:click="clearAdminPin"
                                class="py-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 active:bg-slate-750 text-slate-400 font-bold text-xs uppercase transition active:scale-95 cursor-pointer border border-slate-800"
                            >
                                Padam
                            </button>
                            <button
                                type="button"
                                wire:click="appendAdminPin('0')"
                                class="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-100 font-bold text-lg transition active:scale-95 cursor-pointer shadow-sm border border-slate-700/60"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                wire:click="backspaceAdminPin"
                                class="py-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 active:bg-slate-750 text-slate-400 font-bold text-sm transition active:scale-95 cursor-pointer flex items-center justify-center border border-slate-800"
                                title="Padam satu"
                            >
                                ⌫
                            </button>
                        </div>

                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                wire:click="closeAdminPinModal"
                                class="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase cursor-pointer active:scale-95 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                wire:click="verifyAdminPin"
                                class="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 border border-emerald-400/40 cursor-pointer active:scale-95 transition"
                            >
                                Sah / Masuk
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            @if($isSettingsModalOpen)
                <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                    <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
                        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                </div>
                                <span class="font-extrabold text-sm text-slate-100">TETAPAN SISTEM POS</span>
                            </div>
                            <button 
                                wire:click="closeSettingsModal"
                                class="text-slate-400 hover:text-white text-sm p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div class="space-y-2 text-xs">
                            <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex justify-between items-center">
                                <span class="text-slate-400">Perniagaan:</span>
                                <span class="font-bold text-slate-200 text-right">{{ $settings['businessName'] ?? 'Khairul Fresh Food POS' }}</span>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex justify-between items-center">
                                <span class="text-slate-400">Pangkalan Data:</span>
                                <span class="font-mono text-emerald-400 font-bold">Cloud Firestore (Tersambung)</span>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex justify-between items-center">
                                <span class="text-slate-400">Status Akses:</span>
                                <span class="font-mono text-emerald-400 font-bold uppercase">Admin Disahkan</span>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex justify-between items-center">
                                <span class="text-slate-400">Pencetak Thermal:</span>
                                <span class="text-slate-200 font-bold">{{ $receiptSettings['width'] ?? '58mm' }} (Sunmi V3)</span>
                            </div>
                        </div>

                        <!-- Open Receipt Designer Shortcut -->
                        <button 
                            wire:click="openReceiptDesigner"
                            class="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs uppercase border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                        >
                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>Buka Designer Resit</span>
                        </button>

                        <button 
                            wire:click="closeSettingsModal"
                            class="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase cursor-pointer active:scale-95 transition"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 7. CUSTOMER SELECT & ADD MODAL (Firestore CustomerService) -->
            <!-- ======================================================== -->
            @if($isCustomerModalOpen)
                <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                    <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[90%]">
                        <!-- Modal Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="font-extrabold text-sm sm:text-base text-slate-100">PILIH PELANGGAN</h3>
                                    <p class="text-[11px] text-slate-400">Pilih pelanggan untuk tiket ini</p>
                                </div>
                            </div>
                            <button 
                                wire:click="toggleCustomerModal"
                                class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition active:scale-95"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- Quick Default "Runcit" Button -->
                        <div class="py-2.5 shrink-0">
                            <button
                                wire:click="resetCustomerToDefault"
                                class="w-full p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-between transition cursor-pointer active:scale-98 shadow-sm"
                            >
                                <div class="flex items-center gap-2.5">
                                    <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                                        R
                                    </div>
                                    <div class="text-left">
                                        <div class="text-xs sm:text-sm font-extrabold text-emerald-300">Runcit (Pelanggan Walk-In)</div>
                                        <div class="text-[10px] text-emerald-400/80">Kategori lalai kaunter tanpa syarat</div>
                                    </div>
                                </div>
                                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    LALAI
                                </span>
                            </button>
                        </div>

                        <!-- Customer List from Firestore -->
                        <div class="flex-1 overflow-y-auto space-y-2 py-1 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                            @foreach($customers as $cust)
                                @php
                                    $isSel = ($selectedCustomer['id'] ?? '') === $cust['id'];
                                    $typeBadge = match(strtolower($cust['type'] ?? 'runcit')) {
                                        'tetap' => ['label' => 'Pelanggan Tetap', 'bg' => 'bg-blue-500/10 text-blue-300 border-blue-500/30'],
                                        'restoran' => ['label' => 'Restoran', 'bg' => 'bg-amber-500/10 text-amber-300 border-amber-500/30'],
                                        'warung' => ['label' => 'Warung', 'bg' => 'bg-orange-500/10 text-orange-300 border-orange-500/30'],
                                        'pemborong' => ['label' => 'Pemborong', 'bg' => 'bg-purple-500/10 text-purple-300 border-purple-500/30'],
                                        default => ['label' => 'Runcit', 'bg' => 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30']
                                    };
                                @endphp
                                <button
                                    wire:click="selectCustomer('{{ $cust['id'] }}')"
                                    class="w-full p-3 rounded-2xl {{ $isSel ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/40' : 'bg-slate-850 hover:bg-slate-800 border-slate-750' }} border flex items-center justify-between transition cursor-pointer active:scale-98 text-left"
                                >
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                                            {{ strtoupper(substr($cust['name'] ?? 'P', 0, 1)) }}
                                        </div>
                                        <div>
                                            <div class="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                                                <span>{{ $cust['name'] }}</span>
                                                @if($isSel)
                                                    <span class="text-emerald-400 text-xs font-black">✓</span>
                                                @endif
                                            </div>
                                            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                <span class="px-1.5 py-0.2 rounded border text-[9px] font-semibold uppercase {{ $typeBadge['bg'] }}">
                                                    {{ $typeBadge['label'] }}
                                                </span>
                                                @if(!empty($cust['phone']))
                                                    <span class="font-mono text-[10px] text-slate-400">📞 {{ $cust['phone'] }}</span>
                                                @endif
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        @if(($cust['discountPercent'] ?? 0) > 0)
                                            <span class="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                                Diskaun {{ $cust['discountPercent'] }}%
                                            </span>
                                        @else
                                            <span class="text-slate-500 text-xs">Pilih ›</span>
                                        @endif
                                    </div>
                                </button>
                            @endforeach
                        </div>

                        <!-- Toggle Add Customer Form Section -->
                        <div class="pt-3 border-t border-slate-800 space-y-2 shrink-0">
                            @if(!$isAddCustomerFormOpen)
                                <button
                                    wire:click="toggleAddCustomerForm"
                                    class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
                                >
                                    <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    <span>+ Tambah Pelanggan Baru</span>
                                </button>
                            @else
                                <div class="p-3 bg-slate-850 rounded-2xl border border-slate-700 space-y-2.5">
                                    <div class="flex items-center justify-between text-xs font-bold text-slate-200">
                                        <span>DAFTAR PELANGGAN BARU</span>
                                        <button wire:click="toggleAddCustomerForm" class="text-slate-400 hover:text-white text-xs">Batal</button>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            wire:model.defer="newCustomerName"
                                            placeholder="Nama Pelanggan / Perniagaan *"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div class="grid grid-cols-2 gap-2">
                                        <input
                                            type="tel"
                                            wire:model.defer="newCustomerPhone"
                                            placeholder="No. Telefon (cth: 012-3456789)"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                                        />
                                        <select
                                            wire:model.defer="newCustomerType"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="runcit">Runcit</option>
                                            <option value="tetap">Pelanggan Tetap</option>
                                            <option value="restoran">Restoran</option>
                                            <option value="warung">Warung</option>
                                            <option value="pemborong">Pemborong</option>
                                        </select>
                                    </div>
                                    <button
                                        wire:click="saveNewCustomer"
                                        class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-md shadow-emerald-950/60"
                                    >
                                        Simpan & Pilih Pelanggan
                                    </button>
                                </div>
                            @endif

                            <button 
                                wire:click="toggleCustomerModal"
                                class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 8. PAYMENT MODAL (Cash, QR, Card - Sleek Interface)      -->
            <!-- ======================================================== -->
            @if($isPaymentModalOpen)
                <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                    <div class="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92%]">
                        <!-- Modal Top Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <span class="font-extrabold text-sm sm:text-base text-slate-100 tracking-wider uppercase">PEMBAYARAN</span>
                            </div>
                            <button 
                                wire:click="closePaymentModal"
                                class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition active:scale-95"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- Amount Display Banner -->
                        <div class="my-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center shrink-0">
                            <div class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">JUMLAH PERLU DIBAYAR</div>
                            <div class="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-0.5">
                                RM {{ number_format($totalAmount, 2) }}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                                <span>Pelanggan:</span>
                                <span class="text-slate-200 font-bold">{{ $selectedCustomer['name'] ?? 'Runcit' }}</span>
                                <span class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                    {{ $selectedCustomer['type'] ?? 'runcit' }}
                                </span>
                            </div>
                        </div>

                        <!-- Payment Method Tabs (CASH, QR, CARD / NFC) -->
                        <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 shrink-0 mb-3">
                            <button
                                @click="setPaymentTab('cash')"
                                :class="paymentTab === 'cash' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'"
                                class="py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                <span>TUNAI</span>
                            </button>

                            <button
                                @click="setPaymentTab('qr')"
                                :class="paymentTab === 'qr' ? 'bg-slate-800 text-amber-300 border border-amber-500/30 shadow-md' : 'text-slate-400 hover:text-slate-200'"
                                class="py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                                </svg>
                                <span>QR</span>
                            </button>

                            <button
                                @click="setPaymentTab('card')"
                                :class="paymentTab === 'card' ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-md' : 'text-slate-400 hover:text-slate-200'"
                                class="py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                </svg>
                                <span>KAD / NFC</span>
                            </button>
                        </div>

                        <!-- TAB 1: CASH PAYMENT (100% FUNCTIONAL) -->
                        <div x-show="paymentTab === 'cash'" class="flex-1 flex flex-col justify-between overflow-y-auto">
                            <!-- Quick Cash Buttons (RM5, RM10, RM20, RM50, RM100, Exact) -->
                            <div class="grid grid-cols-3 gap-1.5 mb-2.5">
                                <button
                                    @click="setQuickCash(5)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    RM 5
                                </button>
                                <button
                                    @click="setQuickCash(10)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    RM 10
                                </button>
                                <button
                                    @click="setQuickCash(20)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    RM 20
                                </button>
                                <button
                                    @click="setQuickCash(50)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    RM 50
                                </button>
                                <button
                                    @click="setQuickCash(100)"
                                    class="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    RM 100
                                </button>
                                <button
                                    @click="setQuickCash({{ $totalAmount }})"
                                    class="py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30 cursor-pointer active:scale-95 transition truncate px-1"
                                >
                                    TEPAT (RM {{ number_format($totalAmount, 2) }})
                                </button>
                            </div>

                            <!-- Cash Tendered & Change Display Box -->
                            <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 mb-2.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-slate-400">TUNAI DITERIMA:</span>
                                    <span class="text-xl font-black font-mono text-slate-100">
                                        RM <span x-text="cashTenderedStr ? Number(cashTenderedStr).toFixed(2) : '0.00'"></span>
                                    </span>
                                </div>

                                <!-- Change or Insufficient Warning -->
                                <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
                                    <template x-if="cashTenderedVal >= {{ $totalAmount }}">
                                        <div class="w-full flex items-center justify-between">
                                            <span class="text-xs font-black uppercase text-emerald-400">BAKI KEPADA PELANGGAN:</span>
                                            <span class="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                                                RM <span x-text="(cashTenderedVal - {{ $totalAmount }}).toFixed(2)"></span>
                                            </span>
                                        </div>
                                    </template>
                                    <template x-if="cashTenderedVal < {{ $totalAmount }}">
                                        <div class="w-full flex items-center justify-between text-rose-400">
                                            <span class="text-[11px] font-bold tracking-tight">TUNAI TIDAK MENCUKUPI:</span>
                                            <span class="text-xs font-bold font-mono">
                                                Kurang RM <span x-text="({{ $totalAmount }} - cashTenderedVal).toFixed(2)"></span>
                                            </span>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <!-- Touch Keypad for Cash Received (Alpine.js Client-Side) -->
                            <div class="grid grid-cols-3 gap-1.5 max-w-[320px] mx-auto w-full mb-3">
                                <template x-for="d in ['1','2','3','4','5','6','7','8','9']" :key="d">
                                    <button
                                        @click="handleCashDigit(d)"
                                        class="h-10 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xl font-bold text-slate-100 border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 transition"
                                        x-text="d"
                                    ></button>
                                </template>
                                <button
                                    @click="handleCashDigit('.')"
                                    class="h-10 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xl font-bold text-slate-100 border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 transition"
                                >
                                    .
                                </button>
                                <button
                                    @click="handleCashDigit('0')"
                                    class="h-10 sm:h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xl font-bold text-slate-100 border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 transition"
                                >
                                    0
                                </button>
                                <button
                                    @click="handleCashBackspace()"
                                    class="h-10 sm:h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center cursor-pointer active:scale-95 transition"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7 11 0a2 2 0 012 2v10a2 2 0 01-2 2H10l-7-7z"></path>
                                    </svg>
                                </button>
                            </div>

                            <!-- Error Message if Firestore Write Fails -->
                            @if($paymentError)
                                <div class="p-3 mb-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                                    <span>{{ $paymentError }}</span>
                                    <button
                                        @click="submitCashSale({{ $totalAmount }})"
                                        class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                    >
                                        CUBA LAGI
                                    </button>
                                </div>
                            @endif

                            <!-- Cash Checkout Confirm Button -->
                            <div class="grid grid-cols-3 gap-2 shrink-0">
                                <button
                                    @click="clearCashInput()"
                                    class="col-span-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-300 font-bold text-xs uppercase border border-slate-700 cursor-pointer active:scale-95"
                                >
                                    PADAM
                                </button>
                                <button
                                    @click="submitCashSale({{ $totalAmount }})"
                                    :disabled="cashTenderedVal < {{ $totalAmount }}"
                                    class="col-span-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/70 border border-emerald-400/40 active:scale-95"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>BAYAR / SAHKAN</span>
                                </button>
                            </div>
                        </div>

                        <!-- TAB 2: QR PAYMENT (UI / ARCHITECTURE SAHAJA) -->
                        <div x-show="paymentTab === 'qr'" class="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                            <div class="p-4 bg-white rounded-2xl shadow-xl max-w-[200px] mx-auto border-4 border-slate-800">
                                <!-- DuitNow QR placeholder art -->
                                <div class="w-36 h-36 border-2 border-dashed border-rose-500 rounded-xl flex flex-col items-center justify-center bg-rose-50/60 p-2">
                                    <div class="text-[10px] font-black text-rose-600 tracking-wider">DuitNow</div>
                                    <div class="text-xs font-bold text-rose-800 mt-1">QR PAY</div>
                                    <div class="text-[9px] text-slate-500 mt-2 font-mono">RM {{ number_format($totalAmount, 2) }}</div>
                                    <div class="text-[8px] text-slate-400 mt-1">Khairul Fresh POS</div>
                                </div>
                            </div>
                            <div class="space-y-1">
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                    <span>MENUNGGU PEMBAYARAN</span>
                                </div>
                                <p class="text-xs text-slate-400 max-w-[280px] mx-auto">
                                    Imbas kod QR menggunakan DuitNow atau e-Wallet pelanggan.
                                </p>
                                <p class="text-[10px] text-slate-500 italic max-w-[260px] mx-auto">
                                    * Seni bina sedia untuk integrasi Webhook DuitNow. Status kekal menunggu sehingga pengesahan rasmi gateway diterima.
                                </p>
                            </div>
                            <button
                                wire:click="closePaymentModal"
                                class="mt-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
                            >
                                Batal
                            </button>
                        </div>

                        <!-- TAB 3: CARD / NFC (UI / ARCHITECTURE SAHAJA) -->
                        <div x-show="paymentTab === 'card'" class="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                            <div class="w-24 h-24 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl">
                                <svg class="w-12 h-12 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                                </svg>
                            </div>
                            <div class="space-y-1">
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
                                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                    <span>MENUNGGU SENTUHAN KAD</span>
                                </div>
                                <h4 class="text-sm font-extrabold text-slate-100">Touch Kad / NFC pada Terminal</h4>
                                <p class="text-xs text-slate-400 max-w-[280px] mx-auto">
                                    Sentuh kad Debit, Kredit atau peranti pintar Apple Pay / Google Wallet di atas pengimbas Sunmi.
                                </p>
                                <p class="text-[10px] text-slate-500 italic max-w-[260px] mx-auto">
                                    * Seni bina sedia untuk sambungan HitPay / Stripe Terminal / Sunmi Pay SDK. Tiada transaksi palsu dijana.
                                </p>
                            </div>
                            <button
                                wire:click="closePaymentModal"
                                class="mt-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 9. SALE SUCCESS MODAL (Firestore Transaction Confirmed)  -->
            <!-- ======================================================== -->
            @if($isSaleSuccessModalOpen && $lastTransaction)
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div class="w-full max-w-md sm:max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 sm:gap-4 my-auto">
                        <!-- Success Check & Header -->
                        <div class="text-center">
                            <div class="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-md shadow-emerald-950 mb-2">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase mb-1">
                                ✓ Firestore Saved
                            </div>
                            <h3 class="text-lg sm:text-xl font-black text-slate-100 tracking-tight">JUALAN BERJAYA</h3>
                            <p class="text-xs text-slate-400 font-mono">{{ $lastTransaction['invoiceNo'] ?? '-' }}</p>
                        </div>

                        <!-- Change Box -->
                        <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <span class="text-[10px] uppercase font-bold text-slate-400 block">Baki Kepada Pelanggan</span>
                                <span class="text-xs text-slate-300">
                                    Tunai: RM {{ number_format($lastTransaction['amountReceived'] ?? 0, 2) }}
                                </span>
                            </div>
                            <div class="text-right">
                                <span class="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                                    RM {{ number_format($lastTransaction['change'] ?? 0, 2) }}
                                </span>
                            </div>
                        </div>

                        <!-- Thermal Receipt Live Preview Container -->
                        <div class="bg-slate-950 rounded-2xl border border-slate-800 p-2 sm:p-3">
                            <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                                <span class="text-slate-400 font-semibold flex items-center gap-1.5">
                                    <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Pratonton Resit Thermal
                                </span>
                                <div class="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700/60 text-[10px]">
                                    <button 
                                        wire:click="setDesignerWidth('58mm')" 
                                        class="px-2 py-0.5 rounded {{ ($receiptSettings['width'] ?? '58mm') === '58mm' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white' }}"
                                    >58mm</button>
                                    <button 
                                        wire:click="setDesignerWidth('80mm')" 
                                        class="px-2 py-0.5 rounded {{ ($receiptSettings['width'] ?? '58mm') === '80mm' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white' }}"
                                    >80mm</button>
                                </div>
                            </div>

                            <div class="max-h-56 sm:max-h-64 overflow-y-auto flex justify-center py-2 bg-neutral-900/60 rounded-xl border border-slate-800/80">
                                <x-receipt :transaction="$lastTransaction" :receipt-settings="$receiptSettings" />
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-2 sm:gap-3">
                            <button
                                type="button"
                                onclick="window.triggerThermalPrint({{ ($receiptSettings['printSoundEnabled'] ?? true) ? 'true' : 'false' }})"
                                class="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/70 border border-emerald-400/40 cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                                </svg>
                                CETAK RESIT
                            </button>

                            <button
                                wire:click="closeSuccessModal"
                                class="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-100 font-bold text-xs sm:text-sm uppercase tracking-wider border border-slate-700 cursor-pointer active:scale-95 transition"
                            >
                                JUALAN BARU
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 10. RECEIPT DESIGNER MODAL (Phase 3)                     -->
            <!-- ======================================================== -->
            @if($isReceiptDesignerOpen)
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div class="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 my-auto max-h-[95vh] overflow-hidden">
                        <!-- Designer Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h3 class="text-lg sm:text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                                    <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                                    </svg>
                                    DESIGNER RESIT THERMAL
                                </h3>
                                <p class="text-xs text-slate-400 mt-0.5">Konfigurasi format resit thermal, maklumat perniagaan & bunyi cetakan</p>
                            </div>
                            <button 
                                wire:click="closeReceiptDesigner"
                                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Content Grid: Left Form, Right Live Preview -->
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto pr-1">
                            <!-- Left: Form Controls (7 cols) -->
                            <div class="lg:col-span-7 space-y-4">
                                <!-- Company Details Card -->
                                <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Maklumat Kedai / Syarikat</h4>
                                    
                                    <div>
                                        <label class="text-[11px] text-slate-400 block mb-1">Nama Kedai (Header Resit)</label>
                                        <input 
                                            type="text" 
                                            wire:model.live="designerCompanyName"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                                            placeholder="KHAIRUL FRESH AND FROZEN FOOD"
                                        >
                                    </div>

                                    <div class="grid grid-cols-2 gap-2">
                                        <div>
                                            <label class="text-[11px] text-slate-400 block mb-1">No. Telefon / WhatsApp</label>
                                            <input 
                                                type="text" 
                                                wire:model.live="designerPhone"
                                                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                                                placeholder="012-3456789"
                                            >
                                        </div>
                                        <div>
                                            <label class="text-[11px] text-slate-400 block mb-1">Laman Web</label>
                                            <input 
                                                type="text" 
                                                wire:model.live="designerWebsite"
                                                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                                                placeholder="www.khairulfresh.com"
                                            >
                                        </div>
                                    </div>

                                    <div>
                                        <label class="text-[11px] text-slate-400 block mb-1">Alamat Kedai</label>
                                        <textarea 
                                            rows="2" 
                                            wire:model.live="designerAddress"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 leading-snug"
                                            placeholder="Pasar Borong Harian, Lot 12-14..."
                                        ></textarea>
                                    </div>

                                    <div>
                                        <label class="text-[11px] text-slate-400 block mb-1">Mesej Penghargaan (Footer Resit)</label>
                                        <textarea 
                                            rows="2" 
                                            wire:model.live="designerFooter"
                                            class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 leading-snug"
                                            placeholder="Terima Kasih! Sila Datang Lagi"
                                        ></textarea>
                                    </div>
                                </div>

                                <!-- Paper Size & Font Size -->
                                <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Kertas & Tipografi</h4>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-[11px] text-slate-400 block mb-1">Saiz Kertas Thermal</label>
                                            <div class="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                                                <button 
                                                    type="button"
                                                    wire:click="$set('designerWidth', '58mm')" 
                                                    class="py-1.5 text-xs rounded-lg font-bold transition {{ $designerWidth === '58mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white' }}"
                                                >
                                                    58mm
                                                </button>
                                                <button 
                                                    type="button"
                                                    wire:click="$set('designerWidth', '80mm')" 
                                                    class="py-1.5 text-xs rounded-lg font-bold transition {{ $designerWidth === '80mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white' }}"
                                                >
                                                    80mm
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label class="text-[11px] text-slate-400 block mb-1">Saiz Fon Resit</label>
                                            <div class="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                                                <button 
                                                    type="button"
                                                    wire:click="$set('designerFontSize', 'compact')" 
                                                    class="py-1.5 text-[10px] rounded-lg font-bold transition {{ $designerFontSize === 'compact' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white' }}"
                                                >
                                                    Kecil
                                                </button>
                                                <button 
                                                    type="button"
                                                    wire:click="$set('designerFontSize', 'standard')" 
                                                    class="py-1.5 text-[10px] rounded-lg font-bold transition {{ $designerFontSize === 'standard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white' }}"
                                                >
                                                    Biasa
                                                </button>
                                                <button 
                                                    type="button"
                                                    wire:click="$set('designerFontSize', 'large')" 
                                                    class="py-1.5 text-[10px] rounded-lg font-bold transition {{ $designerFontSize === 'large' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white' }}"
                                                >
                                                    Besar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Display Element Toggles -->
                                <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Elemen Paparan Resit</h4>
                                    
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowInvoice" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">No. Invois</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowDate" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Tarikh Jualan</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowTime" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Masa Jualan</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowCashier" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Nama Juruwang</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowCustomer" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Nama Pelanggan</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowPayment" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Kaedah & Baki</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerShowQr" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-slate-300">Kod Pengesahan QR</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Sound Settings Card -->
                                <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Bunyi Cetakan (Print Sound)</h4>
                                            <p class="text-[11px] text-slate-400">Mainkan nada bip printer semasa menghantar dokumen cetakan</p>
                                        </div>
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" wire:model.live="designerPrintSoundEnabled" class="rounded accent-emerald-500 w-4 h-4">
                                            <span class="text-xs font-bold {{ $designerPrintSoundEnabled ? 'text-emerald-400' : 'text-slate-400' }}">
                                                {{ $designerPrintSoundEnabled ? 'AKTIF' : 'MATI' }}
                                            </span>
                                        </label>
                                    </div>
                                    <div class="pt-1">
                                        <button 
                                            type="button"
                                            onclick="window.playThermalPrintSound(true)"
                                            class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                                            </svg>
                                            Uji Bunyi (Test Beep)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Live Preview Panel (5 cols) -->
                            <div class="lg:col-span-5 flex flex-col items-center">
                                <div class="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col items-center">
                                    <div class="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                                        <span class="font-bold text-slate-300 uppercase tracking-wider">Live Preview Resit</span>
                                        <span class="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                            {{ $designerWidth }} / {{ $designerFontSize }}
                                        </span>
                                    </div>

                                    <div class="w-full max-h-[500px] overflow-y-auto py-3 bg-neutral-900/60 rounded-xl border border-slate-800/80 flex justify-center shadow-inner">
                                        @php
                                            $liveDesignerSettings = [
                                                'companyName' => $designerCompanyName,
                                                'phone' => $designerPhone,
                                                'address' => $designerAddress,
                                                'website' => $designerWebsite,
                                                'footer' => $designerFooter,
                                                'logo' => $designerLogo,
                                                'width' => $designerWidth,
                                                'fontSize' => $designerFontSize,
                                                'showLogo' => $designerShowLogo,
                                                'showInvoice' => $designerShowInvoice,
                                                'showDate' => $designerShowDate,
                                                'showTime' => $designerShowTime,
                                                'showCashier' => $designerShowCashier,
                                                'showCustomer' => $designerShowCustomer,
                                                'showPayment' => $designerShowPayment,
                                                'showQr' => $designerShowQr,
                                                'cashierName' => 'Juruwang 1',
                                            ];
                                        @endphp
                                        <x-receipt 
                                            :receipt-settings="$liveDesignerSettings" 
                                            :preview-width="$designerWidth" 
                                            :preview-font-size="$designerFontSize" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer Actions -->
                        <div class="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                            <button
                                wire:click="closeReceiptDesigner"
                                class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                                Batal
                            </button>
                            <button
                                wire:click="saveReceiptDesignerSettings"
                                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 border border-emerald-400/40 cursor-pointer active:scale-95 transition flex items-center gap-1.5"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                SIMPAN KE FIRESTORE
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 11. TRANSACTION LIST & REPRINT MODAL (Phase 3)          -->
            <!-- ======================================================== -->
            @if($isReprintModalOpen)
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div class="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-auto max-h-[92vh]">
                        <!-- Transaction List Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h3 class="text-base sm:text-lg font-black text-slate-100 tracking-tight flex items-center gap-2">
                                    <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                    </svg>
                                    SENARAI TRANSAKSI (TRANSACTION LIST)
                                </h3>
                                <p class="text-xs text-slate-400 mt-0.5">Senarai jualan siap daripada Firestore • Pilih untuk lihat & cetak semula resit</p>
                            </div>
                            <button 
                                wire:click="closeReprintModal"
                                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer active:scale-95"
                                title="Tutup"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Search & Quick Date Filters -->
                        <div class="flex flex-col sm:flex-row gap-2">
                            <div class="relative flex-1">
                                <input 
                                    type="text" 
                                    wire:model.live="reprintSearchQuery"
                                    class="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
                                    placeholder="Cari No Invois (cth: INV-2026...) atau Nama Pelanggan..."
                                >
                                <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>

                            <div class="flex items-center gap-1.5 shrink-0">
                                <button 
                                    wire:click="setReprintDateFilter('all')"
                                    class="px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 {{ $reprintDateFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white' }}"
                                >
                                    Semua
                                </button>
                                <button 
                                    wire:click="setReprintDateFilter('today')"
                                    class="px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 {{ $reprintDateFilter === 'today' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white' }}"
                                >
                                    Hari Ini
                                </button>
                                <input 
                                    type="date"
                                    wire:model.live="reprintDateFilter"
                                    class="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                                    title="Pilih tarikh spesifik"
                                />
                            </div>
                        </div>

                        <!-- Transaction List (Touch-Friendly Cards for Sunmi V3) -->
                        <div class="overflow-y-auto max-h-[55vh] space-y-2.5 pr-1">
                            @forelse($filteredTransactions as $tx)
                                @php
                                    $displayDateTime = '-';
                                    if (!empty($tx['timestamp'])) {
                                        $displayDateTime = date('d/m/Y h:i A', $tx['timestamp'] / 1000);
                                    } elseif (!empty($tx['date'])) {
                                        $displayDateTime = date('d/m/Y h:i A', strtotime($tx['date']));
                                    }
                                @endphp
                                <div 
                                    wire:click="openReceiptPreview('{{ $tx['id'] ?? $tx['invoiceNo'] ?? '' }}')"
                                    class="p-3.5 sm:p-4 bg-slate-950 hover:bg-slate-850 active:bg-slate-800 rounded-2xl border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition cursor-pointer active:scale-[0.99] shadow-sm"
                                >
                                    <div class="min-w-0 flex-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono font-extrabold text-xs sm:text-sm text-slate-100 tracking-wide">
                                                {{ $tx['invoiceNo'] ?? 'No Inv' }}
                                            </span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {{ ($tx['paymentMethod'] ?? 'cash') === 'cash' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30' }}">
                                                {{ $tx['paymentMethod'] ?? 'CASH' }}
                                            </span>
                                        </div>
                                        <div class="text-[11px] sm:text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                                            <span class="font-medium text-slate-300">
                                                <span class="text-slate-500">Pelanggan:</span>
                                                {{ $tx['customer']['name'] ?? 'Runcit' }}
                                            </span>
                                            <span>•</span>
                                            <span class="font-mono text-slate-400">
                                                {{ $displayDateTime }}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="text-right shrink-0 flex items-center gap-3">
                                        <div>
                                            <div class="text-[10px] text-slate-500 uppercase font-semibold">Jumlah</div>
                                            <div class="font-mono font-extrabold text-sm sm:text-base text-emerald-400">
                                                RM {{ number_format((float)($tx['totalAmount'] ?? 0), 2) }}
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            wire:click.stop="openReceiptPreview('{{ $tx['id'] ?? $tx['invoiceNo'] ?? '' }}')"
                                            class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 hover:border-emerald-500 transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                                        >
                                            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                            </svg>
                                            <span>Lihat Resit</span>
                                        </button>
                                    </div>
                                </div>
                            @empty
                                <div class="text-center py-8 text-slate-500 text-xs">
                                    Tiada transaksi dijumpai mengikut carian ini.
                                </div>
                            @endforelse
                        </div>

                        <!-- Footer -->
                        <div class="pt-2 border-t border-slate-800 flex justify-between items-center">
                            <span class="text-xs text-slate-500 font-mono">
                                Jumlah Transaksi: {{ count($filteredTransactions) }} rekod
                            </span>
                            <button
                                wire:click="closeReprintModal"
                                class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer active:scale-95"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            @endif

            <!-- ======================================================== -->
            <!-- 12. DEDICATED RECEIPT PREVIEW / REPRINT MODAL (Phase 3)  -->
            <!-- ======================================================== -->
            @if($isReceiptPreviewModalOpen && $previewTransaction)
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-auto">
                        <!-- Preview Header -->
                        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div>
                                <h3 class="text-base font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                                    <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    DETAIL TRANSAKSI & RESIT
                                </h3>
                                <p class="text-xs text-slate-400 font-mono">{{ $previewTransaction['invoiceNo'] ?? '-' }}</p>
                            </div>
                            <div class="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                                <button 
                                    wire:click="setDesignerWidth('58mm')" 
                                    class="px-2 py-0.5 rounded {{ ($receiptSettings['width'] ?? '58mm') === '58mm' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white' }}"
                                >58mm</button>
                                <button 
                                    wire:click="setDesignerWidth('80mm')" 
                                    class="px-2 py-0.5 rounded {{ ($receiptSettings['width'] ?? '58mm') === '80mm' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white' }}"
                                >80mm</button>
                            </div>
                        </div>

                        <!-- Receipt Body Container (Uses Phase 3 Component & Dynamic QR) -->
                        <div class="max-h-80 overflow-y-auto flex justify-center py-2 bg-neutral-900/60 rounded-xl border border-slate-800/80 shadow-inner">
                            <x-receipt :transaction="$previewTransaction" :receipt-settings="$receiptSettings" />
                        </div>

                        <!-- Action Buttons: Flow -> REPRINT RECEIPT -> Print -->
                        <div class="flex flex-col gap-2 pt-1">
                            <button
                                type="button"
                                onclick="window.triggerThermalPrint({{ ($receiptSettings['printSoundEnabled'] ?? true) ? 'true' : 'false' }})"
                                class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/70 border border-emerald-400/40 cursor-pointer active:scale-95 transition flex items-center justify-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                                </svg>
                                REPRINT RECEIPT
                            </button>

                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    wire:click="backToTransactionList"
                                    class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                                >
                                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                    </svg>
                                    Senarai Transaksi
                                </button>

                                <button
                                    wire:click="closeReceiptPreviewModal"
                                    class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider border border-slate-700 cursor-pointer active:scale-95 transition"
                                >
                                    TUTUP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            @endif

            <!-- Dedicated Thermal Print Container (Rendered on paper via @media print) -->
            <div id="thermal-print-area" class="hidden">
                @if($printableTransaction)
                    <x-receipt :transaction="$printableTransaction" :receipt-settings="$receiptSettings" />
                @endif
            </div>

        </div>
    </div>
</div>

<!-- ======================================================== -->
<!-- ALPINE.JS POS CONTROLLER (Pure Client-Side Zero Latency)  -->
<!-- ======================================================== -->
<script>
    function posApp() {
        return {
            // UI state
            isTicketStep: @json($currentStep === 'ticket_view'),
            searchQuery: '',
            selectedCategory: 'Semua',
            priceModalOpen: false,
            qtyModalOpen: false,
            settingsModalOpen: false,
            unitDropdownOpen: false,
            currentTime: '',

            // Phase 2: Payment state & keypad
            paymentTab: 'cash',
            cashTenderedStr: '',
            isFirstCashInput: true,

            setPaymentTab(tab) {
                this.playBeep(600, 0.03);
                this.paymentTab = tab;
            },

            initCashPayment(totalAmount) {
                this.cashTenderedStr = '';
                this.isFirstCashInput = true;
                this.paymentTab = 'cash';
            },

            setQuickCash(amount) {
                this.playBeep(650, 0.03);
                this.cashTenderedStr = Number(amount).toFixed(2);
                this.isFirstCashInput = false;
            },

            handleCashDigit(digit) {
                this.playBeep(650, 0.03);
                if (this.isFirstCashInput) {
                    this.cashTenderedStr = (digit === '.') ? '0.' : digit;
                    this.isFirstCashInput = false;
                    return;
                }

                if (digit === '.') {
                    if (this.cashTenderedStr.includes('.')) return;
                    this.cashTenderedStr += '.';
                    return;
                }

                if (this.cashTenderedStr.includes('.')) {
                    const parts = this.cashTenderedStr.split('.');
                    if (parts[1] && parts[1].length >= 2) return;
                }

                if (this.cashTenderedStr.length >= 8) return;

                if (this.cashTenderedStr === '0' && digit !== '.') {
                    this.cashTenderedStr = digit;
                } else {
                    this.cashTenderedStr += digit;
                }
            },

            handleCashBackspace() {
                this.playBeep(450, 0.04);
                if (this.isFirstCashInput) {
                    this.cashTenderedStr = '';
                    this.isFirstCashInput = false;
                    return;
                }
                if (this.cashTenderedStr.length <= 1) {
                    this.cashTenderedStr = '';
                } else {
                    this.cashTenderedStr = this.cashTenderedStr.slice(0, -1);
                }
            },

            clearCashInput() {
                this.playBeep(450, 0.04);
                this.cashTenderedStr = '';
                this.isFirstCashInput = true;
            },

            get cashTenderedVal() {
                return parseFloat(this.cashTenderedStr) || 0;
            },

            submitCashSale(totalAmount) {
                const val = this.cashTenderedVal;
                if (val < totalAmount) {
                    this.playBeep(300, 0.1);
                    return;
                }
                this.playBeep(950, 0.08);
                this.$wire.completeSale('cash', val);
            },

            // Selected product & keypad values
            selectedProduct: null,
            priceStr: '0.00',
            confirmedPrice: 0.0,
            selectedUnit: 'kg',
            qtyStr: '1.00',
            isFirstPriceInput: true,
            isFirstQtyInput: true,

            // Products dataset passed from Laravel ProductService (Firestore)
            allProducts: @json($products),

            init() {
                this.updateClock();
                setInterval(() => this.updateClock(), 1000);

                this.$watch('isTicketStep', (val) => {
                    this.$wire.setStep(val ? 'ticket_view' : 'product_list');
                });

                if (window.Livewire) {
                    Livewire.on('step-changed', (event) => {
                        const step = (typeof event === 'object' && event.step) ? event.step : event;
                        this.isTicketStep = (step === 'ticket_view');
                    });

                    Livewire.on('sale-completed', () => {
                        this.isTicketStep = false;
                        this.cashTenderedStr = '';
                        this.isFirstCashInput = true;
                    });
                }
            },

            updateClock() {
                const now = new Date();
                this.currentTime = now.toLocaleTimeString('ms-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            },

            get categories() {
                const set = new Set(['Semua']);
                this.allProducts.forEach(p => {
                    if (p.category) set.add(p.category);
                });
                return Array.from(set);
            },

            get filteredProducts() {
                return this.allProducts.filter(p => {
                    const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase());
                    const matchCategory = this.selectedCategory === 'Semua' || p.category === this.selectedCategory;
                    return matchSearch && matchCategory;
                });
            },

            playBeep(freq = 650, duration = 0.04) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;
                    if (!window._posAudioCtx) window._posAudioCtx = new AudioCtx();
                    const ctx = window._posAudioCtx;
                    if (ctx.state === 'suspended') ctx.resume();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + duration);
                } catch(e) {}
            },

            // Step 1: Open Price Keypad for selected product
            openPriceKeypad(product) {
                this.playBeep(700, 0.05);
                this.selectedProduct = product;
                this.priceStr = Number(product.defaultPrice).toFixed(2);
                this.selectedUnit = product.defaultUnit || 'kg';
                this.isFirstPriceInput = true;
                this.priceModalOpen = true;
                this.qtyModalOpen = false;
            },

            // Price Keypad Handlers
            handlePriceDigit(digit) {
                this.playBeep(650, 0.03);
                if (this.isFirstPriceInput) {
                    this.priceStr = (digit === '.') ? '0.' : digit;
                    this.isFirstPriceInput = false;
                    return;
                }

                if (digit === '.') {
                    if (this.priceStr.includes('.')) return;
                    this.priceStr += '.';
                    return;
                }

                if (this.priceStr.includes('.')) {
                    const parts = this.priceStr.split('.');
                    if (parts[1] && parts[1].length >= 2) return;
                }

                if (this.priceStr.length >= 8) return;

                if (this.priceStr === '0' && digit !== '.') {
                    this.priceStr = digit;
                } else {
                    this.priceStr += digit;
                }
            },

            handlePriceBackspace() {
                this.playBeep(450, 0.04);
                if (this.isFirstPriceInput) {
                    this.priceStr = '';
                    this.isFirstPriceInput = false;
                    return;
                }
                if (this.priceStr.length <= 1) {
                    this.priceStr = '';
                } else {
                    this.priceStr = this.priceStr.slice(0, -1);
                }
            },

            resetDefaultPrice() {
                this.playBeep(500, 0.04);
                if (this.selectedProduct) {
                    this.priceStr = Number(this.selectedProduct.defaultPrice).toFixed(2);
                    this.isFirstPriceInput = true;
                }
            },

            addPriceDelta(delta) {
                this.playBeep(600, 0.04);
                const curr = parseFloat(this.priceStr) || 0;
                const next = Math.max(0, curr + delta);
                this.priceStr = next.toFixed(2);
                this.isFirstPriceInput = false;
            },

            clearPriceInput() {
                this.playBeep(450, 0.04);
                this.priceStr = '';
                this.isFirstPriceInput = false;
            },

            // Step 2: Confirm Price & Open Quantity Keypad
            confirmPriceAndOpenQty() {
                const finalPrice = parseFloat(this.priceStr);
                if (isNaN(finalPrice) || finalPrice <= 0) {
                    this.playBeep(300, 0.1);
                    return;
                }
                this.playBeep(800, 0.05);
                this.confirmedPrice = finalPrice;
                this.priceModalOpen = false;

                // Configure quantity defaults based on unit
                this.qtyStr = (this.selectedUnit === 'kg') ? '1.00' : '1';
                this.isFirstQtyInput = true;
                this.qtyModalOpen = true;
            },

            // Quantity Keypad Handlers
            setUnit(unit) {
                this.playBeep(550, 0.03);
                this.selectedUnit = unit;
                this.unitDropdownOpen = false;
                if (unit === 'kg') {
                    if (!this.qtyStr.includes('.')) this.qtyStr = Number(this.qtyStr || 1).toFixed(2);
                } else {
                    this.qtyStr = Math.max(1, Math.round(parseFloat(this.qtyStr) || 1)).toString();
                }
            },

            handleQtyDigit(digit) {
                this.playBeep(680, 0.03);
                if (this.isFirstQtyInput) {
                    this.qtyStr = (digit === '.') ? '0.' : digit;
                    this.isFirstQtyInput = false;
                    return;
                }

                if (digit === '.') {
                    if (this.qtyStr.includes('.')) return;
                    this.qtyStr += '.';
                    return;
                }

                if (this.qtyStr.includes('.')) {
                    const parts = this.qtyStr.split('.');
                    if (parts[1] && parts[1].length >= 3) return;
                }

                if (this.qtyStr.length >= 7) return;

                if (this.qtyStr === '0' && digit !== '.') {
                    this.qtyStr = digit;
                } else {
                    this.qtyStr += digit;
                }
            },

            handleQtyBackspace() {
                this.playBeep(450, 0.04);
                if (this.isFirstQtyInput) {
                    this.qtyStr = '';
                    this.isFirstQtyInput = false;
                    return;
                }
                if (this.qtyStr.length <= 1) {
                    this.qtyStr = '';
                } else {
                    this.qtyStr = this.qtyStr.slice(0, -1);
                }
            },

            quickAddQty(delta) {
                this.playBeep(600, 0.04);
                const curr = parseFloat(this.qtyStr) || 0;
                const next = Math.max(0.1, curr + delta);
                this.qtyStr = next.toFixed(2);
                this.isFirstQtyInput = false;
            },

            quickSetQty(val) {
                this.playBeep(600, 0.04);
                if (this.selectedUnit === 'kg') {
                    this.qtyStr = val.toFixed(2);
                } else {
                    this.qtyStr = Math.round(val).toString();
                }
                this.isFirstQtyInput = false;
            },

            // Step 3: Commit Item to Ticket via Livewire
            commitItemToTicket() {
                const finalQty = parseFloat(this.qtyStr);
                if (isNaN(finalQty) || finalQty <= 0) {
                    this.playBeep(300, 0.1);
                    return;
                }

                this.playBeep(900, 0.07);
                this.qtyModalOpen = false;

                // Sync to Livewire component
                this.$wire.addItemToTicket(
                    this.selectedProduct.id,
                    this.selectedProduct.name,
                    this.confirmedPrice,
                    finalQty,
                    this.selectedUnit
                ).then(() => {
                    this.isTicketStep = true;
                });
            }
        };
    }
</script>
