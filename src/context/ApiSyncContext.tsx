import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Product,
  Category,
  Customer,
  Transaction,
  HeldTicket,
  AppSettings,
  AppUser,
  UserStatus
} from '../types';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORY_ITEMS,
  DEFAULT_CUSTOMERS,
  DEFAULT_SETTINGS,
  Storage as LocalStorageFallback
} from '../utils/storage';

// Helper to strip undefined values so Firestore setDoc accepts the object without throwing unsupported field errors
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return null as any;
  return JSON.parse(JSON.stringify(data));
}

export type SyncState = 'connecting' | 'synced' | 'syncing' | 'offline' | 'unauthenticated' | 'error';

interface ApiSyncContextType {
  user: AppUser | null;
  currentUserProfile: AppUser | null;
  staffUsers: AppUser[];
  isStaffLoading: boolean;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isAuthReady: boolean;
  syncState: SyncState;
  syncErrorMessage: string | null;
  lastSyncedAt: Date | null;
  isCloudActive: boolean;

  // Real-time / API Data
  products: Product[];
  categories: Category[];
  customers: Customer[];
  transactions: Transaction[];
  heldTickets: HeldTicket[];
  settings: AppSettings;

  // Mutation Methods
  saveProduct: (product: Product) => Promise<{ success: boolean; error?: string; product?: Product }>;
  deleteProduct: (productId: string) => Promise<void>;
  reorderProducts: (products: Product[]) => Promise<void>;
  saveCategory: (category: Partial<Category> & { name: string }) => Promise<{ success: boolean; error?: string; category?: Category }>;
  editCategory: (categoryId: string, newName: string) => Promise<{ success: boolean; error?: string; affectedProductsCount?: number }>;
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; error?: string; usedCount?: number }>;
  reorderCategoriesList: (orderedCategories: Category[]) => Promise<void>;
  reorderCategories: (categories: string[]) => Promise<void>;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; error?: string }>;
  saveTransaction: (tx: Transaction) => Promise<void>;
  voidTransaction: (txId: string, reason: string) => Promise<void>;
  updateTransactionWhatsAppStatus: (
    txId: string,
    status: 'sent' | 'failed' | 'pending',
    phone?: string,
    error?: string
  ) => Promise<void>;
  saveHeldTickets: (tickets: HeldTicket[]) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>;
  saveFonnteToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  getNextInvoiceNo: () => string;
  seedDbDefaults: () => Promise<void>;
  resetAllData: () => Promise<void>;

  // User & Staff Management
  loginWithLoginId: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  createStaffUser: (userData: {
    name: string;
    phone: string;
    loginId: string;
    password: string;
    role: 'admin' | 'cashier';
    status: 'active' | 'inactive';
  }) => Promise<{ success: boolean; error?: string }>;
  updateStaffUser: (
    userId: string,
    data: Partial<AppUser> & { newPassword?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  toggleStaffStatus: (userId: string, currentStatus: UserStatus) => Promise<{ success: boolean; error?: string }>;
  deleteStaffUser: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Auth actions
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const ApiSyncContext = createContext<ApiSyncContextType | undefined>(undefined);

export function ApiSyncProvider({ children }: { children: ReactNode }) {
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(() => {
    return LocalStorageFallback.getCurrentUserProfile();
  });
  const [staffUsers, setStaffUsers] = useState<AppUser[]>(() => {
    return LocalStorageFallback.getStaffUsers();
  });
  const [isStaffLoading, setIsStaffLoading] = useState<boolean>(false);

  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('connecting');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // In-memory data
  const [products, setProducts] = useState<Product[]>(() => LocalStorageFallback.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => LocalStorageFallback.getCategories());
  const [customers, setCustomers] = useState<Customer[]>(() => LocalStorageFallback.getCustomers());
  const [transactions, setTransactions] = useState<Transaction[]>(() => LocalStorageFallback.getTransactions());
  const [heldTickets, setHeldTickets] = useState<HeldTicket[]>(() => LocalStorageFallback.getHeldTickets());
  const [settings, setSettings] = useState<AppSettings>(() => LocalStorageFallback.getSettings());

  // Derived role flags
  const isMasterAdmin = currentUserProfile?.role === 'master_admin';
  const isAdmin = isMasterAdmin || currentUserProfile?.role === 'admin';
  const isCashier = currentUserProfile?.role === 'cashier';

  // Helper for API fetch (Uses HttpOnly session cookies automatically with robust response parsing)
  const fetchApi = useCallback(async (endpoint: string, options?: RequestInit) => {
    try {
      const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        },
        ...options
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok && data && data.success === undefined) {
          data.success = false;
        }
        return data;
      } else {
        const text = await res.text();
        console.warn(`[API] Endpoint ${url} returned non-JSON content (${res.status}):`, text.slice(0, 120));
        return {
          success: false,
          status: res.status,
          error: res.status === 401 || res.status === 403
            ? 'Akses ditolak. Sila log masuk semula sebagai Admin.'
            : `Ralat pelayan (${res.status}).`
        };
      }
    } catch (err: any) {
      console.error(`[API] Fetch error for ${endpoint}:`, err);
      return {
        success: false,
        error: err?.message || 'Ralat Rangkaian'
      };
    }
  }, []);

  // Fetch all initial POS data from API
  const refreshAllData = useCallback(async () => {
    try {
      setSyncState('syncing');

      // Fetch Products
      const prodRes = await fetchApi('/api/products');
      if (prodRes.success && Array.isArray(prodRes.products)) {
        setProducts(prodRes.products);
        LocalStorageFallback.saveProducts(prodRes.products);
      }

      // Fetch Categories
      const catRes = await fetchApi('/api/categories');
      if (catRes.success && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
        LocalStorageFallback.saveCategories(catRes.categories);
      }

      // Fetch Customers
      const custRes = await fetchApi('/api/customers');
      if (custRes.success && Array.isArray(custRes.customers)) {
        setCustomers(custRes.customers);
        LocalStorageFallback.saveCustomers(custRes.customers);
      }

      // Fetch Transactions
      const txRes = await fetchApi('/api/transactions');
      if (txRes.success && Array.isArray(txRes.transactions)) {
        setTransactions(txRes.transactions);
        LocalStorageFallback.saveTransactions(txRes.transactions);
      }

      // Fetch Held Tickets
      const htRes = await fetchApi('/api/held-tickets');
      if (htRes.success && Array.isArray(htRes.heldTickets)) {
        setHeldTickets(htRes.heldTickets);
        LocalStorageFallback.saveHeldTickets(htRes.heldTickets);
      }

      // Fetch Settings
      const setRes = await fetchApi('/api/settings');
      if (setRes.success && setRes.settings) {
        setSettings(setRes.settings);
        LocalStorageFallback.saveSettings(setRes.settings);
      }

      // Fetch Staff if admin
      if (currentUserProfile?.role === 'master_admin' || currentUserProfile?.role === 'admin') {
        const staffRes = await fetchApi('/api/staff');
        if (staffRes.success && Array.isArray(staffRes.staff)) {
          setStaffUsers(staffRes.staff);
          LocalStorageFallback.saveStaffUsers(staffRes.staff);
        }
      }

      setSyncState('synced');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('[API Sync] Fetch error:', err);
      setSyncState('synced'); // Fallback to cached local data without crashing
    }
  }, [fetchApi, currentUserProfile]);

  // Check auth session on load
  useEffect(() => {
    let mounted = true;
    async function checkAuthSession() {
      try {
        const res = await fetchApi('/api/auth/me');
        if (mounted) {
          if (res.success && res.authenticated && res.user) {
            setCurrentUserProfile(res.user);
            LocalStorageFallback.saveCurrentUserProfile(res.user);
            setSyncState('synced');
          } else {
            setCurrentUserProfile(null);
            LocalStorageFallback.saveCurrentUserProfile(null);
            setSyncState('unauthenticated');
          }
          setIsAuthReady(true);
        }
      } catch (err) {
        if (mounted) {
          setIsAuthReady(true);
          setSyncState('unauthenticated');
        }
      }
    }
    checkAuthSession();
    return () => { mounted = false; };
  }, [fetchApi]);

  // REAL-TIME FIRESTORE MULTI-DEVICE LISTENERS
  useEffect(() => {
    // 1. Listen to Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const liveProds = snapshot.docs.map((docSnap) => docSnap.data() as Product);
        liveProds.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
        setProducts(liveProds);
        LocalStorageFallback.saveProducts(liveProds);
      }
    }, (err) => console.warn('[Firestore] Products subscription:', err));

    // 2. Listen to Categories
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const liveCats = snapshot.docs.map((docSnap) => docSnap.data() as Category);
        liveCats.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
        setCategories(liveCats);
        LocalStorageFallback.saveCategories(liveCats);
      }
    }, (err) => console.warn('[Firestore] Categories subscription:', err));

    // 3. Listen to Customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      if (!snapshot.empty) {
        const liveCusts = snapshot.docs.map((docSnap) => docSnap.data() as Customer);
        setCustomers(liveCusts);
        LocalStorageFallback.saveCustomers(liveCusts);
      }
    }, (err) => console.warn('[Firestore] Customers subscription:', err));

    // 4. Listen to Transactions
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      if (!snapshot.empty) {
        const liveTxs = snapshot.docs.map((docSnap) => docSnap.data() as Transaction);
        liveTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(liveTxs);
        LocalStorageFallback.saveTransactions(liveTxs);
      }
    }, (err) => console.warn('[Firestore] Transactions subscription:', err));

    // 5. Listen to Held Tickets
    const unsubHeldTickets = onSnapshot(collection(db, 'held_tickets'), (snapshot) => {
      const liveTickets = snapshot.docs.map((docSnap) => docSnap.data() as HeldTicket);
      liveTickets.sort((a, b) => a.ticketNumber - b.ticketNumber);
      setHeldTickets(liveTickets);
      LocalStorageFallback.saveHeldTickets(liveTickets);
    }, (err) => console.warn('[Firestore] Held Tickets subscription:', err));

    // 6. Listen to Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store_config'), (docSnap) => {
      if (docSnap.exists()) {
        const liveSet = docSnap.data() as AppSettings;
        setSettings(liveSet);
        LocalStorageFallback.saveSettings(liveSet);
      }
    }, (err) => console.warn('[Firestore] Settings subscription:', err));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubTransactions();
      unsubHeldTickets();
      unsubSettings();
    };
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (currentUserProfile) {
      refreshAllData();
    }
  }, [currentUserProfile?.uid, refreshAllData]);

  // Login method
  const loginWithLoginId = useCallback(async (loginId: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState('syncing');
      setSyncErrorMessage(null);

      const res = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password: pass })
      });

      if (res.success && res.user) {
        setCurrentUserProfile(res.user);
        LocalStorageFallback.saveCurrentUserProfile(res.user);
        setSyncState('synced');
        return { success: true };
      } else {
        setSyncState('unauthenticated');
        const err = res.error || '⚠️ Log masuk gagal — Sila semak Login ID dan kata laluan.';
        setSyncErrorMessage(err);
        return { success: false, error: err };
      }
    } catch (err: any) {
      setSyncState('unauthenticated');
      const msg = err.message || '⚠️ Gagal berhubung dengan pelayan.';
      setSyncErrorMessage(msg);
      return { success: false, error: msg };
    }
  }, [fetchApi]);

  // Logout method
  const logout = useCallback(async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setCurrentUserProfile(null);
    LocalStorageFallback.saveCurrentUserProfile(null);
    setSyncState('unauthenticated');
  }, [fetchApi]);

  // Placeholder Google Login
  const loginWithGoogle = useCallback(async () => {
    alert('Log masuk Google tidak disokong. Sila gunakan Login ID dan Kata Laluan staf.');
  }, []);

  // Save Product
  const saveProduct = useCallback(async (product: Product): Promise<{ success: boolean; error?: string; product?: Product }> => {
    const prodId = product.id || `p_${Date.now()}`;
    const cleanProd = { ...product, id: prodId };

    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prodId);
      const next = exists ? prev.map((p) => (p.id === prodId ? cleanProd : p)) : [...prev, cleanProd];
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    // Write to Firestore for instant real-time multi-device sync
    setDoc(doc(db, 'products', prodId), sanitizeForFirestore(cleanProd), { merge: true }).catch((err) =>
      console.warn('[Firestore] saveProduct setDoc warning:', err)
    );

    try {
      const endpoint = product.id ? `/api/products/${encodeURIComponent(product.id)}` : '/api/products';
      const res = await fetchApi(endpoint, {
        method: product.id ? 'PUT' : 'POST',
        body: JSON.stringify(cleanProd)
      });
      if (res && res.success) {
        return { success: true, product: res.product || cleanProd };
      }
      return { success: false, error: res?.error || 'Gagal menyimpan produk ke pangkalan data.' };
    } catch (err: any) {
      console.error('saveProduct API error:', err);
      return { success: false, error: err?.message || 'Ralat semasa menyimpan produk.' };
    }
  }, [fetchApi]);

  // Delete Product
  const deleteProduct = useCallback(async (productId: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    deleteDoc(doc(db, 'products', productId)).catch((err) =>
      console.warn('[Firestore] deleteProduct deleteDoc warning:', err)
    );

    try {
      await fetchApi(`/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('deleteProduct API error:', err);
    }
  }, [fetchApi]);

  // Reorder Products
  const reorderProducts = useCallback(async (orderedProducts: Product[]) => {
    setProducts(orderedProducts);
    LocalStorageFallback.saveProducts(orderedProducts);

    try {
      await fetchApi('/api/products/reorder', {
        method: 'POST',
        body: JSON.stringify({ products: orderedProducts })
      });
    } catch (err) {
      console.error('reorderProducts API error:', err);
    }
  }, [fetchApi]);

  // Save Category
  const saveCategory = useCallback(async (cat: Partial<Category> & { name: string }): Promise<{ success: boolean; error?: string; category?: Category }> => {
    const trimmedName = cat.name ? cat.name.trim() : '';
    if (!trimmedName) return { success: false, error: 'Nama kategori tidak boleh kosong.' };

    const catId = cat.id || `cat_${Date.now()}`;
    const cleanCat = { id: catId, name: trimmedName, sortOrder: cat.sortOrder || 0 };

    setCategories((prev) => {
      const exists = prev.some((c) => c.id === catId);
      const next = exists ? prev.map((c) => (c.id === catId ? cleanCat : c)) : [...prev, cleanCat];
      LocalStorageFallback.saveCategories(next);
      return next;
    });

    setDoc(doc(db, 'categories', catId), sanitizeForFirestore(cleanCat), { merge: true }).catch((err) =>
      console.warn('[Firestore] saveCategory setDoc warning:', err)
    );

    try {
      const res = await fetchApi(cat.id ? `/api/categories/${cat.id}` : '/api/categories', {
        method: cat.id ? 'PUT' : 'POST',
        body: JSON.stringify(cleanCat)
      });
      return { success: res.success, category: res.category || cleanCat };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchApi]);

  // Edit Category
  const editCategory = useCallback(async (categoryId: string, newName: string): Promise<{ success: boolean; error?: string; affectedProductsCount?: number }> => {
    const trimmed = newName ? newName.trim() : '';
    if (!trimmed) return { success: false, error: 'Nama kategori tidak boleh kosong.' };

    const existingCat = categories.find((c) => c.id === categoryId);
    if (!existingCat) return { success: false, error: 'Kategori tidak dijumpai.' };

    const updated = { ...existingCat, name: trimmed };
    return saveCategory(updated);
  }, [categories, saveCategory]);

  // Delete Category
  const deleteCategory = useCallback(async (categoryId: string): Promise<{ success: boolean; error?: string; usedCount?: number }> => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      const used = products.filter((p) => p.category === cat.name);
      if (used.length > 0) {
        return { success: false, error: `Kategori ini sedang digunakan oleh ${used.length} produk.`, usedCount: used.length };
      }
    }

    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== categoryId);
      LocalStorageFallback.saveCategories(next);
      return next;
    });

    deleteDoc(doc(db, 'categories', categoryId)).catch((err) =>
      console.warn('[Firestore] deleteCategory deleteDoc warning:', err)
    );

    try {
      await fetchApi(`/api/categories/${categoryId}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }

    return { success: true };
  }, [categories, products, fetchApi]);

  // Reorder Categories List
  const reorderCategoriesList = useCallback(async (orderedCategories: Category[]) => {
    setCategories(orderedCategories);
    LocalStorageFallback.saveCategories(orderedCategories);

    try {
      await fetchApi('/api/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ categories: orderedCategories })
      });
    } catch (err) {
      console.error('reorderCategoriesList error:', err);
    }
  }, [fetchApi]);

  // Reorder Categories String Names
  const reorderCategories = useCallback(async (orderedNames: string[]) => {
    const reordered: Category[] = [];
    const map = new Map<string, Category>(categories.map((c) => [c.name, c]));

    orderedNames.forEach((name, idx) => {
      const existing = map.get(name);
      if (existing) {
        reordered.push({ ...existing, sortOrder: idx + 1 });
        map.delete(name);
      } else {
        reordered.push({ id: `cat_${Date.now()}_${idx}`, name, sortOrder: idx + 1 });
      }
    });

    map.forEach((c) => reordered.push({ ...c, sortOrder: reordered.length + 1 }));
    await reorderCategoriesList(reordered);
  }, [categories, reorderCategoriesList]);

  // Save Customer
  const saveCustomer = useCallback(async (cust: Customer) => {
    const custId = cust.id || `c_${Date.now()}`;
    const cleanCust = { ...cust, id: custId };

    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === custId);
      const next = exists ? prev.map((c) => (c.id === custId ? cleanCust : c)) : [cleanCust, ...prev];
      LocalStorageFallback.saveCustomers(next);
      return next;
    });

    setDoc(doc(db, 'customers', custId), sanitizeForFirestore(cleanCust), { merge: true }).catch((err) =>
      console.warn('[Firestore] saveCustomer setDoc warning:', err)
    );

    try {
      await fetchApi(cust.id ? `/api/customers/${cust.id}` : '/api/customers', {
        method: cust.id ? 'PUT' : 'POST',
        body: JSON.stringify(cleanCust)
      });
    } catch (err) {
      console.error('saveCustomer error:', err);
    }
  }, [fetchApi]);

  // Delete Customer
  const deleteCustomer = useCallback(async (customerId: string): Promise<{ success: boolean; error?: string }> => {
    if (customerId === 'c1' || customerId === 'c_default') {
      return { success: false, error: 'Pelanggan am tidak boleh dipadam.' };
    }

    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== customerId);
      LocalStorageFallback.saveCustomers(next);
      return next;
    });

    deleteDoc(doc(db, 'customers', customerId)).catch((err) =>
      console.warn('[Firestore] deleteCustomer deleteDoc warning:', err)
    );

    try {
      await fetchApi(`/api/customers/${customerId}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
    return { success: true };
  }, [fetchApi]);

  // Save Transaction
  const saveTransaction = useCallback(async (tx: Transaction) => {
    setTransactions((prev) => {
      const next = [tx, ...prev.filter((t) => t.id !== tx.id)];
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    setDoc(doc(db, 'transactions', tx.id), sanitizeForFirestore(tx), { merge: true }).catch((err) =>
      console.warn('[Firestore] saveTransaction setDoc warning:', err)
    );

    try {
      await fetchApi('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
      });
    } catch (err) {
      console.error('saveTransaction API error:', err);
    }
  }, [fetchApi]);

  // Void Transaction
  const voidTransaction = useCallback(async (txId: string, reason: string) => {
    let voidedTx: Transaction | null = null;

    setTransactions((prev) => {
      const next = prev.map((t) => {
        if (t.id === txId) {
          voidedTx = {
            ...t,
            status: 'voided' as const,
            voidReason: reason,
            voidedAt: new Date().toISOString()
          };
          return voidedTx;
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    if (voidedTx) {
      setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(voidedTx), { merge: true }).catch((err) =>
        console.warn('[Firestore] voidTransaction setDoc warning:', err)
      );
    }

    try {
      await fetchApi(`/api/transactions/${txId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch (err) {
      console.error('voidTransaction API error:', err);
    }
  }, [fetchApi]);

  // Update Transaction WhatsApp Status
  const updateTransactionWhatsAppStatus = useCallback(async (
    txId: string,
    status: 'sent' | 'failed' | 'pending',
    phone?: string,
    error?: string
  ) => {
    let updatedTx: Transaction | null = null;

    setTransactions((prev) => {
      const next = prev.map((t) => {
        if (t.id === txId) {
          updatedTx = {
            ...t,
            whatsappStatus: status,
            whatsappSent: status === 'sent',
            whatsappPhone: phone || t.whatsappPhone,
            whatsappError: error,
            whatsappSentAt: status === 'sent' ? new Date().toISOString() : t.whatsappSentAt
          };
          return updatedTx;
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    if (updatedTx) {
      setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(updatedTx), { merge: true }).catch((err) =>
        console.warn('[Firestore] updateTransactionWhatsAppStatus setDoc warning:', err)
      );
    }

    try {
      await fetchApi(`/api/transactions/${txId}/whatsapp`, {
        method: 'PUT',
        body: JSON.stringify({ status, sent: status === 'sent', phone, error })
      });
    } catch (err) {
      console.error('updateTransactionWhatsAppStatus API error:', err);
    }
  }, [fetchApi]);

  // Save Held Tickets
  const saveHeldTickets = useCallback(async (tickets: HeldTicket[]) => {
    setHeldTickets(tickets);
    LocalStorageFallback.saveHeldTickets(tickets);

    // Sync each held ticket to Firestore
    tickets.forEach((t) => {
      setDoc(doc(db, 'held_tickets', t.id), sanitizeForFirestore(t), { merge: true }).catch((err) =>
        console.warn('[Firestore] saveHeldTickets setDoc warning:', err)
      );
    });

    try {
      await fetchApi('/api/held-tickets', {
        method: 'POST',
        body: JSON.stringify({ tickets })
      });
    } catch (err) {
      console.error('saveHeldTickets API error:', err);
    }
  }, [fetchApi]);

  // Save Settings
  const saveSettings = useCallback(async (newSettings: AppSettings): Promise<{ success: boolean; error?: string }> => {
    setSettings(newSettings);
    LocalStorageFallback.saveSettings(newSettings);

    setDoc(doc(db, 'settings', 'store_config'), sanitizeForFirestore(newSettings), { merge: true }).catch((err) =>
      console.warn('[Firestore] saveSettings setDoc warning:', err)
    );

    try {
      const res = await fetchApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      if (res && res.success) {
        return { success: true };
      }
      return { 
        success: false, 
        error: res?.error || res?.message || 'Sila pastikan anda telah log masuk sebagai Admin untuk menyimpan tetapan.' 
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ralat sambungan ke pangkalan data.' };
    }
  }, [fetchApi]);

  // Save Fonnte Token
  const saveFonnteToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    const updated: AppSettings = { ...settings, fonnteToken: token.trim() };
    return saveSettings(updated);
  }, [settings, saveSettings]);

  // Invoice generator
  const getNextInvoiceNo = useCallback(() => {
    return LocalStorageFallback.getNextInvoiceNo();
  }, []);

  // Seed Defaults
  const seedDbDefaults = useCallback(async () => {
    await refreshAllData();
  }, [refreshAllData]);

  // Reset All Data
  const resetAllData = useCallback(async () => {
    LocalStorageFallback.resetAllData();
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORY_ITEMS);
    setCustomers(DEFAULT_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    setTransactions([]);
    setHeldTickets([]);
  }, []);

  // Staff Management: Create Staff User
  const createStaffUser = useCallback(async (userData: {
    name: string;
    phone: string;
    loginId: string;
    password: string;
    role: 'admin' | 'cashier';
    status: 'active' | 'inactive';
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetchApi('/api/staff', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (res.success && res.staff) {
        setStaffUsers((prev) => [...prev, res.staff]);
        return { success: true };
      }
      return { success: false, error: res.error || 'Gagal mendaftar staf.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ralat pelayan.' };
    }
  }, [fetchApi]);

  // Staff Management: Update Staff User
  const updateStaffUser = useCallback(async (
    userId: string,
    data: Partial<AppUser> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = {
        ...data,
        password: data.newPassword,
      };
      const res = await fetchApi(`/api/staff/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.success && res.staff) {
        setStaffUsers((prev) => prev.map((u) => (u.uid === userId || u.id === userId ? res.staff : u)));
        return { success: true };
      }
      return { success: false, error: res.error || 'Gagal mengemas kini staf.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ralat pelayan.' };
    }
  }, [fetchApi]);

  // Toggle Staff Status
  const toggleStaffStatus = useCallback(async (
    userId: string,
    currentStatus: UserStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const newStatus: UserStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return updateStaffUser(userId, { status: newStatus });
  }, [updateStaffUser]);

  // Delete Staff User
  const deleteStaffUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetchApi(`/api/staff/${userId}`, { method: 'DELETE' });
      if (res.success) {
        setStaffUsers((prev) => prev.filter((u) => u.uid !== userId && u.id !== userId));
        return { success: true };
      }
      return { success: false, error: res.error || 'Gagal memadam staf.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ralat pelayan.' };
    }
  }, [fetchApi]);

  return (
    <ApiSyncContext.Provider
      value={{
        user: currentUserProfile,
        currentUserProfile,
        staffUsers,
        isStaffLoading,
        isMasterAdmin,
        isAdmin,
        isCashier,
        isAuthReady,
        syncState,
        syncErrorMessage,
        lastSyncedAt,
        isCloudActive: true,
        products,
        categories,
        customers,
        transactions,
        heldTickets,
        settings,
        saveProduct,
        deleteProduct,
        reorderProducts,
        saveCategory,
        editCategory,
        deleteCategory,
        reorderCategoriesList,
        reorderCategories,
        saveCustomer,
        deleteCustomer,
        saveTransaction,
        voidTransaction,
        updateTransactionWhatsAppStatus,
        saveHeldTickets,
        saveSettings,
        saveFonnteToken,
        getNextInvoiceNo,
        seedDbDefaults,
        resetAllData,
        loginWithLoginId,
        createStaffUser,
        updateStaffUser,
        toggleStaffStatus,
        deleteStaffUser,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </ApiSyncContext.Provider>
  );
}

export function useApiSync() {
  const context = useContext(ApiSyncContext);
  if (!context) {
    throw new Error('useApiSync must be used within an ApiSyncProvider');
  }
  return context;
}
