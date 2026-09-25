import React, { useState, useEffect } from 'react';
import { Product, Customer, AppSettings, UnitType, PaymentGatewayConfig, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/storage';
import { useApiSync } from '../context/ApiSyncContext';
import { StaffManagementTab } from './StaffManagementTab';
import { 
  Settings, 
  Lock, 
  Package, 
  Users, 
  CreditCard, 
  KeyRound, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  ArrowLeft,
  CheckCircle,
  Download,
  Upload,
  AlertTriangle,
  HelpCircle,
  Smartphone,
  Check,
  Copy,
  Monitor,
  Layers,
  X,
  Printer,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ListOrdered,
  ChevronDown,
  Search,
  Shield,
  MessageSquare,
  Eye,
  EyeOff,
  Wifi
} from 'lucide-react';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  settings: AppSettings;
  products: Product[];
  customers: Customer[];
  categoryOrder?: string[];
  onSaveSettings: (newSettings: AppSettings) => void;
  onSaveProducts?: (newProducts: Product[]) => void;
  onSaveProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onReorderProducts?: (orderedProducts: Product[]) => void;
  onReorderCategories?: (orderedCategories: string[]) => void;
  onSaveCustomers?: (newCustomers: Customer[]) => void;
  onSaveCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onResetAllData: () => void;
  onClose: () => void;
  initiallyAuthenticated?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  products,
  customers,
  categoryOrder,
  onSaveSettings,
  onSaveProducts,
  onSaveProduct,
  onDeleteProduct,
  onReorderProducts,
  onReorderCategories,
  onSaveCustomers,
  onSaveCustomer,
  onDeleteCustomer,
  onResetAllData,
  onClose,
  initiallyAuthenticated = false,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(initiallyAuthenticated);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Tab once unlocked
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'customers' | 'staff' | 'payments' | 'system' | 'install' | 'security'>('products');

  // Local editable states
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [localProducts, setLocalProducts] = useState<Product[]>(() => {
    return [...products].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  });
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[]>(() => {
    if (categoryOrder && categoryOrder.length > 0) return categoryOrder;
    if (settings.categoryOrder && settings.categoryOrder.length > 0) return settings.categoryOrder;
    return DEFAULT_CATEGORIES;
  });

  // Sub-tabs for Products view
  const [productSubTab, setProductSubTab] = useState<'list' | 'order_products' | 'order_categories'>('list');

  // Drag & drop state for products
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [dragOverProductIndex, setDragOverProductIndex] = useState<number | null>(null);

  // Drag & drop state for categories
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalProducts([...products].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)));
  }, [products]);

  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    setLocalSettings(settings);
    if (settings.categoryOrder && settings.categoryOrder.length > 0) {
      setLocalCategoryOrder(settings.categoryOrder);
    }
  }, [settings]);

  useEffect(() => {
    if (categoryOrder && categoryOrder.length > 0) {
      setLocalCategoryOrder(categoryOrder);
    }
  }, [categoryOrder]);

  // Product Reordering logic
  const moveProduct = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= localProducts.length || fromIdx === toIdx) return;
    sound.playKeyBeep(650, 0.04);
    const updated = [...localProducts];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    const withSortOrder = updated.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
    setLocalProducts(withSortOrder);
    if (onReorderProducts) {
      onReorderProducts(withSortOrder);
    } else if (onSaveProducts) {
      onSaveProducts(withSortOrder);
    }
  };

  const handleProductDragStart = (e: React.DragEvent, index: number) => {
    setDraggedProductIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleProductDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverProductIndex !== index) {
      setDragOverProductIndex(index);
    }
  };

  const handleProductDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedProductIndex !== null && draggedProductIndex !== targetIndex) {
      moveProduct(draggedProductIndex, targetIndex);
    }
    setDraggedProductIndex(null);
    setDragOverProductIndex(null);
  };

  const handleProductDragEnd = () => {
    setDraggedProductIndex(null);
    setDragOverProductIndex(null);
  };

  // Category Reordering logic
  const moveCategory = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= localCategoryOrder.length || fromIdx === toIdx) return;
    sound.playKeyBeep(650, 0.04);
    const updated = [...localCategoryOrder];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setLocalCategoryOrder(updated);
    if (onReorderCategories) {
      onReorderCategories(updated);
    }
  };

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryIndex !== index) {
      setDragOverCategoryIndex(index);
    }
  };

  const handleCategoryDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex !== null && draggedCategoryIndex !== targetIndex) {
      moveCategory(draggedCategoryIndex, targetIndex);
    }
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
  };

  // Product editing modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('9.60');
  const [prodUnit, setProdUnit] = useState<UnitType>('kg');
  const [prodCat, setProdCat] = useState('');
  const [prodCatError, setProdCatError] = useState<string | null>(null);

  // In-app Delete Product Confirmation state (replaces window.confirm)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Customer editing modal state
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custType, setCustType] = useState<Customer['type']>('tetap');
  const [custDiscount, setCustDiscount] = useState('0');
  const [custFormError, setCustFormError] = useState<string | null>(null);

  // In-app Delete Customer Confirmation & Safety Blocker state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerBlockedDelete, setCustomerBlockedDelete] = useState<Customer | null>(null);

  // Category Management State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addCatError, setAddCatError] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatError, setEditCatError] = useState<string | null>(null);

  // In-app Delete Category State (with safety blocker)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryBlockedDelete, setCategoryBlockedDelete] = useState<{
    category: Category;
    usedProducts: Product[];
  } | null>(null);

  // In-app Factory Reset Confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Admin PIN change state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');

  // Own Password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const handleUpdateOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);

    if (!currentPasswordInput) {
      setPasswordChangeError('Sila masukkan kata laluan semasa.');
      sound.playVoidBeep();
      return;
    }
    if (newPasswordInput.length < 6) {
      setPasswordChangeError('Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.');
      sound.playVoidBeep();
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('Sahkan kata laluan baharu tidak sepadan.');
      sound.playVoidBeep();
      return;
    }

    setPasswordChangeLoading(true);

    try {
      if (!currentUserProfile?.uid && !(currentUserProfile as any)?.id) {
        throw new Error('Sesi tidak aktif atau tiada pengguna log masuk.');
      }

      const activeUserId = currentUserProfile.uid || (currentUserProfile as any).id;
      const res = await updateStaffUser(activeUserId, { newPassword: newPasswordInput });

      if (res.success) {
        setPasswordChangeSuccess(true);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        sound.playOkBeep();
      } else {
        throw new Error(res.error || 'Gagal menukar kata laluan.');
      }
    } catch (err: any) {
      console.error('Password change failed:', err);
      setPasswordChangeError(err?.message || 'Gagal menukar kata laluan.');
      sound.playVoidBeep();
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Fonnte WhatsApp Token state
  const [fonnteTokenInput, setFonnteTokenInput] = useState(settings.fonnteToken || '');
  const [showFonnteTokenPassword, setShowFonnteTokenPassword] = useState(false);
  const [isSavingFonnteToken, setIsSavingFonnteToken] = useState(false);
  const [fonnteSaveSuccess, setFonnteSaveSuccess] = useState(false);
  const [fonnteSaveError, setFonnteSaveError] = useState<string | null>(null);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);
  const [fonnteTestResult, setFonnteTestResult] = useState<{
    success: boolean;
    message: string;
    device?: string;
  } | null>(null);

  useEffect(() => {
    if (settings.fonnteToken !== undefined) {
      setFonnteTokenInput(settings.fonnteToken || '');
    }
  }, [settings.fonnteToken]);

  // Copy URL state for Install Guide
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Real-time Cloud Sync integration
  const { 
    user, 
    currentUserProfile,
    isMasterAdmin,
    isAdmin,
    staffUsers,
    syncState, 
    syncErrorMessage,
    loginWithGoogle, 
    logout, 
    seedDbDefaults, 
    lastSyncedAt,
    categories,
    saveCategory,
    editCategory,
    deleteCategory,
    reorderCategoriesList,
    saveFonnteToken,
    updateStaffUser
  } = useApiSync();

  useEffect(() => {
    if (
      initiallyAuthenticated ||
      isMasterAdmin ||
      isAdmin ||
      currentUserProfile?.role === 'master_admin' ||
      currentUserProfile?.role === 'admin' ||
      Boolean(user)
    ) {
      setIsAuthenticated(true);
    }
  }, [initiallyAuthenticated, isMasterAdmin, isAdmin, currentUserProfile, user]);

  const handleSaveFonnteTokenAction = async () => {
    const trimmed = fonnteTokenInput.trim();
    if (!trimmed) {
      setFonnteSaveError('Sila masukkan Token Fonnte terlebih dahulu.');
      sound.playVoidBeep();
      return;
    }

    setIsSavingFonnteToken(true);
    setFonnteSaveError(null);
    setFonnteSaveSuccess(false);

    try {
      const res = await saveFonnteToken(trimmed);
      if (res.success) {
        setFonnteSaveSuccess(true);
        sound.playOkBeep();
        setTimeout(() => setFonnteSaveSuccess(false), 4000);
      } else {
        setFonnteSaveError(res.error || 'Gagal menyimpan Token Fonnte ke pangkalan data.');
        sound.playVoidBeep();
      }
    } catch (err: any) {
      console.error('Error saving Fonnte token:', err);
      setFonnteSaveError(err?.message || 'Ralat pelayan semasa menyimpan token.');
      sound.playVoidBeep();
    } finally {
      setIsSavingFonnteToken(false);
    }
  };

  const handleTestFonnteConnectionAction = async () => {
    const tokenToTest = fonnteTokenInput.trim() || settings.fonnteToken?.trim();
    if (!tokenToTest) {
      setFonnteTestResult({
        success: false,
        message: 'Sila masukkan Token Fonnte sebelum menguji sambungan.'
      });
      sound.playVoidBeep();
      return;
    }

    setIsTestingFonnte(true);
    setFonnteTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/test-fonnte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToTest })
      });
      const data = await res.json();
      if (data.success && data.connected) {
        setFonnteTestResult({
          success: true,
          message: data.message || 'Sambungan Fonnte berjaya! Peranti WhatsApp aktif.',
          device: data.device
        });
        sound.playOkBeep();
      } else {
        setFonnteTestResult({
          success: false,
          message: data.message || 'Sambungan Fonnte gagal. Sila semak semula token peranti.'
        });
        sound.playVoidBeep();
      }
    } catch (err: any) {
      console.error('Test Fonnte connection error:', err);
      setFonnteTestResult({
        success: false,
        message: err?.message || 'Ralat semasa menghubungi pelayan ujian Fonnte.'
      });
      sound.playVoidBeep();
    } finally {
      setIsTestingFonnte(false);
    }
  };
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    setSeedStatus('Menyegerakkan data ke pangkalan data MySQL...');
    try {
      await seedDbDefaults();
      setSeedStatus('Berjaya disegerakkan ke pangkalan data MySQL!');
      sound.playOkBeep();
    } catch (err) {
      setSeedStatus('Ralat semasa menyegerak data.');
      sound.playVoidBeep();
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedStatus(null), 4000);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = localSettings.adminPin || '1234';
    if (pinInput === currentPin) {
      sound.playOkBeep();
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      sound.playVoidBeep();
      setPinError(true);
    }
  };

  // --- PRODUCT HANDLERS ---
  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    setProdCatError(null);
    if (!prodName.trim()) return;

    const trimmedCat = prodCat ? prodCat.trim() : '';
    if (!trimmedCat) {
      setProdCatError('Sila pilih kategori.');
      sound.playVoidBeep();
      return;
    }

    sound.playKeyBeep(700, 0.05);

    const priceNum = parseFloat(prodPrice) || 0;

    if (editingProduct) {
      const updatedProduct: Product = {
        ...editingProduct,
        name: prodName.trim(),
        defaultPrice: priceNum,
        defaultUnit: prodUnit,
        category: trimmedCat,
      };
      const updated = localProducts.map((p) =>
        p.id === editingProduct.id ? updatedProduct : p
      );
      setLocalProducts(updated);
      if (onSaveProduct) {
        onSaveProduct(updatedProduct);
      } else if (onSaveProducts) {
        onSaveProducts(updated);
      }
    } else {
      const maxOrder = localProducts.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0);
      const newP: Product = {
        id: `p_${Date.now()}`,
        name: prodName.trim(),
        defaultPrice: priceNum,
        defaultUnit: prodUnit,
        category: trimmedCat,
        sortOrder: maxOrder + 1,
      };
      const updated = [...localProducts, newP];
      setLocalProducts(updated);
      if (onSaveProduct) {
        onSaveProduct(newP);
      } else if (onSaveProducts) {
        onSaveProducts(updated);
      }
    }

    setEditingProduct(null);
    setIsAddingProduct(false);
    setProdName('');
    setProdCat('');
    setProdCatError(null);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice('9.60');
    setProdUnit('kg');
    setProdCat('');
    setProdCatError(null);
    setIsAddingProduct(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.defaultPrice.toFixed(2));
    setProdUnit(p.defaultUnit);
    setProdCat(p.category || '');
    setProdCatError(null);
    setIsAddingProduct(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    sound.playVoidBeep();
    const idToDelete = productToDelete.id;
    const updated = localProducts.filter((p) => p.id !== idToDelete);
    setLocalProducts(updated);
    if (onDeleteProduct) {
      onDeleteProduct(idToDelete);
    }
    setProductToDelete(null);
  };

  // Helper: check if a customer is default Runcit
  const isDefaultCustomer = (c: Customer) => {
    return (
      c.id === 'c1' ||
      c.id === 'c_default' ||
      c.type === 'runcit' ||
      c.name.trim().toLowerCase() === 'runcit (pelanggan am)' ||
      c.name.trim().toLowerCase() === 'runcit'
    );
  };

  // --- CUSTOMER HANDLERS ---
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustType('tetap');
    setCustDiscount('0');
    setCustFormError(null);
    setIsAddingCustomer(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone || '');
    setCustType(c.type || 'tetap');
    setCustDiscount(c.discountPercent ? String(c.discountPercent) : '0');
    setCustFormError(null);
    setIsAddingCustomer(true);
  };

  const handleOpenDeleteCustomer = (c: Customer) => {
    if (isDefaultCustomer(c)) {
      sound.playVoidBeep();
      setCustomerBlockedDelete(c);
      return;
    }
    sound.playKeyBeep(450, 0.04);
    setCustomerToDelete(c);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    setCustFormError(null);

    const trimmedName = custName.trim();
    if (!trimmedName) {
      setCustFormError('Sila masukkan nama pelanggan.');
      sound.playVoidBeep();
      return;
    }

    // Check duplicate customer name (case-insensitive)
    const duplicate = localCustomers.find(
      (c) =>
        c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (!editingCustomer || c.id !== editingCustomer.id)
    );
    if (duplicate) {
      setCustFormError(`Pelanggan dengan nama "${trimmedName}" sudah wujud.`);
      sound.playVoidBeep();
      return;
    }

    sound.playKeyBeep(700, 0.05);

    const discountNum = parseFloat(custDiscount) || 0;
    const trimmedPhone = custPhone.trim() || undefined;

    if (editingCustomer) {
      const updatedCustomer: Customer = {
        ...editingCustomer,
        name: trimmedName,
        phone: trimmedPhone,
        type: custType,
        discountPercent: discountNum,
      };
      const updated = localCustomers.map((c) =>
        c.id === editingCustomer.id ? updatedCustomer : c
      );
      setLocalCustomers(updated);
      if (onSaveCustomer) {
        onSaveCustomer(updatedCustomer);
      } else if (onSaveCustomers) {
        onSaveCustomers(updated);
      }
    } else {
      const newCust: Customer = {
        id: `c_${Date.now()}`,
        name: trimmedName,
        phone: trimmedPhone,
        type: custType,
        discountPercent: discountNum,
      };
      const updated = [...localCustomers, newCust];
      setLocalCustomers(updated);
      if (onSaveCustomer) {
        onSaveCustomer(newCust);
      } else if (onSaveCustomers) {
        onSaveCustomers(updated);
      }
    }

    setEditingCustomer(null);
    setIsAddingCustomer(false);
    setCustName('');
    setCustPhone('');
    setCustType('tetap');
    setCustDiscount('0');
    setCustFormError(null);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!customerToDelete) return;
    if (isDefaultCustomer(customerToDelete)) {
      setCustomerToDelete(null);
      setCustomerBlockedDelete(customerToDelete);
      return;
    }
    sound.playVoidBeep();
    const idToDelete = customerToDelete.id;
    const updated = localCustomers.filter((c) => c.id !== idToDelete);
    setLocalCustomers(updated);
    if (onDeleteCustomer) {
      onDeleteCustomer(idToDelete);
    } else if (onSaveCustomers) {
      onSaveCustomers(updated);
    }
    setCustomerToDelete(null);
  };

  // --- CATEGORY HANDLERS ---
  const handleOpenAddCategory = () => {
    setNewCatName('');
    setAddCatError(null);
    setIsAddingCategory(true);
  };

  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCatError(null);
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setAddCatError('Nama category tidak boleh kosong.');
      sound.playVoidBeep();
      return;
    }
    const result = await saveCategory({ name: trimmed });
    if (!result.success) {
      setAddCatError(result.error || 'Gagal menambah category.');
      sound.playVoidBeep();
      return;
    }
    sound.playOkBeep();
    setIsAddingCategory(false);
    setNewCatName('');
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatError(null);
  };

  const handleSaveEditCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setEditCatError(null);
    const trimmed = editCatName.trim();
    if (!trimmed) {
      setEditCatError('Nama category tidak boleh kosong.');
      sound.playVoidBeep();
      return;
    }
    const result = await editCategory(editingCategory.id, trimmed);
    if (!result.success) {
      setEditCatError(result.error || 'Gagal mengemaskini category.');
      sound.playVoidBeep();
      return;
    }
    sound.playOkBeep();
    setEditingCategory(null);
    setEditCatName('');
  };

  const handleOpenDeleteCategory = (cat: Category) => {
    const matchingProducts = localProducts.filter(
      (p) => (p.category || '').trim().toLowerCase() === cat.name.trim().toLowerCase()
    );
    if (matchingProducts.length > 0) {
      // Scenario A: Sedang digunakan -> SEKAT DELETE
      sound.playVoidBeep();
      setCategoryBlockedDelete({ category: cat, usedProducts: matchingProducts });
    } else {
      // Scenario B: 0 produk -> Tunjukkan confirmation
      sound.playKeyBeep(500, 0.04);
      setCategoryToDelete(cat);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    sound.playVoidBeep();
    const result = await deleteCategory(categoryToDelete.id);
    if (result.success) {
      sound.playOkBeep();
      setCategoryToDelete(null);
    } else {
      sound.playVoidBeep();
      alert(result.error || 'Gagal memadam category.');
    }
  };

  const moveCategoryItem = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= categories.length || fromIdx === toIdx) return;
    sound.playKeyBeep(650, 0.04);
    const updated = [...categories];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    await reorderCategoriesList(updated);
    if (onReorderCategories) {
      onReorderCategories(updated.map((c) => c.name));
    }
  };

  // --- SYSTEM & PIN HANDLERS ---
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    if (newPin.length < 4) {
      setPinChangeError('PIN mestilah sekurang-kurangnya 4 angka.');
      sound.playVoidBeep();
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('Pengesahan PIN tidak sepadan!');
      sound.playVoidBeep();
      return;
    }
    const updated = { ...localSettings, adminPin: newPin };
    setLocalSettings(updated);
    onSaveSettings(updated);
    setPinChangeSuccess(true);
    sound.playOkBeep();
    setTimeout(() => setPinChangeSuccess(false), 3000);
    setNewPin('');
    setConfirmPin('');
  };

  const handleToggleSound = () => {
    const updated = { ...localSettings, soundEnabled: !localSettings.soundEnabled };
    setLocalSettings(updated);
    sound.setEnabled(updated.soundEnabled);
    onSaveSettings(updated);
  };

  const handleTogglePrintSound = () => {
    const nextVal = !(localSettings.printSoundEnabled ?? true);
    const updated: AppSettings = { ...localSettings, printSoundEnabled: nextVal };
    setLocalSettings(updated);
    sound.setPrintSoundEnabled(nextVal);
    if (nextVal) {
      sound.playPrintBeep(true);
    }
    onSaveSettings(updated);
  };

  const handleSavePaymentGateway = (field: keyof PaymentGatewayConfig, value: any) => {
    const updated: AppSettings = {
      ...localSettings,
      paymentConfig: {
        ...localSettings.paymentConfig,
        [field]: value,
      },
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  // Import JSON status
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExportData = () => {
    const data = {
      settings: localSettings,
      products: localProducts,
      customers: localCustomers,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khairul_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.products && Array.isArray(parsed.products)) {
          setLocalProducts(parsed.products);
          onSaveProducts(parsed.products);
        }
        if (parsed.customers && Array.isArray(parsed.customers)) {
          setLocalCustomers(parsed.customers);
          onSaveCustomers(parsed.customers);
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          setLocalSettings(parsed.settings);
          onSaveSettings(parsed.settings);
        }
        sound.playOkBeep();
        setImportStatus('Data berjaya diimport dan dikemaskini!');
        setTimeout(() => setImportStatus(''), 4000);
      } catch (err) {
        sound.playVoidBeep();
        setImportStatus('Gagal membaca fail JSON! Pastikan format sah.');
        setTimeout(() => setImportStatus(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteFactoryReset = () => {
    sound.playVoidBeep();
    onResetAllData();
    setShowResetConfirm(false);
    window.location.reload();
  };

  const handleCopyAppUrl = () => {
    sound.playKeyBeep(700, 0.04);
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
            TETAPAN SISTEM POS
          </h1>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={async () => {
                  sound.playVoidBeep();
                  await logout();
                  onClose();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-extrabold rounded-xl text-white border border-rose-400/50 cursor-pointer transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Log Keluar daripada akaun POS"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Keluar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl text-slate-300 border border-slate-700/60 cursor-pointer transition"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* Screen 1: Admin PIN Authentication */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-slate-950/50">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-base font-extrabold uppercase text-slate-100 tracking-wide">
            PENGESAHAN ADMIN PIN
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Sila masukkan 4 digit Admin PIN untuk mengubah tetapan produk, pelanggan, harga, dan sistem.
          </p>

          <form onSubmit={handleVerifyPin} className="w-full max-w-xs space-y-3 mt-6">
            <input
              id="admin-pin-input"
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Default: 1234"
              className="w-full bg-slate-950 text-center text-3xl font-mono font-bold tracking-widest text-emerald-400 rounded-2xl p-3.5 border-2 border-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-bold animate-shake">
                PIN Salah! Sila cuba lagi. (Default: 1234)
              </p>
            )}

            <button
              id="submit-admin-pin-btn"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/70 active:scale-98"
            >
              Buka Tetapan
            </button>
          </form>
        </div>
      ) : (
        /* Screen 2: Authenticated Settings Dashboard */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/80 text-xs font-bold overflow-x-auto">
            <button
              id="tab-btn-products"
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'products'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Produk ({localProducts.length})</span>
            </button>

            <button
              id="tab-btn-categories"
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              id="tab-btn-customers"
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'customers'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pelanggan ({localCustomers.length})</span>
            </button>

            <button
              id="tab-btn-staff"
              onClick={() => setActiveTab('staff')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Pengurusan Staf ({staffUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Bayaran & NFC</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'system'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sistem & PIN</span>
            </button>

            <button
              id="tab-btn-security"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'security'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Keselamatan & Profil</span>
            </button>

            <button
              onClick={() => setActiveTab('install')}
              className={`flex-1 py-3 px-3 text-center transition cursor-pointer border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'install'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cara Pasang App</span>
            </button>
          </div>

          {/* TAB 1: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
              {/* Product Sub-Navigation Controls */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl">
                <button
                  id="subtab-product-list"
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(500, 0.03);
                    setProductSubTab('list');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    productSubTab === 'list'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Senarai & Edit</span>
                </button>

                <button
                  id="subtab-product-order"
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(500, 0.03);
                    setProductSubTab('order_products');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    productSubTab === 'order_products'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Susunan Produk</span>
                </button>

                <button
                  id="subtab-category-order"
                  type="button"
                  onClick={() => {
                    sound.playKeyBeep(500, 0.03);
                    setProductSubTab('order_categories');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    productSubTab === 'order_categories'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Susunan Category</span>
                </button>
              </div>

              {/* SUB-VIEW 1: SENARAI & EDIT PRODUK */}
              {productSubTab === 'list' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-extrabold uppercase text-slate-200">
                        Senarai Produk & Harga Standard
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Kategori & unit automatik untuk memudahkan staf menimbang di POS.
                      </p>
                    </div>

                    <button
                      id="add-new-product-btn"
                      onClick={handleOpenAddProduct}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Produk</span>
                    </button>
                  </div>

                  {/* Products Table/List */}
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40">
                    {localProducts.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-800/60 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/90 border border-slate-700/60 w-6 h-6 rounded-lg flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-100">{p.name}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              RM{p.defaultPrice.toFixed(2)} / {p.defaultUnit}
                              {p.category && (
                                <span className="ml-2 text-[10px] bg-slate-700/80 px-2 py-0.5 rounded-full text-slate-300 border border-slate-600/50">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition cursor-pointer border border-slate-700/60 active:scale-95"
                            title="Edit Produk"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              sound.playKeyBeep(450, 0.04);
                              setProductToDelete(p);
                            }}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer border border-rose-500/20 active:scale-95"
                            title="Padam Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: SUSUNAN PRODUK (DRAG & DROP + TOUCH) */}
              {productSubTab === 'order_products' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-start gap-2.5">
                    <ListOrdered className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300">
                      <span className="font-bold text-emerald-300">SUSUNAN PRODUK POS: </span>
                      Tarik baris menggunakan ikon <span className="font-mono text-emerald-400 font-bold">☰</span> atau tekan butang <span className="font-bold text-white">▲ / ▼</span> untuk mengubah susunan. Kedudukan ini akan disimpan terus ke pangkalan data MySQL.
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40 select-none">
                    {localProducts.map((p, idx) => {
                      const isDragging = draggedProductIndex === idx;
                      const isDragOver = dragOverProductIndex === idx && !isDragging;

                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleProductDragStart(e, idx)}
                          onDragOver={(e) => handleProductDragOver(e, idx)}
                          onDrop={(e) => handleProductDrop(e, idx)}
                          onDragEnd={handleProductDragEnd}
                          className={`p-3 flex items-center justify-between transition-all duration-150 ${
                            isDragging
                              ? 'opacity-40 bg-slate-900 border-2 border-dashed border-emerald-500/60 scale-[0.98]'
                              : isDragOver
                              ? 'bg-emerald-950/40 border-t-2 border-emerald-400'
                              : 'hover:bg-slate-800/60'
                          }`}
                        >
                          {/* Drag handle + Position + Title */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div 
                              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-100 cursor-grab active:cursor-grabbing border border-slate-700/60 shrink-0 touch-none"
                              title="Tarik untuk susun"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <span className="text-xs font-mono font-extrabold text-emerald-400 bg-slate-900/90 border border-emerald-500/30 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>

                            <div className="truncate pr-2">
                              <div className="font-bold text-sm text-slate-100 truncate">{p.name}</div>
                              <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                <span>RM{p.defaultPrice.toFixed(2)} / {p.defaultUnit}</span>
                                {p.category && (
                                  <span className="text-[10px] bg-slate-700/80 px-2 py-0.2 rounded-full text-slate-300 border border-slate-600/50">
                                    {p.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Touch Up / Down Move Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveProduct(idx, idx - 1)}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                                idx === 0
                                  ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                              }`}
                              title="Pindah Naik"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              disabled={idx === localProducts.length - 1}
                              onClick={() => moveProduct(idx, idx + 1)}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                                idx === localProducts.length - 1
                                  ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                              }`}
                              title="Pindah Turun"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            {/* Quick Top Button */}
                            {idx > 1 && (
                              <button
                                type="button"
                                onClick={() => moveProduct(idx, 0)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 border border-slate-700/60 cursor-pointer"
                                title="Pindah Paling Atas"
                              >
                                TOP
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: SUSUNAN CATEGORY (DRAG & DROP + TOUCH) */}
              {productSubTab === 'order_categories' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        <span className="font-bold text-emerald-300">SUSUNAN CATEGORY POS: </span>
                        Susun turutan butang kategori di atas senarai produk POS. Tarik baris menggunakan ikon <span className="font-mono text-emerald-400 font-bold">☰</span> atau tekan butang <span className="font-bold text-white">▲ / ▼</span>.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 shrink-0 transition active:scale-95 shadow cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40 select-none">
                    {categories.map((cat, idx) => {
                      const isDragging = draggedCategoryIndex === idx;
                      const isDragOver = dragOverCategoryIndex === idx && !isDragging;
                      const count = localProducts.filter(
                        (p) => (p.category || '').trim().toLowerCase() === cat.name.trim().toLowerCase()
                      ).length;

                      return (
                        <div
                          key={cat.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedCategoryIndex(idx);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', idx.toString());
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverCategoryIndex !== idx) setDragOverCategoryIndex(idx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedCategoryIndex !== null && draggedCategoryIndex !== idx) {
                              moveCategoryItem(draggedCategoryIndex, idx);
                            }
                            setDraggedCategoryIndex(null);
                            setDragOverCategoryIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedCategoryIndex(null);
                            setDragOverCategoryIndex(null);
                          }}
                          className={`p-3.5 flex items-center justify-between transition-all duration-150 ${
                            isDragging
                              ? 'opacity-40 bg-slate-900 border-2 border-dashed border-emerald-500/60 scale-[0.98]'
                              : isDragOver
                              ? 'bg-emerald-950/40 border-t-2 border-emerald-400'
                              : 'hover:bg-slate-800/60'
                          }`}
                        >
                          {/* Drag handle + Position + Category Name */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div 
                              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-100 cursor-grab active:cursor-grabbing border border-slate-700/60 shrink-0 touch-none"
                              title="Tarik untuk susun"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <span className="text-xs font-mono font-extrabold text-emerald-400 bg-slate-900/90 border border-emerald-500/30 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>

                            <div className="min-w-0 flex-1 pr-2">
                              <div className="font-bold text-sm text-slate-100 truncate">{cat.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                <span className={`px-2 py-0.2 rounded-full font-medium ${
                                  count === 0 
                                    ? 'bg-slate-700/60 text-slate-300' 
                                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                }`}>
                                  {count} produk
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Move Up / Down & Edit/Delete Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveCategoryItem(idx, idx - 1)}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                                idx === 0
                                  ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                              }`}
                              title="Pindah Naik"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              disabled={idx === categories.length - 1}
                              onClick={() => moveCategoryItem(idx, idx + 1)}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                                idx === categories.length - 1
                                  ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                              }`}
                              title="Pindah Turun"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition cursor-pointer active:scale-95"
                              title="Edit Kategori"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteCategory(cat)}
                              className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                                count > 0
                                  ? 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-rose-400'
                                  : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 border-rose-500/30'
                              }`}
                              title={count > 0 ? 'Kategori digunakan (Tidak boleh padam)' : 'Padam Kategori'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CATEGORIES (SETTINGS -> CATEGORIES) */}
          {activeTab === 'categories' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-slate-200 flex items-center gap-2">
                    <span>Pengurusan Kategori</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {categories.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tambah, edit, padam, dan susun urutan kategori produk POS.
                  </p>
                </div>

                <button
                  id="btn-add-category"
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/60 active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Category</span>
                </button>
              </div>

              {/* Instructions banner */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-emerald-300">INFO KATEGORI POS: </span>
                  Susunan kategori di sini menentukan susunan tab kategori pada skrin utama POS. Tarik baris menggunakan ikon <span className="font-mono text-emerald-400 font-bold">☰</span> atau tekan butang <span className="font-bold text-white">▲ / ▼</span>.
                </div>
              </div>

              {/* Category list */}
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40 select-none">
                {categories.map((cat, idx) => {
                  const count = localProducts.filter(
                    (p) => (p.category || '').trim().toLowerCase() === cat.name.trim().toLowerCase()
                  ).length;
                  const isDragging = draggedCategoryIndex === idx;
                  const isDragOver = dragOverCategoryIndex === idx && !isDragging;

                  return (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCategoryIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', idx.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverCategoryIndex !== idx) setDragOverCategoryIndex(idx);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCategoryIndex !== null && draggedCategoryIndex !== idx) {
                          moveCategoryItem(draggedCategoryIndex, idx);
                        }
                        setDraggedCategoryIndex(null);
                        setDragOverCategoryIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedCategoryIndex(null);
                        setDragOverCategoryIndex(null);
                      }}
                      className={`p-3.5 flex items-center justify-between transition-all duration-150 ${
                        isDragging
                          ? 'opacity-40 bg-slate-900 border-2 border-dashed border-emerald-500/60 scale-[0.98]'
                          : isDragOver
                          ? 'bg-emerald-950/40 border-t-2 border-emerald-400'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Drag handle + Order + Category name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-100 cursor-grab active:cursor-grabbing border border-slate-700/60 shrink-0 touch-none"
                          title="Tarik untuk susun"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="text-xs font-mono font-extrabold text-emerald-400 bg-slate-900/90 border border-emerald-500/30 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>

                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-sm text-slate-100 truncate">{cat.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className={`px-2 py-0.2 rounded-full font-medium ${
                              count === 0 
                                ? 'bg-slate-700/60 text-slate-300' 
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}>
                              {count} produk
                            </span>
                            {count === 0 && (
                              <span className="text-emerald-400 text-[10px] font-semibold">
                                • Sedia dipadam
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Reorder + Edit + Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCategoryItem(idx, idx - 1)}
                          className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                            idx === 0
                              ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                          }`}
                          title="Pindah Naik"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Down */}
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategoryItem(idx, idx + 1)}
                          className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-95 ${
                            idx === categories.length - 1
                              ? 'opacity-25 bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border-slate-700/80 cursor-pointer shadow-sm'
                          }`}
                          title="Pindah Turun"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          id={`btn-edit-category-${cat.id}`}
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition cursor-pointer active:scale-95 ml-1"
                          title="Edit Nama Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          id={`btn-delete-category-${cat.id}`}
                          onClick={() => handleOpenDeleteCategory(cat)}
                          className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                            count > 0
                              ? 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-rose-400 hover:border-rose-500/40'
                              : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 border-rose-500/30'
                          }`}
                          title={count > 0 ? 'Kategori sedang digunakan (Tidak boleh padam)' : 'Padam Category'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-slate-200">
                    Senarai Pelanggan & Pemborong
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Urus nama kedai makan, pelanggan tetap, no telefon dan kadar diskaun.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-add-customer"
                  onClick={handleOpenAddCustomer}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pelanggan</span>
                </button>
              </div>

              {/* SEARCH CUSTOMER BAR */}
              <div className="relative">
                <input
                  type="text"
                  id="input-search-customers"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Cari nama pelanggan / no. telefon..."
                  className="w-full bg-slate-900/90 text-slate-100 rounded-xl pl-9 pr-9 py-2.5 text-xs border border-slate-800 focus:outline-none focus:border-emerald-500 font-medium placeholder:text-slate-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                    title="Kosongkan carian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer count indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                {customerSearch.trim() ? (
                  <span>
                    Menunjukkan <span className="font-bold text-emerald-400">{localCustomers.filter((c) => {
                      const q = customerSearch.trim().toLowerCase();
                      return c.name.toLowerCase().includes(q) || (c.phone && c.phone.toLowerCase().includes(q)) || (c.type && c.type.toLowerCase().includes(q));
                    }).length}</span> daripada {localCustomers.length} pelanggan
                  </span>
                ) : (
                  <span>Jumlah: <span className="font-bold text-slate-200">{localCustomers.length}</span> Pelanggan Berdaftar</span>
                )}
              </div>

              {/* Customers List */}
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40">
                {(() => {
                  const filtered = localCustomers.filter((c) => {
                    if (!customerSearch.trim()) return true;
                    const q = customerSearch.trim().toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.phone && c.phone.toLowerCase().includes(q)) ||
                      (c.type && c.type.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400 font-medium">
                          {customerSearch.trim()
                            ? `Tiada pelanggan dijumpai untuk carian "${customerSearch}".`
                            : 'Tiada pelanggan berdaftar.'}
                        </p>
                        {customerSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => setCustomerSearch('')}
                            className="text-[11px] text-emerald-400 hover:underline font-bold"
                          >
                            Kosongkan Carian
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filtered.map((c, idx) => {
                    const isDefault = isDefaultCustomer(c);
                    return (
                      <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/60 transition">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}.</span>
                          <div>
                            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.type === 'runcit' && (
                                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                                  Default
                                </span>
                              )}
                              {c.type === 'restoran' && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                  Restoran
                                </span>
                              )}
                              {c.type === 'tetap' && (
                                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                                  Tetap
                                </span>
                              )}
                              {c.type === 'pemborong' && (
                                <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                                  Pemborong
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                              {c.phone && <span>📞 {c.phone}</span>}
                              {c.discountPercent ? (
                                <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  Diskaun: {c.discountPercent}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id={`btn-edit-customer-${c.id}`}
                            onClick={() => handleOpenEditCustomer(c)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-400 transition cursor-pointer border border-slate-700/60 active:scale-95"
                            title="Edit Pelanggan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            id={`btn-delete-customer-${c.id}`}
                            onClick={() => handleOpenDeleteCustomer(c)}
                            className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                              isDefault
                                ? 'bg-slate-800/40 text-slate-500 border-slate-700/40 hover:text-amber-400 hover:border-amber-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                            }`}
                            title={isDefault ? 'Pelanggan Lalai (Tidak boleh dipadam)' : 'Padam Pelanggan'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* TAB: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <StaffManagementTab />
          )}

          {/* TAB 3: PAYMENT GATEWAY & NFC */}
          {activeTab === 'payments' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider">
                  Konfigurasi Touch-to-Pay / Card Terminal
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Pilih mod penerimaan kad debit/kredit MyDebit, Visa, Mastercard.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleSavePaymentGateway('nfcReaderMode', 'touch_to_pay')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      localSettings.paymentConfig.nfcReaderMode === 'touch_to_pay'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Sunmi Built-In NFC</div>
                    <div className="text-[10px] mt-0.5">Sentuh kad terus ke peranti</div>
                  </button>

                  <button
                    onClick={() => handleSavePaymentGateway('nfcReaderMode', 'external_terminal')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      localSettings.paymentConfig.nfcReaderMode === 'external_terminal'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Terminal Luar / EDC</div>
                    <div className="text-[10px] mt-0.5">Sambungan Bluetooth / Wi-Fi</div>
                  </button>
                </div>
              </div>

              {/* DuitNow QR info */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider">
                  DuitNow QR Merchant Info
                </h3>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Peniaga (Merchant Name)</label>
                  <input
                    type="text"
                    value={localSettings.paymentConfig.merchantName}
                    onChange={(e) => handleSavePaymentGateway('merchantName', e.target.value)}
                    placeholder="KHAIRUL FRESH & FROZEN"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 border border-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Stripe / HitPay Integration Toggles */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider">
                  Gerbang Pembayaran Tambahan (Stripe / HitPay)
                </h3>

                <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                  <span className="text-slate-300 font-medium">Aktifkan Stripe Card Terminal</span>
                  <input
                    type="checkbox"
                    checked={localSettings.paymentConfig.enableStripe}
                    onChange={(e) => handleSavePaymentGateway('enableStripe', e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                  <span className="text-slate-300 font-medium">Aktifkan HitPay Malaysia (FPX & Card)</span>
                  <input
                    type="checkbox"
                    checked={localSettings.paymentConfig.enableHitPay}
                    onChange={(e) => handleSavePaymentGateway('enableHitPay', e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM, PIN & BACKUP */}
          {activeTab === 'system' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
              {/* Sound Toggle */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Bunyi Beep & Cash Register</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Kesan audio bila tekan butang & jualan selesai</div>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`p-2.5 rounded-xl border flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    localSettings.soundEnabled
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {localSettings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{localSettings.soundEnabled ? 'Aktif' : 'Senyap'}</span>
                </button>
              </div>

              {/* Dedicated Print Sound Toggle */}
              <div 
                id="setting-print-sound" 
                className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200">Bunyi Cetak Resit (Print Sound)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Maklum balas audio (beep ringkas) apabila arahan mencetak resit terma berjaya dihantar ke pencetak.
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="btn-test-print-beep"
                    onClick={() => {
                      sound.playPrintBeep(true);
                    }}
                    title="Uji bunyi pengesahan cetak"
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold cursor-pointer transition active:scale-95"
                  >
                    Uji Beep
                  </button>

                  <button
                    type="button"
                    id="btn-toggle-print-sound"
                    onClick={handleTogglePrintSound}
                    className={`p-2.5 rounded-xl border flex items-center gap-1.5 font-bold transition-all cursor-pointer active:scale-95 ${
                      (localSettings.printSoundEnabled ?? true)
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {(localSettings.printSoundEnabled ?? true) ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                    <span>{(localSettings.printSoundEnabled ?? true) ? 'Aktif' : 'Senyap'}</span>
                  </button>
                </div>
              </div>

              {/* Change Admin PIN */}
              <form onSubmit={handleChangePin} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider">
                  Tukar Admin PIN
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">PIN Baru (4-6 angka)</label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value);
                        setPinChangeError('');
                      }}
                      placeholder="••••"
                      className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 text-center font-mono text-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Sahkan PIN Baru</label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value);
                        setPinChangeError('');
                      }}
                      placeholder="••••"
                      className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 text-center font-mono text-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {pinChangeError && (
                  <div className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{pinChangeError}</span>
                  </div>
                )}

                {pinChangeSuccess && (
                  <div className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>PIN berjaya ditukar!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold cursor-pointer border border-slate-700/70 transition active:scale-95"
                >
                  Simpan PIN Baru
                </button>
              </form>

              {/* WhatsApp / Fonnte Gateway Setup */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        WhatsApp Gateway (Fonnte API)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {settings.fonnteToken && settings.fonnteToken.trim() ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                            <CheckCircle className="w-3.5 h-3.5 inline text-emerald-400 shrink-0" />
                            Token tersimpan: ••••••••••••{settings.fonnteToken.trim().slice(-4)}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold">Token peranti belum dimasukkan</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  Untuk penghantaran resit PDF secara automatik terus ke nombor telefon pelanggan melalui API Fonnte, masukkan <strong>Device Token</strong> daripada papan pemuka akaun <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">fonnte.com</a> anda.
                </p>

                <div className="space-y-3">
                  <label className="block text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    Fonnte Device Token
                  </label>
                  
                  <div className="relative flex items-center">
                    <input
                      type={showFonnteTokenPassword ? "text" : "password"}
                      value={fonnteTokenInput}
                      onChange={(e) => setFonnteTokenInput(e.target.value)}
                      placeholder="Masukkan Token Fonnte anda..."
                      className="w-full bg-slate-950 text-slate-100 rounded-xl pl-3 pr-10 py-2.5 border border-slate-800 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFonnteTokenPassword(!showFonnteTokenPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200 transition"
                      title={showFonnteTokenPassword ? "Sembunyikan Token" : "Paparkan Token"}
                    >
                      {showFonnteTokenPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingFonnteToken}
                      onClick={handleSaveFonnteTokenAction}
                      className="flex-1 min-w-[130px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isSavingFonnteToken ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan API Token</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-test-fonnte-connection"
                      disabled={isTestingFonnte}
                      onClick={handleTestFonnteConnectionAction}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-750 hover:bg-slate-700 disabled:bg-slate-800 text-slate-200 border border-slate-650 font-bold rounded-xl text-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isTestingFonnte ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Uji Sambungan Fonnte</span>
                        </>
                      )}
                    </button>
                  </div>

                  {fonnteSaveSuccess && (
                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60 mt-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>✓ Fonnte API Token berjaya disimpan ke pangkalan data MySQL!</span>
                    </div>
                  )}

                  {fonnteSaveError && (
                    <div className="text-rose-400 font-bold text-xs flex items-center gap-1.5 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60 mt-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ {fonnteSaveError}</span>
                    </div>
                  )}

                  {fonnteTestResult && (
                    <div className={`text-xs font-bold p-3 rounded-xl border flex items-start gap-2 mt-2 transition-all ${
                      fonnteTestResult.success 
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 shadow-md' 
                        : 'bg-rose-950/40 text-rose-300 border-rose-800/80 shadow-md'
                    }`}>
                      {fonnteTestResult.success ? (
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
                            fonnteTestResult.success
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {fonnteTestResult.success ? 'SAMBUNGAN BERJAYA' : 'SAMBUNGAN GAGAL'}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-400">
                            Token: ••••••••••••{(fonnteTokenInput || settings.fonnteToken || '').trim().slice(-4)}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{fonnteTestResult.message}</p>
                        {fonnteTestResult.device && (
                          <p className="text-[11px] text-slate-300 font-mono flex items-center gap-1 pt-0.5">
                            <span>Peranti:</span>
                            <span className="text-emerald-400 font-bold">{fonnteTestResult.device}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MySQL / MariaDB Section */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        Pangkalan Data Cloud (MariaDB / MySQL API)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {user ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Terhubung Staf: {user.name} ({user.loginId})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Belum Log Masuk
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {user && (
                    <button
                      onClick={logout}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700/70 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Keluar</span>
                    </button>
                  )}
                </div>

                <p className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  Data produk, pelanggan, tiket dan transaksi jualan disegerakkan secara terus melalui API Node.js dengan pangkalan data relational <strong>MariaDB / MySQL</strong>.
                </p>

                {syncErrorMessage && (
                  <div className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{syncErrorMessage}</span>
                  </div>
                )}

                {seedStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    seedStatus.includes('Berjaya')
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    <CheckCircle className="w-4 h-4" />
                    <span>{seedStatus}</span>
                  </div>
                )}

                {user && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {lastSyncedAt ? `Terakhir disegerak: ${lastSyncedAt.toLocaleTimeString('ms-MY')}` : 'Status: Siap segerak'}
                    </span>
                    <button
                      disabled={isSeeding}
                      onClick={handleSeedDefaults}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                      <span>{isSeeding ? 'Menyegerak...' : 'Segerak Semula Katalog'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Backup & Data Reset */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-200 uppercase tracking-wider text-xs">
                    Sandaran Fail Tempatan (JSON Backup)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Anda juga boleh mengeksport keseluruhan data ke fail sandaran JSON luar talian pada bila-bila masa.
                  </p>
                </div>

                {importStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    importStatus.includes('berjaya')
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}>
                    {importStatus.includes('berjaya') ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{importStatus}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleExportData}
                    className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-slate-700/70 transition cursor-pointer active:scale-98"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Eksport Data (JSON)</span>
                  </button>

                  <label className="py-3 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold flex items-center justify-center gap-1.5 border border-emerald-500/30 transition cursor-pointer active:scale-98">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Import Data (JSON)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      sound.playKeyBeep(450, 0.04);
                      setShowResetConfirm(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Set Semula Kilang (Reset All Data)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & PASSWORD CHANGE */}
          {activeTab === 'security' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Keselamatan Profil Pengguna</span>
                </div>
                <p className="text-slate-400 text-xs">
                  Akaun: <span className="font-bold text-slate-100 font-mono">{currentUserProfile?.name} ({currentUserProfile?.role.toUpperCase()})</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Login ID: <span className="font-bold text-emerald-400 font-mono">{currentUserProfile?.loginId}</span>
                </p>
              </div>

              {currentUserProfile?.email === 'vpsrush@gmail.com' ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-2xl space-y-2 text-slate-300">
                  <p className="font-bold text-emerald-400">Log Masuk Google Master Admin</p>
                  <p className="text-[11px] leading-relaxed">
                    Anda mendaftar masuk sebagai Master Admin menggunakan akaun Google yang disahkan (<span className="font-mono text-white font-bold">vpsrush@gmail.com</span>). Kata laluan anda diuruskan secara selamat oleh Google. Sila layari tetapan akaun Google anda sekiranya ingin menukar kata laluan.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUpdateOwnPassword} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                  <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Tukar Kata Laluan POS</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Sila isi ruangan di bawah untuk mengemas kini kata laluan akaun staf anda di pangkalan data MySQL. Kata laluan lama tidak akan berfungsi selepas penukaran berjaya.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Kata Laluan Semasa</label>
                      <input
                        type="password"
                        required
                        value={currentPasswordInput}
                        onChange={(e) => {
                          setCurrentPasswordInput(e.target.value);
                          setPasswordChangeError('');
                        }}
                        placeholder="••••••"
                        className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 font-mono text-sm border border-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Kata Laluan Baru</label>
                        <input
                          type="password"
                          required
                          value={newPasswordInput}
                          onChange={(e) => {
                            setNewPasswordInput(e.target.value);
                            setPasswordChangeError('');
                          }}
                          placeholder="••••••"
                          className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 font-mono text-sm border border-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Sahkan Kata Laluan Baru</label>
                        <input
                          type="password"
                          required
                          value={confirmPasswordInput}
                          onChange={(e) => {
                            setConfirmPasswordInput(e.target.value);
                            setPasswordChangeError('');
                          }}
                          placeholder="••••••"
                          className="w-full bg-slate-950 text-slate-100 rounded-xl p-2.5 font-mono text-sm border border-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {passwordChangeError && (
                    <div className="text-rose-400 font-bold text-xs flex items-center gap-1.5 bg-rose-950/30 p-2.5 rounded-xl border border-rose-800/30">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passwordChangeError}</span>
                    </div>
                  )}

                  {passwordChangeSuccess && (
                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/30">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>✓ Kata laluan anda berjaya ditukar!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordChangeLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-extrabold uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {passwordChangeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengemas kini...</span>
                      </>
                    ) : (
                      <span>SIMPAN PASSWORD</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: INSTALL GUIDE */}
          {activeTab === 'install' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Pasang Aplikasi pada Sunmi V3 / Android (PWA Kiosk Mode)</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Sistem POS ini direka khas untuk berjalan sebagai Progressive Web App (PWA) di Sunmi V3 dan peranti Android secara skrin penuh tanpa bar carian pelayar.
                </p>
              </div>

              {/* Copy URL */}
              <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-2">
                <div className="overflow-hidden flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Pautan Aplikasi (Buka di Sunmi V3 / Telefon):
                  </div>
                  <div className="font-mono text-xs text-emerald-300 font-bold truncate mt-0.5">
                    {window.location.href}
                  </div>
                </div>
                <button
                  onClick={handleCopyAppUrl}
                  className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer text-xs"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Pautan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step by step */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider">
                  Langkah Pemasangan Pantas:
                </h3>

                <div className="space-y-3 pl-1 text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-slate-100 block">Buka pautan di Chrome Sunmi V3</strong>
                      <span className="text-slate-400 text-[11px]">Buka pelayar web Google Chrome pada peranti Sunmi anda.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-slate-100 block">Tekan menu 3 titik (⋮) Chrome</strong>
                      <span className="text-slate-400 text-[11px]">Tekan butang menu di bucu atas sebelah kanan pelayar Chrome.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-slate-100 block">Pilih "Add to Home screen" / "Install App"</strong>
                      <span className="text-slate-400 text-[11px]">Tekan <em>"Tambah ke Skrin Utama"</em> atau <em>"Pasang Aplikasi"</em>.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <strong className="text-slate-100 block">Selesai! Buka Ikon POS</strong>
                      <span className="text-slate-400 text-[11px]">Ikon POS Khairul akan terpasang di skrin utama Sunmi anda dan dibuka secara skrin penuh (Kiosk Mode).</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- IN-APP MODAL: ADD / EDIT PRODUCT --- */}
      {isAddingProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase text-slate-100">
                {editingProduct ? 'EDIT PRODUK' : 'TAMBAH PRODUK BARU'}
              </h3>
              <button
                onClick={() => setIsAddingProduct(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Contoh: Ayam Kampung Dara"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Harga Standard (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="9.60"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Unit Asas</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as any)}
                    className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ekor">Ekor</option>
                    <option value="pkt">Paket (pkt)</option>
                    <option value="set">Set</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Kategori <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-product-category"
                    required
                    value={prodCat}
                    onChange={(e) => {
                      setProdCat(e.target.value);
                      if (prodCatError) setProdCatError(null);
                    }}
                    className={`w-full bg-slate-950 text-slate-100 rounded-xl p-3 border font-bold focus:outline-none appearance-none pr-10 cursor-pointer transition ${
                      prodCatError ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  >
                    <option value="" disabled className="text-slate-500 bg-slate-900">
                      -- Pilih Kategori --
                    </option>
                    {/* Preserve existing product category if not yet in categories list */}
                    {prodCat && !categories.some((c) => c.name.trim().toLowerCase() === prodCat.trim().toLowerCase()) && (
                      <option value={prodCat} className="text-slate-100 bg-slate-900">
                        {prodCat}
                      </option>
                    )}
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name} className="text-slate-100 bg-slate-900 py-1.5">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {prodCatError && (
                  <div className="mt-1.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{prodCatError}</span>
                  </div>
                )}

                {categories.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-400 font-medium">
                    Tiada kategori dalam sistem. Sila tambah kategori di tab Categories terlebih dahulu.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: CONFIRM DELETE PRODUCT --- */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">PADAM PRODUK INI?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak boleh diundur.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <div className="font-bold text-slate-100 text-sm">{productToDelete.name}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                RM{productToDelete.defaultPrice.toFixed(2)} / {productToDelete.defaultUnit}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: ADD / EDIT CUSTOMER --- */}
      {isAddingCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase text-slate-100">
                {editingCustomer ? 'EDIT PELANGGAN' : 'TAMBAH PELANGGAN BARU'}
              </h3>
              <button
                onClick={() => setIsAddingCustomer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="space-y-3.5 text-xs">
              {custFormError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{custFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Pelanggan / Kedai *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => {
                    setCustName(e.target.value);
                    if (custFormError) setCustFormError(null);
                  }}
                  placeholder="Contoh: Restoran Selera Kampung"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">No. Telefon</label>
                <input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="Contoh: 012-3456789"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Kategori</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="tetap">Pelanggan Tetap</option>
                    <option value="restoran">Restoran / Kedai</option>
                    <option value="pemborong">Pemborong</option>
                    <option value="runcit">Runcit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Diskaun (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={custDiscount}
                    onChange={(e) => setCustDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: BLOCKED DELETE DEFAULT CUSTOMER --- */}
      {customerBlockedDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/30 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">PELANGGAN LALAI</h3>
                <p className="text-xs text-amber-300 font-semibold mt-0.5">
                  Runcit (Pelanggan Am) ialah pelanggan lalai dan tidak boleh dipadam.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              Pelanggan ini digunakan sebagai pilihan lalai untuk transaksi harian kedai dan diperlukan oleh sistem POS.
            </div>

            <button
              type="button"
              id="btn-close-blocked-customer-delete"
              onClick={() => setCustomerBlockedDelete(null)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold cursor-pointer transition border border-slate-700/60 active:scale-95"
            >
              Faham & Tutup
            </button>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: CONFIRM DELETE CUSTOMER --- */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">PADAM PELANGGAN INI?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak boleh diundur.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <div className="font-bold text-slate-100 text-sm">{customerToDelete.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Jenis: <span className="capitalize">{customerToDelete.type}</span>
                {customerToDelete.phone && ` • Tel: ${customerToDelete.phone}`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: ADD CATEGORY --- */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>TAMBAH CATEGORY</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCatName('');
                  setAddCatError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Nama Category
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (addCatError) setAddCatError(null);
                  }}
                  placeholder="Contoh: Frozen Food / Organ"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {addCatError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addCatError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCatName('');
                    setAddCatError(null);
                  }}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: EDIT CATEGORY --- */}
      {editingCategory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                <span>EDIT CATEGORY</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setEditCatName('');
                  setEditCatError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategoryForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Nama Category
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editCatName}
                  onChange={(e) => {
                    setEditCatName(e.target.value);
                    if (editCatError) setEditCatError(null);
                  }}
                  placeholder="Nama Category"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-[11px] text-slate-300">
                💡 Produk yang menggunakan nama kategori ini akan dikemaskini secara automatik.
              </div>

              {editCatError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editCatError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setEditCatName('');
                    setEditCatError(null);
                  }}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: BLOCKED DELETE CATEGORY (CATEGORY IN USE) --- */}
      {categoryBlockedDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">
                  TIDAK BOLEH PADAM
                </h3>
                <p className="text-xs text-amber-300">Category sedang digunakan</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/70 rounded-2xl border border-slate-700/70 space-y-2 text-xs">
              <p className="text-slate-200">
                Category <strong className="text-amber-300 underline">"{categoryBlockedDelete.category.name}"</strong> masih digunakan oleh <strong className="text-white">{categoryBlockedDelete.usedProducts.length}</strong> produk:
              </p>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-600">
                {categoryBlockedDelete.usedProducts.map((p) => (
                  <div key={p.id} className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-200 truncate">{p.name}</span>
                    <span className="font-mono text-emerald-400 text-[10px] shrink-0">RM{p.defaultPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                Sila tukar category produk tersebut kepada kategori lain sebelum memadam category ini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCategoryBlockedDelete(null)}
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-white font-extrabold uppercase text-xs cursor-pointer shadow-lg transition-all active:scale-95 border border-slate-700"
            >
              Faham & Tutup
            </button>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: CONFIRM DELETE CATEGORY (UNUSED) --- */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">PADAM CATEGORY INI?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak boleh diundur.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <div className="font-bold text-slate-100 text-sm">{categoryToDelete.name}</div>
              <div className="text-xs text-emerald-400 mt-0.5">
                0 produk (Sedia untuk dipadam)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: CONFIRM FACTORY RESET --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-100">SET SEMULA KILANG?</h3>
                <p className="text-xs text-slate-400">AMARAN: Semua data transaksi, produk & tetapan akan dikosongkan.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold cursor-pointer transition border border-slate-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteFactoryReset}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold uppercase cursor-pointer shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Ya, Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
