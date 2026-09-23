import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, signOut, updatePassword } from 'firebase/auth';
import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType,
  sanitizeForFirestore
} from '../utils/firebase';
import { 
  Product, 
  Category,
  Customer, 
  Transaction, 
  HeldTicket, 
  AppSettings,
  AppUser,
  UserRole,
  UserStatus
} from '../types';
import { 
  DEFAULT_PRODUCTS, 
  DEFAULT_CATEGORY_ITEMS,
  DEFAULT_CUSTOMERS, 
  DEFAULT_SETTINGS,
  Storage as LocalStorageFallback
} from '../utils/storage';
import {
  signInWithEmailAndPassword,
  formatStaffEmail,
  createSecondaryAuthUser
} from '../utils/firebase';

export type SyncState = 'connecting' | 'synced' | 'syncing' | 'offline' | 'unauthenticated' | 'error';

interface FirebaseSyncContextType {
  user: User | null;
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

  // Real-time data
  products: Product[];
  categories: Category[];
  customers: Customer[];
  transactions: Transaction[];
  heldTickets: HeldTicket[];
  settings: AppSettings;

  // Real-time Firestore Mutation Methods
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
  seedFirestoreDefaults: () => Promise<void>;
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

const FirebaseSyncContext = createContext<FirebaseSyncContextType | undefined>(undefined);

export function FirebaseSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(() => {
    return LocalStorageFallback.getCurrentUserProfile();
  });
  const [staffUsers, setStaffUsers] = useState<AppUser[]>(() => {
    return LocalStorageFallback.getStaffUsers();
  });
  const [isStaffLoading, setIsStaffLoading] = useState<boolean>(true);

  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('connecting');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // In-memory / Cloud State (initialized from local storage cache for instant UI rendering)
  const [products, setProducts] = useState<Product[]>(() => LocalStorageFallback.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => LocalStorageFallback.getCategories());
  const [customers, setCustomers] = useState<Customer[]>(() => LocalStorageFallback.getCustomers());
  const [transactions, setTransactions] = useState<Transaction[]>(() => LocalStorageFallback.getTransactions());
  const [heldTickets, setHeldTickets] = useState<HeldTicket[]>(() => LocalStorageFallback.getHeldTickets());
  const [settings, setSettings] = useState<AppSettings>(() => LocalStorageFallback.getSettings());

  // Derived role flags
  const isMasterAdmin = currentUserProfile?.role === 'master_admin' || user?.email === 'vpsrush@gmail.com';
  const isAdmin = isMasterAdmin || currentUserProfile?.role === 'admin';
  const isCashier = currentUserProfile?.role === 'cashier';

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setSyncState('unauthenticated');
        setCurrentUserProfile(null);
        LocalStorageFallback.saveCurrentUserProfile(null);
      } else {
        setSyncState('connecting');
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Listeners (Attached when authenticated)
  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      setSyncState('unauthenticated');
      return;
    }

    setSyncState('syncing');
    let isInitialLoad = true;

    // 0. Users & Staff Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      async (snapshot) => {
        setIsStaffLoading(false);
        const cloudUsers: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          cloudUsers.push({
            ...(docSnap.data() as AppUser),
            uid: docSnap.id,
          });
        });
        setStaffUsers(cloudUsers);
        LocalStorageFallback.saveStaffUsers(cloudUsers);

        // Resolve current user profile
        if (user) {
          // If logged in via Google, enforce Master Admin email constraint
          if (user.providerData.some(p => p.providerId === 'google.com')) {
            if (user.email !== 'vpsrush@gmail.com') {
              console.warn('Unauthorized Google account login attempted:', user.email);
              await signOut(auth);
              setUser(null);
              setCurrentUserProfile(null);
              LocalStorageFallback.saveCurrentUserProfile(null);
              setSyncState('unauthenticated');
              setSyncErrorMessage('AKSES DITOLAK: Google account ini tidak didaftarkan sebagai Master Admin.');
              return;
            }
          }

          let matched = cloudUsers.find((u) => u.uid === user.uid);

          // If no doc in Firestore users collection yet (e.g. initial master owner login)
          if (!matched && user.email === 'vpsrush@gmail.com') {
            const newProfile: AppUser = {
              uid: user.uid,
              name: 'Khairul (Master Admin)',
              phone: '012-345 6789',
              loginId: 'khairul',
              email: user.email,
              role: 'master_admin',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'users', user.uid), newProfile);
              matched = newProfile;
            } catch (e) {
              console.error('Failed to create user profile doc', e);
            }
          }

          if (matched) {
            // If account is deactivated, force logout
            if (matched.status === 'inactive') {
              await signOut(auth);
              setUser(null);
              setCurrentUserProfile(null);
              LocalStorageFallback.saveCurrentUserProfile(null);
              setSyncState('unauthenticated');
              setSyncErrorMessage('Akaun anda telah dinyahaktifkan. Sila hubungi Master Admin.');
              return;
            }

            // Ensure role is accurate for the Master Admin
            if (user.email === 'vpsrush@gmail.com') {
              matched.role = 'master_admin';
            }

            setCurrentUserProfile(matched);
            LocalStorageFallback.saveCurrentUserProfile(matched);
          } else {
            // If authenticated but not in users list (unauthorized or deleted)
            await signOut(auth);
            setUser(null);
            setCurrentUserProfile(null);
            LocalStorageFallback.saveCurrentUserProfile(null);
            setSyncState('unauthenticated');
            setSyncErrorMessage('Akses ditolak. Rekod pengguna tidak ditemui.');
            return;
          }
        }
      },
      (error) => {
        console.error('Users listener error', error);
        setIsStaffLoading(false);
      }
    );

    // 1. Products Listener
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts: Product[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Product;
            cloudProducts.push({
              ...data,
              id: docSnap.id,
            });
          });
          cloudProducts.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
          setProducts(cloudProducts);
          LocalStorageFallback.saveProducts(cloudProducts);
        } else if (isInitialLoad) {
          // Firestore is empty, seed defaults
          seedFirestoreDefaultsInternal();
        }
        setLastSyncedAt(new Date());
        setSyncState('synced');
      },
      (error) => {
        console.error('Products listener error', error);
        setSyncState('error');
        setSyncErrorMessage('Ralat sambungan produk Firestore.');
        try {
          handleFirestoreError(error, OperationType.GET, 'products');
        } catch (e) {
          // Logged
        }
      }
    );

    // 2. Categories Listener
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudCategories: Category[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Category;
            cloudCategories.push({
              ...data,
              id: docSnap.id,
            });
          });
          cloudCategories.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
          setCategories(cloudCategories);
          LocalStorageFallback.saveCategories(cloudCategories);
        } else if (isInitialLoad) {
          seedCategoriesInternal();
        }
        setLastSyncedAt(new Date());
      },
      (error) => {
        console.error('Categories listener error', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'categories');
        } catch (e) {
          // Logged
        }
      }
    );

    // 3. Customers Listener
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudCustomers: Customer[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Customer;
            cloudCustomers.push({
              ...data,
              id: docSnap.id,
            });
          });
          setCustomers(cloudCustomers);
          LocalStorageFallback.saveCustomers(cloudCustomers);
        } else if (isInitialLoad) {
          seedCustomersInternal();
        }
        setLastSyncedAt(new Date());
      },
      (error) => {
        console.error('Customers listener error', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'customers');
        } catch (e) {
          // Logged
        }
      }
    );

    // 3. Transactions Listener
    const unsubTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const cloudTxs: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          cloudTxs.push(docSnap.data() as Transaction);
        });
        // Sort descending by timestamp
        cloudTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(cloudTxs);
        LocalStorageFallback.saveTransactions(cloudTxs);
        setLastSyncedAt(new Date());
      },
      (error) => {
        console.error('Transactions listener error', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'transactions');
        } catch (e) {
          // Logged
        }
      }
    );

    // 4. Held Tickets Listener
    const unsubHeldTickets = onSnapshot(
      collection(db, 'held_tickets'),
      (snapshot) => {
        const cloudTickets: HeldTicket[] = [];
        snapshot.forEach((docSnap) => {
          cloudTickets.push(docSnap.data() as HeldTicket);
        });
        cloudTickets.sort((a, b) => a.ticketNumber - b.ticketNumber);
        setHeldTickets(cloudTickets);
        LocalStorageFallback.saveHeldTickets(cloudTickets);
      },
      (error) => {
        console.error('Held tickets listener error', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'held_tickets');
        } catch (e) {
          // Logged
        }
      }
    );

    // 5. Store Settings Listener
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store_config'),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudSettings = docSnap.data() as AppSettings;
          setSettings(cloudSettings);
          LocalStorageFallback.saveSettings(cloudSettings);
        } else {
          // Seed settings to cloud
          setDoc(doc(db, 'settings', 'store_config'), DEFAULT_SETTINGS).catch(console.error);
        }
      },
      (error) => {
        console.error('Settings listener error', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'settings/store_config');
        } catch (e) {
          // Logged
        }
      }
    );

    isInitialLoad = false;

    return () => {
      unsubUsers();
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubTransactions();
      unsubHeldTickets();
      unsubSettings();
    };
  }, [isAuthReady, user]);

  // Self-healing approach removed. Staff creation and login are strictly managed by trusted firebase-admin on Node backend.

  // Internal helper to seed products
  const seedFirestoreDefaultsInternal = async () => {
    try {
      const batch = writeBatch(db);
      for (const prod of DEFAULT_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), prod);
      }
      await batch.commit();
      console.log('Seeded default products to Firestore');
    } catch (err) {
      console.warn('Could not seed default products', err);
    }
  };

  // Internal helper to seed categories
  const seedCategoriesInternal = async () => {
    try {
      const batch = writeBatch(db);
      for (const cat of DEFAULT_CATEGORY_ITEMS) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      await batch.commit();
      console.log('Seeded default categories to Firestore');
    } catch (err) {
      console.warn('Could not seed default categories', err);
    }
  };

  // Internal helper to seed customers
  const seedCustomersInternal = async () => {
    try {
      const batch = writeBatch(db);
      for (const cust of DEFAULT_CUSTOMERS) {
        batch.set(doc(db, 'customers', cust.id), cust);
      }
      await batch.commit();
      console.log('Seeded default customers to Firestore');
    } catch (err) {
      console.warn('Could not seed default customers', err);
    }
  };

  // Explicit Seed Function
  const seedFirestoreDefaults = useCallback(async () => {
    if (!user) return;
    setSyncState('syncing');
    try {
      const batch = writeBatch(db);
      for (const prod of DEFAULT_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), prod);
      }
      for (const cat of DEFAULT_CATEGORY_ITEMS) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      for (const cust of DEFAULT_CUSTOMERS) {
        batch.set(doc(db, 'customers', cust.id), cust);
      }
      batch.set(doc(db, 'settings', 'store_config'), DEFAULT_SETTINGS);
      await batch.commit();
      setSyncState('synced');
    } catch (error) {
      setSyncState('error');
      handleFirestoreError(error, OperationType.WRITE, 'batch/seed');
    }
  }, [user]);

  // Mutation: Save / Update Product
  const saveProduct = useCallback(async (product: Product) => {
    const prodId = product.id || `p_${Date.now()}`;
    
    // Determine sortOrder: if already present keep it; if new product without sortOrder, assign highest + 1
    let assignedSortOrder = product.sortOrder;
    if (assignedSortOrder === undefined) {
      const maxSort = products.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0);
      assignedSortOrder = maxSort + 1;
    }

    const cleanProduct: Product = { ...product, id: prodId, sortOrder: assignedSortOrder };

    // Optimistic local update
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prodId);
      const next = exists ? prev.map((p) => (p.id === prodId ? cleanProduct : p)) : [...prev, cleanProduct];
      next.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    if (user) {
      try {
        await setDoc(doc(db, 'products', prodId), sanitizeForFirestore(cleanProduct));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `products/${prodId}`);
      }
    }
  }, [user, products]);

  // Mutation: Reorder Products (atomic batch persist)
  const reorderProducts = useCallback(async (orderedProducts: Product[]) => {
    const updatedWithOrder = orderedProducts.map((prod, idx) => ({
      ...prod,
      sortOrder: idx + 1,
    }));

    setProducts(updatedWithOrder);
    LocalStorageFallback.saveProducts(updatedWithOrder);

    if (user) {
      try {
        const batch = writeBatch(db);
        updatedWithOrder.forEach((prod) => {
          batch.set(doc(db, 'products', prod.id), prod, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch/reorder-products');
      }
    }
  }, [user]);

  // Mutation: Save Category (Add or Update)
  const saveCategory = useCallback(async (cat: Partial<Category> & { name: string }): Promise<{ success: boolean; error?: string; category?: Category }> => {
    const trimmedName = cat.name ? cat.name.trim() : '';
    if (!trimmedName) {
      return { success: false, error: 'Nama kategori tidak boleh kosong.' };
    }

    const catId = cat.id || `cat_${Date.now()}`;

    // Duplicate validation (case-insensitive)
    const isDuplicate = categories.some((c) => c.id !== catId && c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      return { success: false, error: 'Kategori dengan nama ini sudah wujud.' };
    }

    // Determine sortOrder: lowest/bottom if new
    let assignedSortOrder = cat.sortOrder;
    if (assignedSortOrder === undefined) {
      const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0);
      assignedSortOrder = maxSort + 1;
    }

    const cleanCategory: Category = {
      id: catId,
      name: trimmedName,
      sortOrder: assignedSortOrder,
    };

    setCategories((prev) => {
      const exists = prev.some((c) => c.id === catId);
      const next = exists ? prev.map((c) => (c.id === catId ? cleanCategory : c)) : [...prev, cleanCategory];
      next.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
      LocalStorageFallback.saveCategories(next);
      return next;
    });

    if (user) {
      try {
        await setDoc(doc(db, 'categories', catId), cleanCategory);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
      }
    }

    return { success: true, category: cleanCategory };
  }, [user, categories]);

  // Mutation: Edit Category (Updates doc and cascades name to existing products)
  const editCategory = useCallback(async (categoryId: string, newName: string): Promise<{ success: boolean; error?: string; affectedProductsCount?: number }> => {
    const trimmedName = newName ? newName.trim() : '';
    if (!trimmedName) {
      return { success: false, error: 'Nama kategori tidak boleh kosong.' };
    }

    const existingCat = categories.find((c) => c.id === categoryId);
    if (!existingCat) {
      return { success: false, error: 'Kategori tidak dijumpai.' };
    }

    const isDuplicate = categories.some((c) => c.id !== categoryId && c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      return { success: false, error: 'Kategori dengan nama ini sudah wujud.' };
    }

    const oldName = existingCat.name;
    const updatedCategory: Category = {
      ...existingCat,
      name: trimmedName,
    };

    // Update categories state
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === categoryId ? updatedCategory : c));
      LocalStorageFallback.saveCategories(next);
      return next;
    });

    // Cascade update to products if name changed
    let affectedCount = 0;
    if (oldName !== trimmedName) {
      const updatedProducts = products.map((p) => {
        if (p.category === oldName) {
          affectedCount++;
          return { ...p, category: trimmedName };
        }
        return p;
      });

      if (affectedCount > 0) {
        setProducts(updatedProducts);
        LocalStorageFallback.saveProducts(updatedProducts);
      }
    }

    if (user) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', categoryId), updatedCategory);

        if (oldName !== trimmedName && affectedCount > 0) {
          products.forEach((p) => {
            if (p.category === oldName) {
              batch.update(doc(db, 'products', p.id), { category: trimmedName });
            }
          });
        }

        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `categories/${categoryId}`);
      }
    }

    return { success: true, affectedProductsCount: affectedCount };
  }, [user, categories, products]);

  // Mutation: Delete Category (Checked against product usage)
  const deleteCategory = useCallback(async (categoryId: string): Promise<{ success: boolean; error?: string; usedCount?: number }> => {
    const existingCat = categories.find((c) => c.id === categoryId);
    if (!existingCat) {
      return { success: false, error: 'Kategori tidak dijumpai.' };
    }

    // Safety check: is category used by any product?
    const usedProducts = products.filter((p) => p.category === existingCat.name);
    if (usedProducts.length > 0) {
      return {
        success: false,
        error: `Category ini sedang digunakan oleh ${usedProducts.length} produk.\nSila tukar category produk terlebih dahulu.`,
        usedCount: usedProducts.length,
      };
    }

    // Unused -> Proceed to delete without resetting other categories' sort order
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== categoryId);
      LocalStorageFallback.saveCategories(next);
      return next;
    });

    if (user) {
      try {
        await deleteDoc(doc(db, 'categories', categoryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
      }
    }

    return { success: true };
  }, [user, categories, products]);

  // Mutation: Reorder Categories (Category Objects)
  const reorderCategoriesList = useCallback(async (orderedCategories: Category[]) => {
    const updatedWithOrder = orderedCategories.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
    }));

    setCategories(updatedWithOrder);
    LocalStorageFallback.saveCategories(updatedWithOrder);

    const names = updatedWithOrder.map((c) => c.name);
    setSettings((prev) => {
      const next = { ...prev, categoryOrder: names };
      LocalStorageFallback.saveSettings(next);
      return next;
    });

    if (user) {
      try {
        const batch = writeBatch(db);
        updatedWithOrder.forEach((cat) => {
          batch.set(doc(db, 'categories', cat.id), cat);
        });
        batch.set(doc(db, 'settings', 'store_config'), { categoryOrder: names }, { merge: true });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch/reorder-categories');
      }
    }
  }, [user]);

  // Mutation: Reorder Categories (String Names)
  const reorderCategories = useCallback(async (orderedCategoryNames: string[]) => {
    const reordered: Category[] = [];
    const existingMap = new Map<string, Category>(categories.map((c) => [c.name, c]));

    orderedCategoryNames.forEach((name, idx) => {
      const existing = existingMap.get(name);
      if (existing) {
        reordered.push({ ...existing, sortOrder: idx + 1 });
        existingMap.delete(name);
      } else {
        reordered.push({ id: `cat_${Date.now()}_${idx}`, name, sortOrder: idx + 1 });
      }
    });

    existingMap.forEach((cat: Category) => {
      reordered.push({ ...cat, sortOrder: reordered.length + 1 });
    });

    await reorderCategoriesList(reordered);
  }, [categories, reorderCategoriesList]);

  // Mutation: Delete Product
  const deleteProduct = useCallback(async (productId: string) => {
    // Optimistic local update - keeps remaining products with their sort orders
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    if (user) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      }
    }
  }, [user]);

  // Mutation: Save / Update Customer
  const saveCustomer = useCallback(async (customer: Customer) => {
    const custId = customer.id || `c_${Date.now()}`;
    const cleanCustomer: Customer = { ...customer, id: custId };

    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === custId);
      const next = exists ? prev.map((c) => (c.id === custId ? cleanCustomer : c)) : [cleanCustomer, ...prev];
      LocalStorageFallback.saveCustomers(next);
      return next;
    });

    if (user) {
      try {
        await setDoc(doc(db, 'customers', custId), sanitizeForFirestore(cleanCustomer));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `customers/${custId}`);
      }
    }
  }, [user]);

  // Mutation: Delete Customer (Blocked for default customer)
  const deleteCustomer = useCallback(async (customerId: string): Promise<{ success: boolean; error?: string }> => {
    const cust = customers.find((c) => c.id === customerId);
    const isDefault = 
      customerId === 'c1' || 
      customerId === 'c_default' || 
      cust?.type === 'runcit' ||
      cust?.name.trim().toLowerCase() === 'runcit (pelanggan am)' ||
      cust?.name.trim().toLowerCase() === 'runcit';

    if (isDefault) {
      return {
        success: false,
        error: 'Runcit (Pelanggan Am) ialah pelanggan lalai dan tidak boleh dipadam.',
      };
    }

    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== customerId);
      LocalStorageFallback.saveCustomers(next);
      return next;
    });

    if (user) {
      try {
        await deleteDoc(doc(db, 'customers', customerId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}`);
      }
    }

    return { success: true };
  }, [user, customers]);

  // Mutation: Save Transaction (Completed Sale)
  const saveTransaction = useCallback(async (tx: Transaction) => {
    setTransactions((prev) => {
      const next = [tx, ...prev.filter((t) => t.id !== tx.id)];
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    if (user) {
      try {
        await setDoc(doc(db, 'transactions', tx.id), sanitizeForFirestore(tx));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.id}`);
      }
    }
  }, [user]);

  // Mutation: Void Transaction
  const voidTransaction = useCallback(async (txId: string, reason: string) => {
    let updatedTx: Transaction | null = null;
    setTransactions((prev) => {
      const next = prev.map((t) => {
        if (t.id === txId) {
          updatedTx = {
            ...t,
            status: 'voided',
            voidReason: reason,
            voidedAt: new Date().toISOString()
          };
          return updatedTx;
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    if (user && updatedTx) {
      try {
        await setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(updatedTx));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${txId}`);
      }
    }
  }, [user]);

  // Mutation: Update Transaction WhatsApp Delivery Status
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
          const nextTx: Transaction = {
            ...t,
            whatsappStatus: status,
            whatsappSent: status === 'sent',
            whatsappSentAt: status === 'sent' ? new Date().toISOString() : t.whatsappSentAt,
            whatsappPhone: phone || t.whatsappPhone,
          };
          if (error) {
            nextTx.whatsappError = error;
          } else {
            delete nextTx.whatsappError;
          }
          updatedTx = nextTx;
          return updatedTx;
        }
        return t;
      });
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    if (user && updatedTx) {
      try {
        await setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(updatedTx), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`);
      }
    }
  }, [user]);

  // Mutation: Save Held Tickets
  const saveHeldTickets = useCallback(async (tickets: HeldTicket[]) => {
    setHeldTickets(tickets);
    LocalStorageFallback.saveHeldTickets(tickets);

    if (user) {
      try {
        // Clear old held tickets and set current
        const currentHeldDocs = await getDocs(collection(db, 'held_tickets'));
        const batch = writeBatch(db);
        currentHeldDocs.forEach((d) => batch.delete(d.ref));
        for (const t of tickets) {
          batch.set(doc(db, 'held_tickets', t.id), sanitizeForFirestore(t));
        }
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'held_tickets');
      }
    }
  }, [user]);

  // Mutation: Save Global Settings
  const saveSettings = useCallback(async (newSettings: AppSettings): Promise<{ success: boolean; error?: string }> => {
    try {
      const companyName = newSettings.receiptConfig?.companyName;
      const syncedSettings: AppSettings = {
        ...newSettings,
        storeName: companyName && companyName.trim() ? companyName.trim() : newSettings.storeName,
      };

      setSettings(syncedSettings);
      LocalStorageFallback.saveSettings(syncedSettings);

      if (user) {
        await setDoc(
          doc(db, 'settings', 'store_config'), 
          sanitizeForFirestore(syncedSettings),
          { merge: true }
        );
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      handleFirestoreError(error, OperationType.WRITE, 'settings/store_config');
      return { success: false, error: error?.message || 'Gagal menyimpan tetapan ke Firebase.' };
    }
  }, [user]);

  // Mutation: Save Fonnte Device Token directly to Firestore with write confirmation
  const saveFonnteToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = token ? token.trim() : '';
    if (!trimmed) {
      return { success: false, error: 'Token Fonnte tidak boleh kosong.' };
    }

    try {
      const updatedSettings: AppSettings = {
        ...settings,
        fonnteToken: trimmed
      };
      setSettings(updatedSettings);
      LocalStorageFallback.saveSettings(updatedSettings);

      if (user) {
        await setDoc(
          doc(db, 'settings', 'store_config'),
          sanitizeForFirestore(updatedSettings),
          { merge: true }
        );
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to save Fonnte API Token to Firebase:', error);
      handleFirestoreError(error, OperationType.WRITE, 'settings/store_config');
      return { 
        success: false, 
        error: error?.message || 'Gagal menyimpan Token Fonnte ke Firebase.' 
      };
    }
  }, [user, settings]);

  // Invoice Number generator
  const getNextInvoiceNo = useCallback(() => {
    return LocalStorageFallback.getNextInvoiceNo();
  }, []);

  // Reset All Data
  const resetAllData = useCallback(async () => {
    LocalStorageFallback.resetAllData();
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORY_ITEMS);
    setCustomers(DEFAULT_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    setTransactions([]);
    setHeldTickets([]);

    if (user) {
      try {
        // Re-seed defaults to Firestore
        await seedFirestoreDefaults();
      } catch (e) {
        console.error('Reset error', e);
      }
    }
  }, [user, seedFirestoreDefaults]);

  // Auth: Login with Login ID and Password
  const loginWithLoginId = useCallback(async (loginId: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanLoginId = loginId.trim().toLowerCase();
      if (!cleanLoginId || !pass) {
        return { success: false, error: 'Sila masukkan Login ID dan kata laluan.' };
      }
      setSyncState('syncing');
      setSyncErrorMessage(null);
      const email = formatStaffEmail(cleanLoginId);

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const u = userCredential.user;

        // Fetch user profile from Firestore directly to check status & role (since staffUsers might not be populated yet if unauthenticated)
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as AppUser;
          if (profile.status === 'inactive') {
            await signOut(auth);
            setSyncState('unauthenticated');
            const msg = '⚠️ Akaun tidak aktif — Sila hubungi Admin.';
            setSyncErrorMessage(msg);
            return { success: false, error: msg };
          }
          setCurrentUserProfile(profile);
          LocalStorageFallback.saveCurrentUserProfile(profile);
          setSyncState('synced');
          setSyncErrorMessage(null);
          return { success: true };
        } else {
          await signOut(auth);
          setSyncState('unauthenticated');
          const msg = '⚠️ Log masuk tidak dapat diproses sekarang. Sila hubungi Admin.';
          setSyncErrorMessage(msg);
          return { success: false, error: msg };
        }
      } catch (authError: any) {
        console.warn('Firebase Auth login failure:', authError?.code);
        const code = authError?.code || '';
        let msg = '⚠️ Log masuk gagal — Login ID atau kata laluan tidak sah.';
        if (code === 'auth/operation-not-allowed') {
          msg = "Ralat: Penyedia log masuk 'Email/Password' belum diaktifkan di Firebase Console anda. Sila buka Firebase Console > Authentication > Sign-in method dan aktifkan 'Email/Password' agar Juruwang boleh mendaftar masuk.";
        } else if (code === 'auth/too-many-requests') {
          msg = 'Terlalu banyak cubaan gagal. Sila tunggu sebentar.';
        } else if (code === 'auth/internal-error' || code === 'auth/network-request-failed') {
          msg = '⚠️ Log masuk tidak dapat diproses sekarang. Sila hubungi Admin.';
        }
        setSyncState('unauthenticated');
        setSyncErrorMessage(msg);
        return { success: false, error: msg };
      }
    } catch (error: any) {
      console.error('Login error', error);
      setSyncState('unauthenticated');
      return { success: false, error: '⚠️ Log masuk tidak dapat diproses sekarang. Sila hubungi Admin.' };
    }
  }, []);

  // Staff Management: Create Admin / Cashier via Secure Client SDK
  const createStaffUser = useCallback(async (userData: {
    name: string;
    phone: string;
    loginId: string;
    password: string;
    role: 'admin' | 'cashier';
    status: 'active' | 'inactive';
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanLoginId = userData.loginId.trim().toLowerCase();
      if (!cleanLoginId) return { success: false, error: 'Login ID wajib diisi.' };
      if (!userData.name.trim()) return { success: false, error: 'Nama staf wajib diisi.' };
      if (!userData.phone.trim()) return { success: false, error: 'No. telefon wajib diisi.' };
      if (userData.password.length < 6) {
        return { success: false, error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' };
      }

      const email = `${cleanLoginId}@auth.freshmarket.my`;
      const uid = await createSecondaryAuthUser(email, userData.password);
      if (!uid) {
        return { success: false, error: 'Gagal mendaftar di Firebase Auth. Sila hubungi Admin.' };
      }

      const newStaff: AppUser = {
        uid,
        name: userData.name.trim(),
        phone: userData.phone.trim(),
        loginId: cleanLoginId,
        email,
        role: userData.role,
        status: userData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', uid), newStaff);
      return { success: true };
    } catch (err: any) {
      console.error('Create staff error', err);
      return { success: false, error: err?.message || 'Gagal mendaftar staf baharu.' };
    }
  }, []);

  // Staff Management: Update Staff details via Secure Client SDK
  const updateStaffUser = useCallback(async (
    userId: string,
    data: Partial<AppUser> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const targetUser = staffUsers.find((u) => u.uid === userId);
      if (!targetUser) return { success: false, error: 'Pengguna tidak ditemui.' };

      // Protection: Non-master cannot edit master admin
      if (targetUser.role === 'master_admin' && !isMasterAdmin) {
        return { success: false, error: 'Hanya Master Admin boleh mengubah akaun Master Admin.' };
      }

      const updatedFields: any = {
        updatedAt: new Date().toISOString()
      };
      if (data.name !== undefined) updatedFields.name = data.name.trim();
      if (data.phone !== undefined) updatedFields.phone = data.phone.trim();
      if (data.loginId !== undefined) {
        updatedFields.loginId = data.loginId.trim().toLowerCase();
        updatedFields.email = `${updatedFields.loginId}@auth.freshmarket.my`;
      }
      if (data.role !== undefined) updatedFields.role = data.role;
      if (data.status !== undefined) updatedFields.status = data.status;

      await setDoc(doc(db, 'users', userId), updatedFields, { merge: true });

      // If updating own password, do it via client-side Auth
      if (data.newPassword && user?.uid === userId) {
        await updatePassword(user, data.newPassword);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Update staff error', err);
      return { success: false, error: err?.message || 'Gagal mengemaskini maklumat staf.' };
    }
  }, [staffUsers, isMasterAdmin, user]);

  // Staff Management: Toggle Active / Inactive
  const toggleStaffStatus = useCallback(async (
    userId: string,
    currentStatus: UserStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUser = staffUsers.find((u) => u.uid === userId);
    if (!targetUser) return { success: false, error: 'Pengguna tidak ditemui.' };

    const newStatus: UserStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (targetUser.role === 'master_admin' && newStatus === 'inactive') {
      const activeMasters = staffUsers.filter((u) => u.role === 'master_admin' && u.status === 'active');
      if (activeMasters.length <= 1) {
        return { success: false, error: 'Master Admin terakhir tidak boleh dinyahaktifkan.' };
      }
    }

    return updateStaffUser(userId, { status: newStatus });
  }, [staffUsers, updateStaffUser]);

  // Staff Management: Delete Staff via Client SDK
  const deleteStaffUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const targetUser = staffUsers.find((u) => u.uid === userId);
    if (!targetUser) return { success: false, error: 'Pengguna tidak ditemui.' };

    if (targetUser.role === 'master_admin') {
      return { success: false, error: 'Master Admin tidak boleh dipadam melalui sistem!' };
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal memadam akaun staf.' };
    }
  }, [staffUsers]);

  // Auth: Google Login
  const loginWithGoogle = useCallback(async () => {
    try {
      setSyncState('syncing');
      setSyncErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
      setSyncErrorMessage(null);
    } catch (error: any) {
      const errorCode = error?.code || '';
      // Gracefully handle standard user cancellation / popup closed events without logging scary red errors
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/user-cancelled'
      ) {
        setSyncState('unauthenticated');
        setSyncErrorMessage(null); // Normal user cancellation, don't show scary error
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        setSyncState('unauthenticated');
        setSyncErrorMessage('Tetingkap log masuk disekat oleh pelayar (popup blocked). Sila benarkan popup untuk log masuk.');
        return;
      }

      console.error('Login error', error);
      setSyncState('unauthenticated');
      setSyncErrorMessage('Gagal log masuk Google. Sila cuba lagi.');
    }
  }, []);

  // Auth: Logout
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentUserProfile(null);
      LocalStorageFallback.saveCurrentUserProfile(null);
      setSyncState('unauthenticated');
      // Force reload to completely refresh the application state, clearing memory state/variables
      window.location.reload();
    } catch (error) {
      console.error('Logout error', error);
    }
  }, []);

  return (
    <FirebaseSyncContext.Provider
      value={{
        user,
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
        isCloudActive: !!user && syncState === 'synced',
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
        seedFirestoreDefaults,
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
    </FirebaseSyncContext.Provider>
  );
}

export function useFirebaseSync() {
  const context = useContext(FirebaseSyncContext);
  if (!context) {
    throw new Error('useFirebaseSync must be used within a FirebaseSyncProvider');
  }
  return context;
}
