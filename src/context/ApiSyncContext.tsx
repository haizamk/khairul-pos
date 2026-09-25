import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  saveProduct: (product: Product) => Promise<void>;
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

  // Helper for API fetch
  const fetchApi = useCallback(async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      ...options
    });
    return res.json();
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
        await refreshAllData();
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
  }, [fetchApi, refreshAllData]);

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
  const saveProduct = useCallback(async (product: Product) => {
    const prodId = product.id || `p_${Date.now()}`;
    const cleanProd = { ...product, id: prodId };

    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prodId);
      const next = exists ? prev.map((p) => (p.id === prodId ? cleanProd : p)) : [...prev, cleanProd];
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    try {
      await fetchApi(product.id ? `/api/products/${product.id}` : '/api/products', {
        method: product.id ? 'PUT' : 'POST',
        body: JSON.stringify(cleanProd)
      });
    } catch (err) {
      console.error('saveProduct API error:', err);
    }
  }, [fetchApi]);

  // Delete Product
  const deleteProduct = useCallback(async (productId: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    try {
      await fetchApi(`/api/products/${productId}`, { method: 'DELETE' });
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
    setTransactions((prev) => {
      const next = prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            status: 'voided' as const,
            voidReason: reason,
            voidedAt: new Date().toISOString()
          };
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

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
    setTransactions((prev) => {
      const next = prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            whatsappStatus: status,
            whatsappSent: status === 'sent',
            whatsappPhone: phone || t.whatsappPhone,
            whatsappError: error,
            whatsappSentAt: status === 'sent' ? new Date().toISOString() : t.whatsappSentAt
          };
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

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

    try {
      const res = await fetchApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      return { success: res.success };
    } catch (err: any) {
      return { success: false, error: err.message };
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
