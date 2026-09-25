import React, { useState, useEffect } from 'react';
import { 
  Product, 
  CartItem, 
  Customer, 
  Transaction, 
  HeldTicket, 
  AppSettings, 
  ReceiptConfig, 
  UnitType, 
  PaymentMethod 
} from './types';
import { DEFAULT_CUSTOMERS } from './utils/storage';
import { useApiSync } from './context/ApiSyncContext';
import { sound } from './utils/audio';
import { SunmiFrame } from './components/SunmiFrame';
import { PosHeader } from './components/PosHeader';
import { ProductListView } from './components/ProductListView';
import { PriceKeypadModal } from './components/PriceKeypadModal';
import { QuantityKeypadModal } from './components/QuantityKeypadModal';
import { TicketViewModal } from './components/TicketViewModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ReceiptDesigner } from './components/ReceiptDesigner';
import { TransactionsView } from './components/TransactionsView';
import { ReportsView } from './components/ReportsView';
import { CustomerSelectModal } from './components/CustomerSelectModal';
import { HeldTicketsModal } from './components/HeldTicketsModal';
import { SettingsModal } from './components/SettingsModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { LoginModal } from './components/LoginModal';
import { Lock, AlertTriangle } from 'lucide-react';

type PosStep = 
  | 'product_list' 
  | 'enter_price' 
  | 'enter_quantity' 
  | 'ticket_view' 
  | 'payment' 
  | 'receipt_view'
  | 'receipt_designer'
  | 'transactions'
  | 'reports'
  | 'settings';

export default function App() {
  // Global API Sync State
  const {
    user,
    currentUserProfile,
    isMasterAdmin,
    isAdmin,
    isAuthReady,
    products,
    customers,
    transactions,
    heldTickets,
    settings,
    saveProduct,
    deleteProduct,
    saveCustomer,
    deleteCustomer,
    saveTransaction,
    voidTransaction,
    saveHeldTickets,
    saveSettings,
    reorderProducts,
    reorderCategories,
    getNextInvoiceNo,
    resetAllData
  } = useApiSync();

  // POS Workflow State
  const [currentStep, setCurrentStep] = useState<PosStep>('product_list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [enteredPrice, setEnteredPrice] = useState<number>(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(() => {
    return customers[0] || DEFAULT_CUSTOMERS[0];
  });

  // Keep selectedCustomer synchronized when cloud customers list updates
  useEffect(() => {
    if (customers.length > 0) {
      const match = customers.find((c) => c.id === selectedCustomer?.id);
      if (match) {
        setSelectedCustomer(match);
      } else if (!selectedCustomer || !customers.some((c) => c.id === selectedCustomer.id)) {
        setSelectedCustomer(customers[0]);
      }
    }
  }, [customers]);

  // Active Completed Transaction for Receipt
  const [activeReceiptTx, setActiveReceiptTx] = useState<Transaction | null>(null);

  // Delivery Fee States (Default: one-off per sale)
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isOneOffDelivery, setIsOneOffDelivery] = useState<boolean>(true);
  const [showDeliveryFeeOnReceipt, setShowDeliveryFeeOnReceipt] = useState<boolean>(true);

  const handleUpdateDeliveryFee = (
    fee: number, 
    notes: string, 
    isOneOff: boolean, 
    showOnReceipt: boolean = true
  ) => {
    setDeliveryFee(fee);
    setDeliveryNotes(notes);
    setIsOneOffDelivery(isOneOff);
    setShowDeliveryFeeOnReceipt(showOnReceipt);
  };

  // Overlay Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [isHeldTicketsModalOpen, setIsHeldTicketsModalOpen] = useState<boolean>(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Admin PIN Protection states
  const [pendingAdminStep, setPendingAdminStep] = useState<PosStep | null>(null);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<boolean>(false);

  const handleOpenProtectedStep = (targetStep: PosStep) => {
    sound.playKeyBeep(600, 0.05);
    // Master Admin or Admin: Open DIRECTLY without second password prompt!
    if (isMasterAdmin || isAdmin || currentUserProfile?.role === 'master_admin' || currentUserProfile?.role === 'admin') {
      setCurrentStep(targetStep);
      return;
    }
    // Cashier or unauthenticated cashier: Prompt for Admin PIN override
    setPendingAdminStep(targetStep);
    setAdminPinInput('');
    setAdminPinError(false);
  };

  // Sync sound setting
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
    sound.setPrintSoundEnabled(settings.printSoundEnabled ?? true);
  }, [settings.soundEnabled, settings.printSoundEnabled]);

  // 1. Loading/Auth state check
  if (!isAuthReady) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-slate-800 border-t-emerald-500 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Memuatkan Terminal POS...
        </p>
      </div>
    );
  }

  // 2. Login Gate: If no user is logged in, show ONLY the Login Screen (as a page)
  if (!user) {
    return (
      <LoginModal
        isOpen={true}
        allowClose={false}
      />
    );
  }

  // Handler: Selecting a product from list -> Step 2 (Price)
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setEnteredPrice(product.defaultPrice);
    setCurrentStep('enter_price');
  };

  // Handler: Price confirmed -> Step 3 (Quantity)
  const handleConfirmPrice = (price: number) => {
    setEnteredPrice(price);
    setCurrentStep('enter_quantity');
  };

  // Handler: Quantity confirmed -> Add to Cart -> Step 4 (Ticket View)
  const handleConfirmQuantity = (quantity: number, unit: UnitType) => {
    if (!selectedProduct) return;

    const newItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      unitPrice: enteredPrice,
      quantity,
      unit,
      totalPrice: Math.round(quantity * enteredPrice * 100) / 100,
    };

    setCartItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setCurrentStep('ticket_view');
  };

  // Handler: Update cart item quantity
  const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
    setCartItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              quantity: newQty,
              totalPrice: Math.round(newQty * it.unitPrice * 100) / 100,
            }
          : it
      )
    );
  };

  // Handler: Remove item from cart
  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Handler: Clear entire cart
  const handleClearCart = () => {
    setCartItems([]);
    setDeliveryFee(0);
    setDeliveryNotes('');
    setIsOneOffDelivery(true);
    setCurrentStep('product_list');
  };

  // Handler: Hold / Park current ticket -> Database
  const handleHoldTicket = () => {
    if (cartItems.length === 0) return;

    const newHeldTicket: HeldTicket = {
      id: `held_${Date.now()}`,
      ticketNumber: heldTickets.length + 1,
      name: `Tiket #${heldTickets.length + 1} (${selectedCustomer.name})`,
      createdAt: new Date().toISOString(),
      customer: selectedCustomer,
      items: [...cartItems],
      subtotal: cartItems.reduce((sum, it) => sum + it.totalPrice, 0),
      deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
      isDelivery: deliveryFee > 0,
      deliveryNotes: deliveryNotes.trim() ? deliveryNotes.trim() : undefined,
      showDeliveryFeeOnReceipt: deliveryFee > 0 ? showDeliveryFeeOnReceipt : undefined,
    };

    const updated = [...heldTickets, newHeldTicket];
    saveHeldTickets(updated);
    setCartItems([]);
    setDeliveryFee(0);
    setDeliveryNotes('');
    setIsOneOffDelivery(true);
    setShowDeliveryFeeOnReceipt(settings.receiptConfig?.showDeliveryFee ?? true);
    sound.playOkBeep();
    setCurrentStep('product_list');
  };

  // Handler: Restore a held ticket
  const handleRestoreTicket = (ticket: HeldTicket) => {
    setCartItems(ticket.items);
    setSelectedCustomer(ticket.customer);
    setDeliveryFee(ticket.deliveryFee || 0);
    setDeliveryNotes(ticket.deliveryNotes || '');
    setIsOneOffDelivery(ticket.isDelivery ?? true);
    setShowDeliveryFeeOnReceipt(ticket.showDeliveryFeeOnReceipt ?? (settings.receiptConfig?.showDeliveryFee ?? true));
    const updated = heldTickets.filter((t) => t.id !== ticket.id);
    saveHeldTickets(updated);
    setCurrentStep('ticket_view');
  };

  // Handler: Delete a held ticket
  const handleDeleteHeldTicket = (ticketId: string) => {
    const updated = heldTickets.filter((t) => t.id !== ticketId);
    saveHeldTickets(updated);
  };

  // Handler: Complete Payment -> Save Transaction to Database & Open Receipt
  const handleCompletePayment = (
    method: PaymentMethod,
    amountPaid: number,
    changeAmount: number
  ) => {
    const subtotal = Math.round(cartItems.reduce((acc, it) => acc + it.totalPrice, 0) * 100) / 100;
    const discount = selectedCustomer.discountPercent
      ? Math.round(((subtotal * selectedCustomer.discountPercent) / 100) * 100) / 100
      : 0;
    const currentFee = Math.round((deliveryFee || 0) * 100) / 100;
    const totalAmount = Math.round(Math.max(0, subtotal - discount + currentFee) * 100) / 100;

    const invoiceNo = getNextInvoiceNo();
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      invoiceNo,
      timestamp: new Date().toISOString(),
      customer: selectedCustomer,
      items: [...cartItems],
      subtotal,
      discount,
      deliveryFee: currentFee > 0 ? currentFee : undefined,
      isDelivery: currentFee > 0,
      deliveryNotes: deliveryNotes.trim() ? deliveryNotes.trim() : undefined,
      showDeliveryFeeOnReceipt: currentFee > 0 ? showDeliveryFeeOnReceipt : undefined,
      totalAmount,
      paymentMethod: method,
      amountPaid,
      changeAmount,
      cashierId: currentUserProfile?.uid,
      cashierName: currentUserProfile?.name || settings.cashierName || 'Khairul',
      cashierRole: currentUserProfile?.role || 'master_admin',
      status: 'completed',
    };

    saveTransaction(newTx);
    setActiveReceiptTx(newTx);
    setCartItems([]);
    setDeliveryFee(0);
    setDeliveryNotes('');
    setIsOneOffDelivery(true);
    setShowDeliveryFeeOnReceipt(settings.receiptConfig?.showDeliveryFee ?? true);
    setCurrentStep('receipt_view');
  };

  // Handler: Void Transaction -> Database update
  const handleVoidTransaction = (transactionId: string, reason: string) => {
    voidTransaction(transactionId, reason);
  };

  // Handler: Save Receipt Designer Config
  const handleSaveReceiptConfig = async (newConfig: ReceiptConfig): Promise<{ success: boolean; error?: string }> => {
    const updated: AppSettings = {
      ...settings,
      storeName: newConfig.companyName || settings.storeName,
      receiptConfig: newConfig,
    };
    return await saveSettings(updated);
  };

  // Handler: Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
  };

  // Handler: Save Products
  const handleSaveProducts = (newProducts: Product[]) => {
    for (const prod of newProducts) {
      saveProduct(prod);
    }
  };

  // Handler: Save Single Product
  const handleSaveProduct = (product: Product) => {
    saveProduct(product);
  };

  // Handler: Delete Product
  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId);
  };

  // Handler: Reorder Products
  const handleReorderProducts = (orderedProducts: Product[]) => {
    reorderProducts(orderedProducts);
  };

  // Handler: Reorder Categories
  const handleReorderCategories = (orderedCategories: string[]) => {
    reorderCategories(orderedCategories);
  };

  // Handler: Save Customers
  const handleSaveCustomers = (newCustomers: Customer[]) => {
    for (const cust of newCustomers) {
      saveCustomer(cust);
    }
  };

  // Handler: Save Single Customer
  const handleSaveCustomer = (customer: Customer) => {
    saveCustomer(customer);
  };

  // Handler: New Customer added from quick modal
  const handleAddNewCustomer = (newCustomer: Customer) => {
    saveCustomer(newCustomer);
    setSelectedCustomer(newCustomer);
  };

  // Handler: Update existing customer
  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    saveCustomer(updatedCustomer);
    if (selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer);
    }
  };

  // Handler: Delete customer
  const handleDeleteCustomer = (customerId: string) => {
    deleteCustomer(customerId);
    if (selectedCustomer.id === customerId) {
      const remaining = customers.filter((c) => c.id !== customerId);
      setSelectedCustomer(remaining[0] || DEFAULT_CUSTOMERS[0]);
    }
  };

  // Handler: Toggle Sunmi Frame vs Fullscreen
  const handleToggleFrameMode = () => {
    const updated = { ...settings, deviceFrameMode: !settings.deviceFrameMode };
    saveSettings(updated);
  };

  // Handler: Reset All Data
  const handleResetAllData = () => {
    resetAllData();
    setCartItems([]);
    setCurrentStep('product_list');
  };

  return (
    <SunmiFrame
      isFrameMode={settings.deviceFrameMode}
      onToggleFrameMode={handleToggleFrameMode}
    >
      {/* Top Header (visible on main sales views) */}
      {(currentStep === 'product_list' ||
        currentStep === 'enter_price' ||
        currentStep === 'enter_quantity' ||
        currentStep === 'ticket_view') && (
        <PosHeader
          receiptConfig={settings.receiptConfig}
          selectedCustomer={selectedCustomer}
          onOpenCustomerSelect={() => setIsCustomerModalOpen(true)}
          heldTickets={heldTickets}
          onOpenHeldTickets={() => setIsHeldTicketsModalOpen(true)}
          onOpenTransactions={() => setCurrentStep('transactions')}
          onOpenReports={() => setCurrentStep('reports')}
          onOpenReceiptDesigner={() => handleOpenProtectedStep('receipt_designer')}
          onOpenSettings={() => handleOpenProtectedStep('settings')}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* Step 1: SENARAI PRODUK */}
      {currentStep === 'product_list' && (
        <ProductListView
          products={products}
          categoryOrder={settings.categoryOrder}
          cartItems={cartItems}
          currencySymbol={settings.currency || 'RM'}
          onSelectProduct={handleSelectProduct}
          onOpenTicket={() => setCurrentStep('ticket_view')}
          onOpenSettings={() => handleOpenProtectedStep('settings')}
          onQuickAddProduct={() => handleOpenProtectedStep('settings')}
        />
      )}

      {/* Step 2: MASUKKAN HARGA (RM) */}
      {currentStep === 'enter_price' && selectedProduct && (
        <PriceKeypadModal
          product={selectedProduct}
          currencySymbol={settings.currency || 'RM'}
          onCancel={() => {
            setSelectedProduct(null);
            setCurrentStep('product_list');
          }}
          onConfirmPrice={handleConfirmPrice}
        />
      )}

      {/* Step 3: MASUKKAN KUANTITI (kg/ekor) */}
      {currentStep === 'enter_quantity' && selectedProduct && (
        <QuantityKeypadModal
          product={selectedProduct}
          enteredPrice={enteredPrice}
          currencySymbol={settings.currency || 'RM'}
          onCancel={() => {
            setCurrentStep('enter_price');
          }}
          onConfirmQuantity={handleConfirmQuantity}
        />
      )}

      {/* Step 4: PRODUK DITAMBAH (TICKET) */}
      {currentStep === 'ticket_view' && (
        <TicketViewModal
          cartItems={cartItems}
          customer={selectedCustomer}
          currencySymbol={settings.currency || 'RM'}
          deliveryFee={deliveryFee}
          deliveryNotes={deliveryNotes}
          isOneOffDelivery={isOneOffDelivery}
          showDeliveryFeeOnReceipt={showDeliveryFeeOnReceipt}
          onUpdateDeliveryFee={handleUpdateDeliveryFee}
          onBackToProducts={() => setCurrentStep('product_list')}
          onClearCart={handleClearCart}
          onRemoveItem={handleRemoveItem}
          onUpdateItemQuantity={handleUpdateItemQuantity}
          onHoldTicket={handleHoldTicket}
          onProceedToPayment={() => setCurrentStep('payment')}
          onSelectCustomer={() => setIsCustomerModalOpen(true)}
        />
      )}

      {/* Step 5: PEMBAYARAN */}
      {currentStep === 'payment' && (
        <PaymentModal
          cartItems={cartItems}
          customer={selectedCustomer}
          currencySymbol={settings.currency || 'RM'}
          paymentConfig={settings.paymentConfig}
          deliveryFee={deliveryFee}
          deliveryNotes={deliveryNotes}
          isOneOffDelivery={isOneOffDelivery}
          showDeliveryFeeOnReceipt={showDeliveryFeeOnReceipt}
          onUpdateDeliveryFee={handleUpdateDeliveryFee}
          onCancel={() => setCurrentStep('ticket_view')}
          onCompletePayment={handleCompletePayment}
        />
      )}

      {/* Step 6: RECEIPT DISPLAY */}
      {currentStep === 'receipt_view' && activeReceiptTx && (
        <ReceiptModal
          transaction={activeReceiptTx}
          receiptConfig={settings.receiptConfig}
          printSoundEnabled={settings.printSoundEnabled ?? true}
          onNewSale={() => {
            setActiveReceiptTx(null);
            setCurrentStep('product_list');
          }}
          onClose={() => setCurrentStep('product_list')}
        />
      )}

      {/* RECEIPT DESIGNER (Requirement Wajib V1) */}
      {currentStep === 'receipt_designer' && (
        <ReceiptDesigner
          initialConfig={settings.receiptConfig}
          onSaveConfig={handleSaveReceiptConfig}
          onClose={() => setCurrentStep('product_list')}
        />
      )}

      {/* TRANSACTIONS HISTORY & VOID */}
      {currentStep === 'transactions' && (
        <TransactionsView
          transactions={transactions}
          receiptConfig={settings.receiptConfig}
          adminPin={settings.adminPin}
          onVoidTransaction={handleVoidTransaction}
          onViewReceipt={(tx) => {
            setActiveReceiptTx(tx);
            setCurrentStep('receipt_view');
          }}
          onClose={() => setCurrentStep('product_list')}
        />
      )}

      {/* REPORTS (Harian / Mingguan / Bulanan) */}
      {currentStep === 'reports' && (
        <ReportsView
          transactions={transactions}
          receiptConfig={settings.receiptConfig}
          onClose={() => setCurrentStep('product_list')}
        />
      )}

      {/* SETTINGS & ADMIN PIN */}
      {currentStep === 'settings' && (
        <SettingsModal
          settings={settings}
          products={products}
          customers={customers}
          categoryOrder={settings.categoryOrder}
          onSaveSettings={handleSaveSettings}
          onSaveProducts={handleSaveProducts}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onReorderProducts={handleReorderProducts}
          onReorderCategories={handleReorderCategories}
          onSaveCustomers={handleSaveCustomers}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onResetAllData={handleResetAllData}
          onClose={() => setCurrentStep('product_list')}
          initiallyAuthenticated={true}
        />
      )}

      {/* Customer Selector Modal Overlay */}
      {isCustomerModalOpen && (
        <CustomerSelectModal
          customers={customers}
          selectedCustomerId={selectedCustomer.id}
          onSelectCustomer={(c) => setSelectedCustomer(c)}
          onAddNewCustomer={handleAddNewCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onClose={() => setIsCustomerModalOpen(false)}
        />
      )}

      {/* Held Tickets Modal Overlay */}
      {isHeldTicketsModalOpen && (
        <HeldTicketsModal
          heldTickets={heldTickets}
          currencySymbol={settings.currency || 'RM'}
          onRestoreTicket={handleRestoreTicket}
          onDeleteHeldTicket={handleDeleteHeldTicket}
          onClose={() => setIsHeldTicketsModalOpen(false)}
        />
      )}

      {/* Install Guide Modal Overlay */}
      {isInstallGuideOpen && (
        <InstallGuideModal
          onClose={() => setIsInstallGuideOpen(false)}
        />
      )}

      {/* ADMIN PIN CONFIRMATION MODAL OVERLAY (QA REQUIREMENT) */}
      {pendingAdminStep !== null && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-md">
                <Lock className="w-7 h-7 animate-pulse" />
              </div>
              <h2 className="text-base font-extrabold uppercase text-slate-100 tracking-wider">
                AKSES ADMIN DIPERLUKAN
              </h2>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
                Masukkan Admin PIN untuk meneruskan.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const currentPin = settings.adminPin || '1234';
                if (adminPinInput === currentPin) {
                  sound.playOkBeep();
                  setCurrentStep(pendingAdminStep);
                  setPendingAdminStep(null);
                  setAdminPinInput('');
                  setAdminPinError(false);
                } else {
                  sound.playVoidBeep();
                  setAdminPinError(true);
                }
              }}
              className="space-y-4"
            >
              <div className="relative">
                <input
                  autoFocus
                  type="password"
                  maxLength={6}
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError(false);
                  }}
                  placeholder="••••"
                  className="w-full bg-slate-950 text-center text-3xl font-mono font-bold tracking-widest text-emerald-400 rounded-2xl p-3 border-2 border-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
                />
              </div>

              {adminPinError && (
                <p className="text-center text-xs text-rose-400 font-bold animate-shake">
                  PIN Salah! Sila cuba lagi.
                </p>
              )}

              {/* Touchscreen numerical keypad */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      sound.playKeyBeep(600, 0.04);
                      if (adminPinInput.length < 6) {
                        setAdminPinInput(prev => prev + num);
                        setAdminPinError(false);
                      }
                    }}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-base font-bold text-slate-100 border border-slate-700/50 transition cursor-pointer active:scale-95 flex items-center justify-center font-mono"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(450, 0.04);
                    setAdminPinInput('');
                    setAdminPinError(false);
                  }}
                  className="py-3 rounded-xl bg-slate-800/60 hover:bg-slate-850 hover:text-rose-400 text-[10px] font-bold text-slate-400 border border-slate-700/30 transition cursor-pointer active:scale-95 flex items-center justify-center uppercase tracking-wider"
                >
                  Padam
                </button>
                <button
                  key="0"
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(600, 0.04);
                    if (adminPinInput.length < 6) {
                      setAdminPinInput(prev => prev + '0');
                      setAdminPinError(false);
                    }
                  }}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-base font-bold text-slate-100 border border-slate-700/50 transition cursor-pointer active:scale-95 flex items-center justify-center font-mono"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(450, 0.04);
                    if (adminPinInput.length > 0) {
                      setAdminPinInput(prev => prev.slice(0, -1));
                      setAdminPinError(false);
                    }
                  }}
                  className="py-3 rounded-xl bg-slate-800/60 hover:bg-slate-850 hover:text-slate-200 text-slate-400 border border-slate-700/30 transition cursor-pointer active:scale-95 flex items-center justify-center font-mono"
                >
                  ←
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(450, 0.04);
                    setPendingAdminStep(null);
                    setAdminPinInput('');
                    setAdminPinError(false);
                  }}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-slate-700 active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/70 active:scale-95"
                >
                  Sahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        allowClose={true}
      />
    </SunmiFrame>
  );
}
