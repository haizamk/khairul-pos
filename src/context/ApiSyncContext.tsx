import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
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
  Storage as LocalStorageFallback
} from '../utils/storage';

// Helper to convert POS loginId to internal deterministic Firebase Auth email
function getFirebaseEmailFromLoginId(loginId: string): string {
  const clean = loginId.trim().toLowerCase();
  return `${clean}@pos.freshmarket.my`;
}

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
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
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

  // Seed default master/admin user profile documents if Firestore users collection is empty (NO passwordHash)
  const seedDbDefaults = useCallback(async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        const defaultMaster: AppUser = {
          id: 'usr_master_khairul',
          uid: 'usr_master_khairul',
          loginId: 'khairul',
          name: 'Khairul (Master Admin)',
          phone: '012-345 6789',
          role: 'master_admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', 'usr_master_khairul'), sanitizeForFirestore(defaultMaster));

        const haizamUser: AppUser = {
          id: 'usr_admin_haizamk',
          uid: 'usr_admin_haizamk',
          loginId: 'haizamk',
          name: 'Haizam (Admin)',
          phone: '012-345 6789',
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', 'usr_admin_haizamk'), sanitizeForFirestore(haizamUser));
      }
    } catch (err) {
      console.warn('[Firestore] seedDbDefaults warning:', err);
    }
  }, []);

  // REAL FIREBASE AUTH STATE LISTENER (Single source of truth for authentication)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            const cleanLoginId = firebaseUser.email?.split('@')[0] || '';
            const newProfile: AppUser = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              loginId: cleanLoginId || 'staff',
              name: firebaseUser.displayName || (cleanLoginId === 'khairul' ? 'Khairul (Master Admin)' : cleanLoginId === 'haizamk' ? 'Haizam (Admin)' : 'Staf POS'),
              phone: '012-345 6789',
              role: cleanLoginId === 'khairul' ? 'master_admin' : cleanLoginId === 'haizamk' ? 'admin' : 'cashier',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, sanitizeForFirestore(newProfile));
            docSnap = await getDoc(userDocRef);
          }

          if (docSnap.exists()) {
            const fresh = docSnap.data() as AppUser;
            if (fresh.status === 'active') {
              const cleanUser: AppUser = {
                ...fresh,
                uid: firebaseUser.uid,
                id: firebaseUser.uid,
                loginId: fresh.loginId || (fresh as any).login_id || '',
              };
              setCurrentUserProfile(cleanUser);
              setSyncState('synced');
              setIsAuthReady(true);
              return;
            } else {
              console.warn('[Firebase Auth] User account is inactive in Firestore.');
              await signOut(auth);
              setCurrentUserProfile(null);
              setSyncState('unauthenticated');
              setIsAuthReady(true);
              return;
            }
          }
        } catch (err) {
          console.error('[Firebase Auth] Profile sync error:', err);
          setCurrentUserProfile(null);
          setSyncState('unauthenticated');
          setIsAuthReady(true);
        }
      } else {
        setCurrentUserProfile(null);
        setSyncState('unauthenticated');
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // REAL-TIME FIRESTORE MULTI-DEVICE LISTENERS (Active only when user is authenticated)
  useEffect(() => {
    if (!currentUserProfile) return;

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

    // 7. Listen to Staff Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!snapshot.empty) {
        const liveUsers = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            ...data,
            uid: docSnap.id || data.uid || data.id,
            id: docSnap.id || data.id || data.uid,
            loginId: data.loginId || data.login_id,
          } as AppUser;
        });
        setStaffUsers(liveUsers);
        LocalStorageFallback.saveStaffUsers(liveUsers);
      }
    }, (err) => console.warn('[Firestore] Users subscription:', err));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubTransactions();
      unsubHeldTickets();
      unsubSettings();
      unsubUsers();
    };
  }, [currentUserProfile]);

  // Login method via real Firebase Authentication
  const loginWithLoginId = useCallback(async (loginId: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState('syncing');
      setSyncErrorMessage(null);

      const cleanLoginId = loginId.trim().toLowerCase();
      if (!cleanLoginId || !pass) {
        setSyncState('unauthenticated');
        return { success: false, error: 'Sila masukkan Login ID dan kata laluan.' };
      }

      const email = getFirebaseEmailFromLoginId(cleanLoginId);

      try {
        // 1. Authenticate with Firebase Authentication SDK
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        const firebaseUid = userCred.user.uid;

        // 2. Read users/{firebaseUid} profile document
        const userDocRef = doc(db, 'users', firebaseUid);
        let userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // Migration check: If old document existed by loginId, migrate to users/{firebaseUid}
          const q = query(collection(db, 'users'), where('loginId', '==', cleanLoginId));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const oldData = qSnap.docs[0].data() as any;
            const migratedProfile: AppUser = {
              uid: firebaseUid,
              id: firebaseUid,
              loginId: cleanLoginId,
              name: oldData.name || cleanLoginId,
              phone: oldData.phone || '',
              role: oldData.role || 'cashier',
              status: oldData.status || 'active',
              createdAt: oldData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, sanitizeForFirestore(migratedProfile));
            userDocSnap = await getDoc(userDocRef);
          }
        }

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as AppUser;
          if (profile.status === 'inactive') {
            await signOut(auth);
            setSyncState('unauthenticated');
            const err = '⚠️ Akaun tidak aktif. Sila hubungi Admin.';
            setSyncErrorMessage(err);
            return { success: false, error: err };
          }

          const cleanUser: AppUser = {
            ...profile,
            uid: firebaseUid,
            id: firebaseUid,
          };
          setCurrentUserProfile(cleanUser);
          setSyncState('synced');
          setIsAuthReady(true);
          return { success: true };
        } else {
          await signOut(auth);
          setSyncState('unauthenticated');
          const err = '⚠️ Profil staf tidak dijumpai di Firestore.';
          setSyncErrorMessage(err);
          return { success: false, error: err };
        }
      } catch (authErr: any) {
        console.warn('[Firebase Auth] signIn error code:', authErr?.code, authErr?.message);

        setSyncState('unauthenticated');
        let msg = '⚠️ ID pengguna atau kata laluan tidak sah.';
        if (authErr?.code === 'auth/too-many-requests') {
          msg = '⚠️ Terlalu banyak percubaan gagal. Sila cuba sebentar lagi.';
        }
        setSyncErrorMessage(msg);
        return { success: false, error: msg };
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setSyncState('unauthenticated');
      const msg = err.message || '⚠️ Gagal log masuk.';
      setSyncErrorMessage(msg);
      return { success: false, error: msg };
    }
  }, []);

  // Logout method via Firebase Auth signOut
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Firebase Auth] signOut error:', err);
    }
    setCurrentUserProfile(null);
    setSyncState('unauthenticated');
  }, []);

  // Google Login for Master Admin / Store Owner
  const loginWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        const isMaster = user.email === 'vpsrush@gmail.com';
        const newProfile: AppUser = {
          uid: user.uid,
          id: user.uid,
          loginId: user.email?.split('@')[0] || 'google_user',
          name: user.displayName || 'Google User',
          phone: user.phoneNumber || '',
          role: isMaster ? 'master_admin' : 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, sanitizeForFirestore(newProfile));
      }
    } catch (err: any) {
      console.error('loginWithGoogle error:', err);
      throw err;
    }
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

    try {
      await setDoc(doc(db, 'products', prodId), sanitizeForFirestore(cleanProd), { merge: true });
      return { success: true, product: cleanProd };
    } catch (err: any) {
      console.error('saveProduct Firestore error:', err);
      return { success: false, error: err?.message || 'Ralat semasa menyimpan produk.' };
    }
  }, []);

  // Delete Product
  const deleteProduct = useCallback(async (productId: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      LocalStorageFallback.saveProducts(next);
      return next;
    });

    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      console.error('deleteProduct Firestore error:', err);
    }
  }, []);

  // Reorder Products
  const reorderProducts = useCallback(async (orderedProducts: Product[]) => {
    setProducts(orderedProducts);
    LocalStorageFallback.saveProducts(orderedProducts);

    try {
      for (let i = 0; i < orderedProducts.length; i++) {
        const item = { ...orderedProducts[i], sortOrder: i + 1 };
        await setDoc(doc(db, 'products', item.id), sanitizeForFirestore(item), { merge: true });
      }
    } catch (err) {
      console.error('reorderProducts error:', err);
    }
  }, []);

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
      await setDoc(doc(db, 'categories', catId), sanitizeForFirestore(cleanCat), { merge: true });
      return { success: true, category: cleanCat };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

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
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch {
      // Ignore
    }

    return { success: true };
  }, [categories, products]);

  // Reorder Categories List
  const reorderCategoriesList = useCallback(async (orderedCategories: Category[]) => {
    setCategories(orderedCategories);
    LocalStorageFallback.saveCategories(orderedCategories);

    try {
      for (let i = 0; i < orderedCategories.length; i++) {
        const item = { ...orderedCategories[i], sortOrder: i + 1 };
        await setDoc(doc(db, 'categories', item.id), sanitizeForFirestore(item), { merge: true });
      }
    } catch (err) {
      console.error('reorderCategoriesList error:', err);
    }
  }, []);

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
      await setDoc(doc(db, 'customers', custId), sanitizeForFirestore(cleanCust), { merge: true });
    } catch (err) {
      console.error('saveCustomer error:', err);
    }
  }, []);

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
      await deleteDoc(doc(db, 'customers', customerId));
    } catch {
      // Ignore
    }
    return { success: true };
  }, []);

  // Save Transaction
  const saveTransaction = useCallback(async (tx: Transaction) => {
    setTransactions((prev) => {
      const next = [tx, ...prev.filter((t) => t.id !== tx.id)];
      LocalStorageFallback.saveTransactions(next);
      return next;
    });

    try {
      await setDoc(doc(db, 'transactions', tx.id), sanitizeForFirestore(tx), { merge: true });
    } catch (err) {
      console.error('saveTransaction Firestore error:', err);
    }
  }, []);

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
      try {
        await setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(voidedTx), { merge: true });
      } catch (err) {
        console.error('voidTransaction Firestore error:', err);
      }
    }
  }, []);

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
      try {
        await setDoc(doc(db, 'transactions', txId), sanitizeForFirestore(updatedTx), { merge: true });
      } catch (err) {
        console.error('updateTransactionWhatsAppStatus Firestore error:', err);
      }
    }
  }, []);

  // Save Held Tickets
  const saveHeldTickets = useCallback(async (tickets: HeldTicket[]) => {
    setHeldTickets(tickets);
    LocalStorageFallback.saveHeldTickets(tickets);

    try {
      for (const t of tickets) {
        await setDoc(doc(db, 'held_tickets', t.id), sanitizeForFirestore(t), { merge: true });
      }
    } catch (err) {
      console.error('saveHeldTickets Firestore error:', err);
    }
  }, []);

  // Save Settings
  const saveSettings = useCallback(async (newSettings: AppSettings): Promise<{ success: boolean; error?: string }> => {
    setSettings(newSettings);
    LocalStorageFallback.saveSettings(newSettings);

    try {
      await setDoc(doc(db, 'settings', 'store_config'), sanitizeForFirestore(newSettings), { merge: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ralat sambungan ke pangkalan data.' };
    }
  }, []);

  // Save Fonnte Token
  const saveFonnteToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    const updated: AppSettings = { ...settings, fonnteToken: token.trim() };
    return saveSettings(updated);
  }, [settings, saveSettings]);

  // Invoice generator
  const getNextInvoiceNo = useCallback(() => {
    return LocalStorageFallback.getNextInvoiceNo();
  }, []);

  // Reset All Data
  const resetAllData = useCallback(async () => {
    LocalStorageFallback.resetAllData();
  }, []);

  // Staff Management: Create Staff User using secondary Firebase Auth instance
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
      if (!userData.name || !cleanLoginId || !userData.password || !userData.role) {
        return { success: false, error: 'Sila lengkapkan nama, login ID, kata laluan, dan peranan.' };
      }
      if (userData.password.length < 6) {
        return { success: false, error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' };
      }

      // Check existing in Firestore
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const exists = allUsersSnap.docs.some((d) => (d.data().loginId || d.data().login_id)?.toLowerCase() === cleanLoginId);
      if (exists) {
        return { success: false, error: `Login ID "${userData.loginId}" telah wujud.` };
      }

      const email = getFirebaseEmailFromLoginId(cleanLoginId);

      // Initialize secondary auth instance to create staff user without logging out active admin
      const appName = 'StaffCreatorApp';
      const secondaryApp = getApps().find((a) => a.name === appName) || initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      let newUid = '';
      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, userData.password);
        newUid = userCred.user.uid;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          return { success: false, error: `Login ID "${cleanLoginId}" telah terdaftar dalam Firebase Auth.` };
        }
        return { success: false, error: `Ralat Firebase Auth: ${authErr?.message || authErr}` };
      }

      const newStaff: AppUser = {
        id: newUid,
        uid: newUid,
        loginId: cleanLoginId,
        name: userData.name.trim(),
        phone: userData.phone?.trim() || '',
        role: userData.role,
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUid), sanitizeForFirestore(newStaff));
      return { success: true };
    } catch (err: any) {
      console.error('createStaffUser error:', err);
      return { success: false, error: err.message || 'Gagal mendaftar staf.' };
    }
  }, []);

  // Staff Management: Update Staff User
  const updateStaffUser = useCallback(async (
    userId: string,
    data: Partial<AppUser> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates: any = {
        updatedAt: new Date().toISOString(),
      };
      if (data.name) updates.name = data.name.trim();
      if (data.phone !== undefined) updates.phone = data.phone.trim();
      if (data.loginId) updates.loginId = data.loginId.trim().toLowerCase();
      if (data.role) updates.role = data.role;
      if (data.status) updates.status = data.status;

      await setDoc(doc(db, 'users', userId), sanitizeForFirestore(updates), { merge: true });

      if (data.newPassword && data.newPassword.trim().length >= 6) {
        console.warn('[Staff Management] Profile updated. Changing password requires staff login or Admin SDK reset.');
      }

      return { success: true };
    } catch (err: any) {
      console.error('updateStaffUser error:', err);
      return { success: false, error: err.message || 'Gagal mengemas kini staf.' };
    }
  }, []);

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
      await deleteDoc(doc(db, 'users', userId));
      return { success: true };
    } catch (err: any) {
      console.error('deleteStaffUser error:', err);
      return { success: false, error: err.message || 'Gagal memadam staf.' };
    }
  }, []);

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
