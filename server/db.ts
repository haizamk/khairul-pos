import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Load env vars
const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = Number(process.env.MYSQL_PORT) || 3306;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'khairul_pos';
const MYSQL_USER = process.env.MYSQL_USER || 'khairul_pos_app';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';

let mysqlPool: mysql.Pool | null = null;
let isMysqlConnected = false;

// Local fallback storage path for preview or offline dev environment
const DATA_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'khairul_pos.json');

interface LocalDbSchema {
  users: any[];
  categories: any[];
  products: any[];
  customers: any[];
  transactions: any[];
  transaction_items: any[];
  held_tickets: any[];
  settings: Record<string, any>;
}

let localDb: LocalDbSchema = {
  users: [],
  categories: [],
  products: [],
  customers: [],
  transactions: [],
  transaction_items: [],
  held_tickets: [],
  settings: {},
};

function loadLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      localDb = { ...localDb, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('[DB] Could not parse local DB file, starting clean:', err);
    }
  }
}

function saveLocalDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save local DB:', err);
  }
}

/**
 * Initialize MySQL Database pool & create required tables and seed defaults
 */
export async function initDatabase() {
  loadLocalDb();

  if (MYSQL_HOST) {
    try {
      mysqlPool = mysql.createPool({
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test connection
      const connection = await mysqlPool.getConnection();
      console.log(`[DB] Connected to MySQL database "${MYSQL_DATABASE}" at ${MYSQL_HOST}:${MYSQL_PORT}`);
      connection.release();
      isMysqlConnected = true;

      // Create tables
      await createTablesMysql();
    } catch (err: any) {
      console.warn(`[DB] Could not connect to MySQL at ${MYSQL_HOST}:${MYSQL_PORT} (${err.message}). Using local DB engine.`);
      isMysqlConnected = false;
    }
  } else {
    console.log('[DB] MYSQL_HOST not defined. Operating with local persistent database engine.');
  }

  // Seed default data if empty
  await seedDefaults();
}

async function createTablesMysql() {
  if (!mysqlPool) return;

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      login_id VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(32),
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('master_admin', 'admin', 'cashier') NOT NULL DEFAULT 'cashier',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category_id VARCHAR(64),
      category VARCHAR(255),
      default_price DECIMAL(10,2) NOT NULL,
      default_unit VARCHAR(16) NOT NULL DEFAULT 'kg',
      is_popular TINYINT(1) DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(32),
      type VARCHAR(32) NOT NULL DEFAULT 'runcit',
      notes TEXT,
      discount_percent DECIMAL(5,2) DEFAULT 0.00,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      invoice_no VARCHAR(64) NOT NULL UNIQUE,
      timestamp DATETIME NOT NULL,
      customer_id VARCHAR(64),
      customer_json JSON,
      subtotal DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0.00,
      delivery_fee DECIMAL(10,2) DEFAULT 0.00,
      is_delivery TINYINT(1) DEFAULT 0,
      delivery_notes TEXT,
      show_delivery_fee_on_receipt TINYINT(1) DEFAULT 1,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(32) NOT NULL,
      amount_paid DECIMAL(10,2) NOT NULL,
      change_amount DECIMAL(10,2) NOT NULL,
      cashier_id VARCHAR(64),
      cashier_name VARCHAR(255) NOT NULL,
      cashier_role VARCHAR(32),
      status ENUM('completed', 'voided') NOT NULL DEFAULT 'completed',
      void_reason TEXT,
      voided_by VARCHAR(255),
      voided_at DATETIME,
      notes TEXT,
      whatsapp_sent TINYINT(1) DEFAULT 0,
      whatsapp_sent_at DATETIME,
      whatsapp_phone VARCHAR(32),
      whatsapp_status VARCHAR(32),
      whatsapp_error TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS transaction_items (
      id VARCHAR(64) PRIMARY KEY,
      transaction_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64),
      product_name VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,3) NOT NULL,
      weight DECIMAL(10,3),
      unit VARCHAR(16) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS held_tickets (
      id VARCHAR(64) PRIMARY KEY,
      ticket_number INT NOT NULL,
      name VARCHAR(255),
      cashier_id VARCHAR(64),
      ticket_data JSON NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(64) PRIMARY KEY DEFAULT 'store_config',
      settings_data JSON NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  for (const q of queries) {
    await mysqlPool.query(q);
  }
  console.log('[DB] MySQL tables verified/created successfully.');
}

async function seedDefaults() {
  // Check Master Admin user
  const users = await getUsers();
  let masterAdmin = users.find((u) => u.role === 'master_admin' || u.login_id === 'khairul');

  if (!masterAdmin) {
    const passwordHash = await bcrypt.hash('khairul123', 10);
    const defaultMaster = {
      id: 'usr_master_khairul',
      login_id: 'khairul',
      name: 'Khairul (Master Admin)',
      phone: '012-345 6789',
      password_hash: passwordHash,
      role: 'master_admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await createUser(defaultMaster);
    console.log('[DB] Default Master Admin created (Login ID: khairul)');
  }

  // Check Categories
  const categories = await getCategories();
  if (categories.length === 0) {
    const defaultCats = [
      { id: 'cat_ayam', name: 'Ayam Segar', sort_order: 1 },
      { id: 'cat_daging', name: 'Daging Segar', sort_order: 2 },
      { id: 'cat_sampingan', name: 'Produk Sampingan', sort_order: 3 },
      { id: 'cat_kombo', name: 'Pakej Kombo', sort_order: 4 },
    ];
    for (const c of defaultCats) {
      await saveCategory(c);
    }
  }

  // Check Products
  const products = await getProducts();
  if (products.length === 0) {
    const defaultProducts = [
      { id: 'p1', name: 'Ayam Daging Standard', defaultPrice: 10.50, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 1 },
      { id: 'p2', name: 'Ayam Tua/Pencen', defaultPrice: 12.00, defaultUnit: 'ekor', category: 'Ayam Segar', isPopular: true, sortOrder: 2 },
      { id: 'p3', name: 'Kepak Ayam', defaultPrice: 14.50, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 3 },
      { id: 'p4', name: 'Whole Leg', defaultPrice: 15.00, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 4 },
      { id: 'p5', name: 'Isi Dada Ayam', defaultPrice: 16.50, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 5 },
      { id: 'p6', name: 'Chicken Chop', defaultPrice: 17.50, defaultUnit: 'kg', category: 'Ayam Segar', isPopular: true, sortOrder: 6 },
      { id: 'p7', name: 'Kaki Ayam', defaultPrice: 6.00, defaultUnit: 'kg', category: 'Produk Sampingan', isPopular: false, sortOrder: 7 },
      { id: 'p8', name: 'Rangka Ayam', defaultPrice: 3.50, defaultUnit: 'ekor', category: 'Produk Sampingan', isPopular: false, sortOrder: 8 },
      { id: 'p9', name: 'Hati / Pedal Ayam', defaultPrice: 8.00, defaultUnit: 'kg', category: 'Produk Sampingan', isPopular: false, sortOrder: 9 },
      { id: 'p10', name: 'Ayam Kombo Jimat (3 Ekor)', defaultPrice: 32.00, defaultUnit: 'set', category: 'Pakej Kombo', isPopular: true, sortOrder: 10 },
    ];
    for (const p of defaultProducts) {
      await saveProduct(p);
    }
  }

  // Check Customers
  const customers = await getCustomers();
  if (customers.length === 0) {
    const defaultCusts = [
      { id: 'c1', name: 'Runcit (Pelanggan Am)', phone: '', type: 'runcit', notes: 'Pelanggan biasa tanpa pendaftaran', discountPercent: 0 },
      { id: 'c2', name: 'Restoran Seri Melayu', phone: '019-888 1234', type: 'restoran', notes: 'Diskaun khas restoran 5%', discountPercent: 5 },
      { id: 'c3', name: 'Pak Mat Pemborong', phone: '013-777 9999', type: 'pemborong', notes: 'Diskaun pukal pemborong 10%', discountPercent: 10 },
    ];
    for (const c of defaultCusts) {
      await saveCustomer(c);
    }
  }

  // Check Settings
  const settings = await getSettings();
  if (!settings || !settings.storeName) {
    const defaultSettings = {
      adminPin: '1234',
      cashierName: 'Juruwang Utama',
      storeName: 'KHAIRUL FRESH MARKET',
      currency: 'RM',
      categoryOrder: ['Ayam Segar', 'Daging Segar', 'Produk Sampingan', 'Pakej Kombo'],
      receiptConfig: {
        logoType: 'icon',
        customLogoUrl: '',
        selectedIcon: 'poultry',
        companyName: 'KHAIRUL FRESH MARKET',
        tagline: 'Pembekal Ayam & Daging Segar Harian',
        ssmNumber: '202401099999 (003123456-X)',
        phone: '012-345 6789',
        address: 'No 12, Jalan Pasar Segar, Taman Bandar, 43000 Kajang, Selangor',
        website: 'www.freshmarket.my',
        footerMessage: 'Terima kasih atas sokongan anda! Barangan segar setiap hari.',
        fontSize: 'medium',
        paperWidth: '58mm',
        showInvoiceNo: true,
        showDateTime: true,
        showCashier: true,
        showCustomer: true,
        showPaymentDetails: true,
        showDeliveryFee: true,
        showQrCode: true,
        qrCodeUrl: 'https://qr.freshmarket.my/pay',
        currencySymbol: 'RM',
      },
      paymentConfig: {
        enableStripe: false,
        stripePublishableKey: '',
        enableHitPay: false,
        hitpayApiKey: '',
        merchantName: 'KHAIRUL FRESH MARKET',
        duitNowQrString: '00020101021126580014A0000007620150101234567895204581253034585802MY5919Khairul Fresh Market6006Kajang62070703A0163041234',
        nfcReaderMode: 'touch_to_pay',
      },
      soundEnabled: true,
      printSoundEnabled: true,
      deviceFrameMode: false,
      fonnteToken: process.env.FONNTE_TOKEN || '',
    };
    await saveSettings(defaultSettings);
  }
}

// ==========================================
// DB API HELPERS: USERS / STAFF
// ==========================================

export async function getUsers() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, login_id, name, phone, password_hash, role, status, created_at, updated_at FROM users ORDER BY created_at ASC`
    );
    return rows.map((r: any) => ({
      id: r.id,
      uid: r.id,
      loginId: r.login_id,
      name: r.name,
      phone: r.phone || '',
      passwordHash: r.password_hash,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } else {
    return localDb.users.map((u) => ({
      ...u,
      uid: u.id,
      loginId: u.login_id || u.loginId,
      passwordHash: u.password_hash || u.passwordHash,
    }));
  }
}

export async function getUserByLoginId(loginId: string) {
  const cleanId = loginId.trim().toLowerCase();
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, login_id, name, phone, password_hash, role, status, created_at, updated_at FROM users WHERE LOWER(login_id) = ?`,
      [cleanId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      uid: r.id,
      loginId: r.login_id,
      name: r.name,
      phone: r.phone || '',
      passwordHash: r.password_hash,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } else {
    const matched = localDb.users.find((u) => (u.login_id || u.loginId)?.toLowerCase() === cleanId);
    if (!matched) return null;
    return {
      ...matched,
      uid: matched.id,
      loginId: matched.login_id || matched.loginId,
      passwordHash: matched.password_hash || matched.passwordHash,
    };
  }
}

export async function getUserById(id: string) {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, login_id, name, phone, password_hash, role, status, created_at, updated_at FROM users WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      uid: r.id,
      loginId: r.login_id,
      name: r.name,
      phone: r.phone || '',
      passwordHash: r.password_hash,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } else {
    const matched = localDb.users.find((u) => u.id === id);
    if (!matched) return null;
    return {
      ...matched,
      uid: matched.id,
      loginId: matched.login_id || matched.loginId,
      passwordHash: matched.password_hash || matched.passwordHash,
    };
  }
}

export async function createUser(data: any) {
  const id = data.id || `usr_${Date.now()}`;
  const loginId = (data.login_id || data.loginId || '').trim().toLowerCase();
  const name = data.name;
  const phone = data.phone || '';
  const passwordHash = data.password_hash || data.passwordHash;
  const role = data.role || 'cashier';
  const status = data.status || 'active';
  const now = new Date().toISOString();

  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `INSERT INTO users (id, login_id, name, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, loginId, name, phone, passwordHash, role, status, now, now]
    );
  } else {
    const record = {
      id,
      login_id: loginId,
      loginId,
      name,
      phone,
      password_hash: passwordHash,
      passwordHash,
      role,
      status,
      created_at: now,
      createdAt: now,
      updated_at: now,
      updatedAt: now,
    };
    localDb.users.push(record);
    saveLocalDb();
  }
  return getUserById(id);
}

export async function updateUser(id: string, updates: any) {
  const existing = await getUserById(id);
  if (!existing) throw new Error('Pengguna tidak ditemui');

  const name = updates.name !== undefined ? updates.name : existing.name;
  const phone = updates.phone !== undefined ? updates.phone : existing.phone;
  const loginId = updates.loginId !== undefined ? updates.loginId.trim().toLowerCase() : existing.loginId;
  const role = updates.role !== undefined ? updates.role : existing.role;
  const status = updates.status !== undefined ? updates.status : existing.status;
  const passwordHash = updates.passwordHash || updates.password_hash || existing.passwordHash;
  const now = new Date().toISOString();

  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `UPDATE users SET name=?, phone=?, login_id=?, role=?, status=?, password_hash=?, updated_at=? WHERE id=?`,
      [name, phone, loginId, role, status, passwordHash, now, id]
    );
  } else {
    localDb.users = localDb.users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          name,
          phone,
          login_id: loginId,
          loginId,
          role,
          status,
          password_hash: passwordHash,
          passwordHash,
          updated_at: now,
          updatedAt: now,
        };
      }
      return u;
    });
    saveLocalDb();
  }
  return getUserById(id);
}

export async function deleteUser(id: string) {
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(`DELETE FROM users WHERE id = ?`, [id]);
  } else {
    localDb.users = localDb.users.filter((u) => u.id !== id);
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: CATEGORIES
// ==========================================

export async function getCategories() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, name, sort_order, active FROM categories WHERE active = 1 ORDER BY sort_order ASC`
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      sortOrder: r.sort_order,
    }));
  } else {
    return [...localDb.categories].sort((a, b) => (a.sortOrder || a.sort_order || 0) - (b.sortOrder || b.sort_order || 0));
  }
}

export async function saveCategory(cat: any) {
  const id = cat.id || `cat_${Date.now()}`;
  const name = cat.name.trim();
  const sortOrder = cat.sortOrder !== undefined ? cat.sortOrder : cat.sort_order || 0;

  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `INSERT INTO categories (id, name, sort_order, active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order), active=1`,
      [id, name, sortOrder]
    );
  } else {
    const idx = localDb.categories.findIndex((c) => c.id === id);
    const rec = { id, name, sortOrder, sort_order: sortOrder };
    if (idx >= 0) {
      localDb.categories[idx] = rec;
    } else {
      localDb.categories.push(rec);
    }
    saveLocalDb();
  }
  return { id, name, sortOrder };
}

export async function deleteCategory(id: string) {
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(`UPDATE categories SET active = 0 WHERE id = ?`, [id]);
  } else {
    localDb.categories = localDb.categories.filter((c) => c.id !== id);
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: PRODUCTS
// ==========================================

export async function getProducts() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, name, category, default_price, default_unit, is_popular, sort_order FROM products WHERE active = 1 ORDER BY sort_order ASC`
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category || '',
      defaultPrice: Number(r.default_price),
      defaultUnit: r.default_unit,
      isPopular: Boolean(r.is_popular),
      sortOrder: r.sort_order,
    }));
  } else {
    return [...localDb.products].sort((a, b) => (a.sortOrder || a.sort_order || 0) - (b.sortOrder || b.sort_order || 0));
  }
}

export async function saveProduct(prod: any) {
  const id = prod.id || `p_${Date.now()}`;
  const name = prod.name.trim();
  const category = prod.category || '';
  const defaultPrice = prod.defaultPrice !== undefined ? prod.defaultPrice : prod.default_price || 0;
  const defaultUnit = prod.defaultUnit || prod.default_unit || 'kg';
  const isPopular = prod.isPopular ? 1 : 0;
  const sortOrder = prod.sortOrder !== undefined ? prod.sortOrder : prod.sort_order || 0;

  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `INSERT INTO products (id, name, category, default_price, default_unit, is_popular, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), default_price=VALUES(default_price), default_unit=VALUES(default_unit), is_popular=VALUES(is_popular), sort_order=VALUES(sort_order), active=1`,
      [id, name, category, defaultPrice, defaultUnit, isPopular, sortOrder]
    );
  } else {
    const idx = localDb.products.findIndex((p) => p.id === id);
    const rec = { id, name, category, defaultPrice, defaultUnit, isPopular: Boolean(isPopular), sortOrder };
    if (idx >= 0) {
      localDb.products[idx] = rec;
    } else {
      localDb.products.push(rec);
    }
    saveLocalDb();
  }
  return { id, name, category, defaultPrice, defaultUnit, isPopular: Boolean(isPopular), sortOrder };
}

export async function deleteProduct(id: string) {
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(`UPDATE products SET active = 0 WHERE id = ?`, [id]);
  } else {
    localDb.products = localDb.products.filter((p) => p.id !== id);
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: CUSTOMERS
// ==========================================

export async function getCustomers() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, name, phone, type, notes, discount_percent FROM customers WHERE active = 1 ORDER BY created_at ASC`
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      type: r.type,
      notes: r.notes || '',
      discountPercent: Number(r.discount_percent || 0),
    }));
  } else {
    return localDb.customers;
  }
}

export async function saveCustomer(cust: any) {
  const id = cust.id || `c_${Date.now()}`;
  const name = cust.name.trim();
  const phone = cust.phone || '';
  const type = cust.type || 'runcit';
  const notes = cust.notes || '';
  const discountPercent = cust.discountPercent !== undefined ? cust.discountPercent : cust.discount_percent || 0;

  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `INSERT INTO customers (id, name, phone, type, notes, discount_percent, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), type=VALUES(type), notes=VALUES(notes), discount_percent=VALUES(discount_percent), active=1`,
      [id, name, phone, type, notes, discountPercent]
    );
  } else {
    const idx = localDb.customers.findIndex((c) => c.id === id);
    const rec = { id, name, phone, type, notes, discountPercent };
    if (idx >= 0) {
      localDb.customers[idx] = rec;
    } else {
      localDb.customers.push(rec);
    }
    saveLocalDb();
  }
  return { id, name, phone, type, notes, discountPercent };
}

export async function deleteCustomer(id: string) {
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(`UPDATE customers SET active = 0 WHERE id = ?`, [id]);
  } else {
    localDb.customers = localDb.customers.filter((c) => c.id !== id);
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: TRANSACTIONS & ITEMS
// ==========================================

export async function getTransactions() {
  if (isMysqlConnected && mysqlPool) {
    const [txRows]: any = await mysqlPool.query(
      `SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 500`
    );
    if (txRows.length === 0) return [];

    const txIds = txRows.map((t: any) => t.id);
    const [itemRows]: any = await mysqlPool.query(
      `SELECT * FROM transaction_items WHERE transaction_id IN (?)`,
      [txIds]
    );

    const itemsByTx = new Map<string, any[]>();
    for (const item of itemRows) {
      if (!itemsByTx.has(item.transaction_id)) {
        itemsByTx.set(item.transaction_id, []);
      }
      itemsByTx.get(item.transaction_id)!.push({
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        quantity: Number(item.quantity),
        weight: item.weight ? Number(item.weight) : undefined,
        unit: item.unit,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.line_total),
      });
    }

    return txRows.map((t: any) => {
      let cust = { id: 'c1', name: 'Runcit (Pelanggan Am)', type: 'runcit' };
      try {
        if (t.customer_json) {
          cust = typeof t.customer_json === 'string' ? JSON.parse(t.customer_json) : t.customer_json;
        }
      } catch {
        // Fallback
      }

      return {
        id: t.id,
        invoiceNo: t.invoice_no,
        timestamp: new Date(t.timestamp).toISOString(),
        customer: cust,
        items: itemsByTx.get(t.id) || [],
        subtotal: Number(t.subtotal),
        discount: Number(t.discount || 0),
        deliveryFee: Number(t.delivery_fee || 0),
        isDelivery: Boolean(t.is_delivery),
        deliveryNotes: t.delivery_notes || '',
        showDeliveryFeeOnReceipt: Boolean(t.show_delivery_fee_on_receipt),
        totalAmount: Number(t.total_amount),
        paymentMethod: t.payment_method,
        amountPaid: Number(t.amount_paid),
        changeAmount: Number(t.change_amount),
        cashierId: t.cashier_id,
        cashierName: t.cashier_name,
        cashierRole: t.cashier_role,
        status: t.status,
        voidReason: t.void_reason,
        voidedBy: t.voided_by,
        voidedAt: t.voided_at ? new Date(t.voided_at).toISOString() : undefined,
        notes: t.notes,
        whatsappSent: Boolean(t.whatsapp_sent),
        whatsappSentAt: t.whatsapp_sent_at ? new Date(t.whatsapp_sent_at).toISOString() : undefined,
        whatsappPhone: t.whatsapp_phone,
        whatsappStatus: t.whatsapp_status,
        whatsappError: t.whatsapp_error,
      };
    });
  } else {
    return localDb.transactions;
  }
}

export async function saveTransaction(tx: any) {
  const id = tx.id || `tx_${Date.now()}`;
  const invoiceNo = tx.invoiceNo;
  const timestamp = new Date(tx.timestamp || Date.now());
  const custJson = JSON.stringify(tx.customer || {});
  const custId = tx.customer?.id || null;
  const subtotal = tx.subtotal || 0;
  const discount = tx.discount || 0;
  const deliveryFee = tx.deliveryFee || 0;
  const isDelivery = tx.isDelivery ? 1 : 0;
  const deliveryNotes = tx.deliveryNotes || '';
  const showDeliveryFeeOnReceipt = tx.showDeliveryFeeOnReceipt !== false ? 1 : 0;
  const totalAmount = tx.totalAmount || 0;
  const paymentMethod = tx.paymentMethod || 'tunai';
  const amountPaid = tx.amountPaid || 0;
  const changeAmount = tx.changeAmount || 0;
  const cashierId = tx.cashierId || null;
  const cashierName = tx.cashierName || 'Juruwang';
  const cashierRole = tx.cashierRole || 'cashier';
  const status = tx.status || 'completed';

  if (isMysqlConnected && mysqlPool) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO transactions 
         (id, invoice_no, timestamp, customer_id, customer_json, subtotal, discount, delivery_fee, is_delivery, delivery_notes, show_delivery_fee_on_receipt, total_amount, payment_method, amount_paid, change_amount, cashier_id, cashier_name, cashier_role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         status=VALUES(status), void_reason=VALUES(void_reason), voided_by=VALUES(voided_by), voided_at=VALUES(voided_at), whatsapp_sent=VALUES(whatsapp_sent), whatsapp_status=VALUES(whatsapp_status)`,
        [id, invoiceNo, timestamp, custId, custJson, subtotal, discount, deliveryFee, isDelivery, deliveryNotes, showDeliveryFeeOnReceipt, totalAmount, paymentMethod, amountPaid, changeAmount, cashierId, cashierName, cashierRole, status]
      );

      // Delete old items if updating
      await conn.query(`DELETE FROM transaction_items WHERE transaction_id = ?`, [id]);

      // Insert transaction items snapshot
      if (Array.isArray(tx.items)) {
        for (const item of tx.items) {
          const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await conn.query(
            `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, weight, unit, unit_price, line_total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemId, id, item.productId || null, item.name, item.quantity, item.weight || null, item.unit, item.unitPrice, item.totalPrice]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } else {
    const idx = localDb.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) {
      localDb.transactions[idx] = { ...tx, id };
    } else {
      localDb.transactions.unshift({ ...tx, id });
    }
    saveLocalDb();
  }
  return tx;
}

export async function voidTransaction(txId: string, reason: string, voidedBy: string) {
  const now = new Date().toISOString();
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `UPDATE transactions SET status = 'voided', void_reason = ?, voided_by = ?, voided_at = ? WHERE id = ?`,
      [reason, voidedBy, new Date(), txId]
    );
  } else {
    localDb.transactions = localDb.transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          status: 'voided',
          voidReason: reason,
          voidedBy,
          voidedAt: now,
        };
      }
      return t;
    });
    saveLocalDb();
  }
  return true;
}

export async function updateTransactionWhatsApp(txId: string, data: { status: string; sent: boolean; phone?: string; error?: string }) {
  const now = new Date();
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `UPDATE transactions SET whatsapp_status = ?, whatsapp_sent = ?, whatsapp_phone = ?, whatsapp_error = ?, whatsapp_sent_at = ? WHERE id = ?`,
      [data.status, data.sent ? 1 : 0, data.phone || null, data.error || null, data.sent ? now : null, txId]
    );
  } else {
    localDb.transactions = localDb.transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          whatsappStatus: data.status,
          whatsappSent: data.sent,
          whatsappPhone: data.phone || t.whatsappPhone,
          whatsappError: data.error,
          whatsappSentAt: data.sent ? now.toISOString() : t.whatsappSentAt,
        };
      }
      return t;
    });
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: HELD TICKETS
// ==========================================

export async function getHeldTickets() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT id, ticket_number, name, cashier_id, ticket_data, created_at FROM held_tickets ORDER BY ticket_number ASC`
    );
    return rows.map((r: any) => {
      let data = {};
      try {
        data = typeof r.ticket_data === 'string' ? JSON.parse(r.ticket_data) : r.ticket_data;
      } catch {
        // Fallback
      }
      return {
        id: r.id,
        ticketNumber: r.ticket_number,
        name: r.name,
        createdAt: new Date(r.created_at).toISOString(),
        ...data,
      };
    });
  } else {
    return localDb.held_tickets;
  }
}

export async function saveHeldTickets(tickets: any[]) {
  if (isMysqlConnected && mysqlPool) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM held_tickets`);
      for (const t of tickets) {
        const id = t.id || `ht_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const ticketNum = t.ticketNumber || 1;
        const name = t.name || `Tiket #${ticketNum}`;
        const createdAt = new Date(t.createdAt || Date.now());
        const dataJson = JSON.stringify(t);

        await conn.query(
          `INSERT INTO held_tickets (id, ticket_number, name, ticket_data, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, ticketNum, name, dataJson, createdAt]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } else {
    localDb.held_tickets = tickets;
    saveLocalDb();
  }
  return true;
}

// ==========================================
// DB API HELPERS: SETTINGS
// ==========================================

export async function getSettings() {
  if (isMysqlConnected && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT settings_data FROM settings WHERE id = 'store_config'`
    );
    if (rows.length === 0) return null;
    const raw = rows[0].settings_data;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } else {
    return localDb.settings;
  }
}

export async function saveSettings(settingsData: any) {
  const jsonStr = JSON.stringify(settingsData);
  if (isMysqlConnected && mysqlPool) {
    await mysqlPool.query(
      `INSERT INTO settings (id, settings_data) VALUES ('store_config', ?)
       ON DUPLICATE KEY UPDATE settings_data = VALUES(settings_data)`,
      [jsonStr]
    );
  } else {
    localDb.settings = settingsData;
    saveLocalDb();
  }
  return settingsData;
}
