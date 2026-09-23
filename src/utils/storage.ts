import { Product, Customer, Transaction, AppSettings, HeldTicket, Category, AppUser } from '../types';

export const DEFAULT_CATEGORY_ITEMS: Category[] = [
  { id: 'cat_ayam_segar', name: 'Ayam Segar', sortOrder: 1 },
  { id: 'cat_ayam_bahagian', name: 'Ayam Bahagian', sortOrder: 2 },
  { id: 'cat_organ_bahagian', name: 'Organ & Bahagian', sortOrder: 3 },
  { id: 'cat_ayam_kampung', name: 'Ayam Kampung', sortOrder: 4 },
  { id: 'cat_ayam_tua', name: 'Ayam Tua', sortOrder: 5 },
  { id: 'cat_daging_segar', name: 'Daging Segar', sortOrder: 6 },
  { id: 'cat_ikan_segar', name: 'Ikan Segar', sortOrder: 7 },
  { id: 'cat_frozen_food', name: 'Frozen Food', sortOrder: 8 },
];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Ayam Daging Bersih', defaultPrice: 9.60, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 1 },
  { id: 'p2', name: 'Ayam Separuh', defaultPrice: 9.60, defaultUnit: 'kg', category: 'Ayam Segar', sortOrder: 2 },
  { id: 'p3', name: 'Whole Leg', defaultPrice: 13.50, defaultUnit: 'kg', category: 'Ayam Bahagian', sortOrder: 3 },
  { id: 'p4', name: 'Kepak Ayam', defaultPrice: 14.00, defaultUnit: 'kg', category: 'Ayam Bahagian', isPopular: true, sortOrder: 4 },
  { id: 'p5', name: 'Isi Ayam', defaultPrice: 15.50, defaultUnit: 'kg', category: 'Ayam Bahagian', sortOrder: 5 },
  { id: 'p6', name: 'Rangka / Kaki Ayam', defaultPrice: 5.00, defaultUnit: 'kg', category: 'Ayam Bahagian', sortOrder: 6 },
  { id: 'p7', name: 'Hati / Pedal Ayam', defaultPrice: 8.00, defaultUnit: 'kg', category: 'Organ & Bahagian', sortOrder: 7 },
  { id: 'p8', name: 'Pedal Ayam', defaultPrice: 8.50, defaultUnit: 'kg', category: 'Organ & Bahagian', sortOrder: 8 },
  { id: 'p9', name: 'Ayam Kampung', defaultPrice: 18.00, defaultUnit: 'ekor', category: 'Ayam Kampung', isPopular: true, sortOrder: 9 },
  { id: 'p10', name: 'Ayam Tua', defaultPrice: 13.00, defaultUnit: 'ekor', category: 'Ayam Tua', sortOrder: 10 },
  { id: 'p11', name: 'Daging Lembu Segar', defaultPrice: 38.00, defaultUnit: 'kg', category: 'Daging Segar', sortOrder: 11 },
  { id: 'p12', name: 'Tulang Lembu Sup', defaultPrice: 24.00, defaultUnit: 'kg', category: 'Daging Segar', sortOrder: 12 },
  { id: 'p13', name: 'Ikan Kembung Segar', defaultPrice: 16.00, defaultUnit: 'kg', category: 'Ikan Segar', sortOrder: 13 },
  { id: 'p14', name: 'Udang Harimau Frozen', defaultPrice: 32.00, defaultUnit: 'pkt', category: 'Frozen Food', sortOrder: 14 },
];

export const DEFAULT_CATEGORIES: string[] = [
  'Ayam Segar',
  'Ayam Bahagian',
  'Organ & Bahagian',
  'Ayam Kampung',
  'Ayam Tua',
  'Daging Segar',
  'Ikan Segar',
  'Frozen Food',
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Runcit (Pelanggan Am)', type: 'runcit' },
  { id: 'c2', name: 'Restoran Selera Rasa', phone: '019-2837461', type: 'restoran', discountPercent: 0, notes: 'Bayar mingguan / Cash' },
  { id: 'c3', name: 'Warung Nasi Lemak Kak Som', phone: '012-9871234', type: 'tetap', discountPercent: 0 },
  { id: 'c4', name: 'Katering Hj Ismail', phone: '013-3344556', type: 'pemborong', discountPercent: 0 },
  { id: 'c5', name: 'Peniaga Pasar Malam (Pak Samad)', phone: '017-8899001', type: 'pemborong' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  adminPin: '1234',
  cashierName: 'Khairul / Staff POS',
  storeName: 'KHAIRUL FRESH AND FROZEN FOOD',
  currency: 'RM',
  soundEnabled: true,
  printSoundEnabled: true,
  deviceFrameMode: true,
  categoryOrder: DEFAULT_CATEGORIES,
  fonnteToken: '',
  receiptConfig: {
    logoType: 'icon',
    customLogoUrl: '',
    selectedIcon: 'poultry',
    companyName: 'KHAIRUL FRESH AND FROZEN FOOD',
    tagline: 'Pilihan Segar, Bersih & Halal Setiap Hari',
    ssmNumber: 'SSM: 202403198822 (003456789-V)',
    phone: '012-345 6789 / 019-876 5432',
    address: 'No. 12 & 14, Pasar Basah Sentral, Jalan Niaga Utama, 43000 Kajang, Selangor',
    website: 'https://freshmarket.my',
    footerMessage: 'Terima kasih atas sokongan anda! Sila semak barang & baki sebelum beredar. Barang basah tiada jaminan pemulangan.',
    fontSize: 'medium',
    paperWidth: '58mm',
    showInvoiceNo: true,
    showDateTime: true,
    showCashier: true,
    showCustomer: true,
    showPaymentDetails: true,
    showQrCode: true,
    qrCodeUrl: 'https://wa.me/60123456789?text=Hai%20Khairul%20Fresh%20Food',
    currencySymbol: 'RM',
  },
  paymentConfig: {
    enableStripe: false,
    stripePublishableKey: '',
    enableHitPay: false,
    hitpayApiKey: '',
    merchantName: 'KHAIRUL FRESH & FROZEN',
    duitNowQrString: 'DuitNow.QR.KhairulFresh0123456789',
    nfcReaderMode: 'touch_to_pay',
  },
};

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    invoiceNo: 'INV-20260826-0001',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    customer: DEFAULT_CUSTOMERS[0],
    items: [
      { id: 'it_1', productId: 'p1', name: 'Ayam Daging Bersih', unitPrice: 9.60, quantity: 1.5, unit: 'kg', totalPrice: 14.40 },
      { id: 'it_2', productId: 'p4', name: 'Kepak Ayam', unitPrice: 14.00, quantity: 1.0, unit: 'kg', totalPrice: 14.00 },
    ],
    subtotal: 28.40,
    discount: 0,
    totalAmount: 28.40,
    paymentMethod: 'tunai',
    amountPaid: 30.00,
    changeAmount: 1.60,
    cashierName: 'Khairul',
    status: 'completed',
  },
  {
    id: 'tx_seed_2',
    invoiceNo: 'INV-20260826-0002',
    timestamp: new Date(Date.now() - 3600 * 1000 * 1.2).toISOString(),
    customer: DEFAULT_CUSTOMERS[1],
    items: [
      { id: 'it_3', productId: 'p1', name: 'Ayam Daging Bersih', unitPrice: 9.60, quantity: 15.0, unit: 'kg', totalPrice: 144.00 },
      { id: 'it_4', productId: 'p9', name: 'Ayam Kampung', unitPrice: 18.00, quantity: 3.0, unit: 'ekor', totalPrice: 54.00 },
    ],
    subtotal: 198.00,
    discount: 0,
    totalAmount: 198.00,
    paymentMethod: 'qr_pay',
    amountPaid: 198.00,
    changeAmount: 0.00,
    cashierName: 'Khairul',
    status: 'completed',
  },
  {
    id: 'tx_seed_3',
    invoiceNo: 'INV-20260826-0003',
    timestamp: new Date(Date.now() - 3600 * 1000 * 0.5).toISOString(),
    customer: DEFAULT_CUSTOMERS[0],
    items: [
      { id: 'it_5', productId: 'p3', name: 'Whole Leg', unitPrice: 13.50, quantity: 2.2, unit: 'kg', totalPrice: 29.70 },
    ],
    subtotal: 29.70,
    discount: 0,
    totalAmount: 29.70,
    paymentMethod: 'kad_nfc',
    amountPaid: 29.70,
    changeAmount: 0.00,
    cashierName: 'Staff POS',
    status: 'completed',
  },
];

const STORAGE_KEYS = {
  PRODUCTS: 'khairul_pos_products_v1',
  CATEGORIES: 'khairul_pos_categories_v1',
  CUSTOMERS: 'khairul_pos_customers_v1',
  SETTINGS: 'khairul_pos_settings_v1',
  TRANSACTIONS: 'khairul_pos_transactions_v1',
  HELD_TICKETS: 'khairul_pos_held_tickets_v1',
  INVOICE_SEQ: 'khairul_pos_invoice_seq_v1',
  CURRENT_USER_PROFILE: 'khairul_pos_current_user_profile_v1',
  STAFF_USERS: 'khairul_pos_staff_users_v1',
};

export const Storage = {
  getCurrentUserProfile(): AppUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  saveCurrentUserProfile(profile: AppUser | null) {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_PROFILE, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_PROFILE);
      }
    } catch (e) {
      console.error('Failed to save current user profile', e);
    }
  },
  getStaffUsers(): AppUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF_USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveStaffUsers(users: AppUser[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save staff users', e);
    }
  },
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
        }
      }
      return DEFAULT_CATEGORY_ITEMS;
    } catch {
      return DEFAULT_CATEGORY_ITEMS;
    }
  },
  saveCategories(categories: Category[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  },

  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  },
  saveProducts(products: Product[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products', e);
    }
  },

  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  },
  saveCustomers(customers: Customer[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to save customers', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        receiptConfig: {
          ...DEFAULT_SETTINGS.receiptConfig,
          ...(parsed.receiptConfig || {}),
        },
        paymentConfig: {
          ...DEFAULT_SETTINGS.paymentConfig,
          ...(parsed.paymentConfig || {}),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(settings: AppSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : SEED_TRANSACTIONS;
    } catch {
      return SEED_TRANSACTIONS;
    }
  },
  saveTransactions(txs: Transaction[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    } catch (e) {
      console.error('Failed to save transactions', e);
    }
  },

  getHeldTickets(): HeldTicket[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HELD_TICKETS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveHeldTickets(tickets: HeldTicket[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.HELD_TICKETS, JSON.stringify(tickets));
    } catch (e) {
      console.error('Failed to save held tickets', e);
    }
  },

  getNextInvoiceNo(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    let seq = 1;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVOICE_SEQ);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === dateStr) {
          seq = parsed.seq + 1;
        }
      }
      localStorage.setItem(STORAGE_KEYS.INVOICE_SEQ, JSON.stringify({ date: dateStr, seq }));
    } catch {
      seq = Math.floor(1000 + Math.random() * 9000);
    }
    return `INV-${dateStr}-${String(seq).padStart(4, '0')}`;
  },

  resetAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.HELD_TICKETS);
      localStorage.removeItem(STORAGE_KEYS.INVOICE_SEQ);
    } catch (e) {
      console.error('Failed reset', e);
    }
  }
};
