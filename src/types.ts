export type UnitType = 'kg' | 'ekor' | 'pkt' | 'set';

export type UserRole = 'master_admin' | 'admin' | 'cashier';
export type UserStatus = 'active' | 'inactive';

export interface AppUser {
  uid: string;
  name: string;
  phone: string;
  loginId: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  defaultPrice: number;
  defaultUnit: UnitType;
  category?: string;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  weight?: number;
  unit: UnitType;
  totalPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  type: 'runcit' | 'tetap' | 'restoran' | 'pemborong';
  notes?: string;
  discountPercent?: number;
}

export type PaymentMethod = 'tunai' | 'kad_nfc' | 'qr_pay' | 'stripe' | 'hitpay' | 'hutang';

export interface Transaction {
  id: string;
  invoiceNo: string;
  timestamp: string; // ISO string
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  isDelivery?: boolean;
  deliveryNotes?: string;
  showDeliveryFeeOnReceipt?: boolean;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  cashierId?: string;
  cashierName: string;
  cashierRole?: UserRole;
  status: 'completed' | 'voided';
  voidReason?: string;
  voidedAt?: string;
  notes?: string;
  whatsappSent?: boolean;
  whatsappSentAt?: string;
  whatsappPhone?: string;
  whatsappStatus?: 'sent' | 'failed' | 'pending';
  whatsappError?: string;
}

export interface HeldTicket {
  id: string;
  ticketNumber: number;
  name: string;
  createdAt: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  deliveryFee?: number;
  isDelivery?: boolean;
  deliveryNotes?: string;
  showDeliveryFeeOnReceipt?: boolean;
}

export interface ReceiptConfig {
  logoType: 'icon' | 'custom_url' | 'none';
  customLogoUrl: string;
  selectedIcon: 'poultry' | 'meat' | 'fish' | 'halal' | 'store';
  companyName: string;
  tagline: string;
  ssmNumber: string;
  phone: string;
  address: string;
  website: string;
  footerMessage: string;
  fontSize: 'small' | 'medium' | 'large';
  paperWidth: '58mm' | '80mm';
  showInvoiceNo: boolean;
  showDateTime: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showPaymentDetails: boolean;
  showDeliveryFee?: boolean;
  showQrCode: boolean;
  qrCodeUrl: string;
  currencySymbol: string;
}

export interface PaymentGatewayConfig {
  enableStripe: boolean;
  stripePublishableKey: string;
  enableHitPay: boolean;
  hitpayApiKey: string;
  merchantName: string;
  duitNowQrString: string;
  nfcReaderMode: 'touch_to_pay' | 'external_terminal';
}

export interface AppSettings {
  adminPin: string;
  cashierName: string;
  storeName: string;
  currency: string;
  receiptConfig: ReceiptConfig;
  paymentConfig: PaymentGatewayConfig;
  soundEnabled: boolean;
  printSoundEnabled: boolean;
  deviceFrameMode: boolean; // Sunmi V3 handheld frame vs fullscreen
  categoryOrder?: string[];
  fonnteToken?: string;
}
