import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import FormDataNode from 'form-data';
import cookieParser from 'cookie-parser';

import {
  initDatabase,
  getUsers,
  getUserByLoginId,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCategories,
  saveCategory,
  deleteCategory,
  getProducts,
  saveProduct,
  deleteProduct,
  getCustomers,
  saveCustomer,
  deleteCustomer,
  getTransactions,
  saveTransaction,
  voidTransaction,
  updateTransactionWhatsApp,
  getHeldTickets,
  saveHeldTickets,
  getSettings,
  saveSettings,
} from './server/db';

import {
  signAuthToken,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
  hashPassword,
  requireAuth,
  requireAdmin,
  requireMasterAdmin,
  AuthenticatedRequest,
  extractToken,
  verifyAuthToken,
} from './server/auth';

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize MySQL database connection & seed default tables
  await initDatabase();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // In-memory cache for served receipt PDFs (accessible to Fonnte webhook / downloader)
  const receiptPdfCache = new Map<string, { buffer: Buffer; filename: string; timestamp: number }>();

  // Cleanup old cache entries (> 24h) periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of receiptPdfCache.entries()) {
      if (now - value.timestamp > 24 * 60 * 60 * 1000) {
        receiptPdfCache.delete(key);
      }
    }
  }, 60 * 60 * 1000);

  // Endpoint to serve PDF directly for Fonnte API downloader or direct download
  app.get(['/api/receipt-pdf/:id', '/api/receipt-pdf/:id.pdf'], (req, res) => {
    const rawId = req.params.id.replace(/\.pdf$/i, '');
    const cached = receiptPdfCache.get(rawId);
    if (cached) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${cached.filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }
    return res.status(404).send('Resit PDF tidak dijumpai atau telah tamat tempoh.');
  });

  // API Route: Send WhatsApp Receipt via Fonnte Server-Side Proxy
  app.post(
    '/api/whatsapp/receipt',
    (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err) {
          console.error('Multer file parse error:', err);
          return res.status(400).json({
            success: false,
            status: 'failed',
            message: `Ralat muat naik fail resit: ${err.message || err}`,
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const phone = req.body.phone;
        const message = req.body.message;
        const invoiceNo = req.body.invoiceNo;
        const requestedFilename = req.body.filename || req.file?.originalname || `Resit_${invoiceNo || 'INV'}.pdf`;

        if (!phone) {
          return res.status(400).json({
            success: false,
            status: 'failed',
            message: 'Nombor telefon WhatsApp penerima wajib diisi.',
          });
        }

        // Clean phone number: Convert to international standard without '+'
        let cleanPhone = String(phone).trim().replace(/[^\d+]/g, '');
        if (cleanPhone.startsWith('+')) {
          cleanPhone = cleanPhone.substring(1);
        }
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '60' + cleanPhone.substring(1);
        }

        // Fetch saved settings for Fonnte token if not provided in request body
        const currentSettings = await getSettings();
        const fonnteToken =
          (req.body.token && String(req.body.token).trim()) ||
          currentSettings?.fonnteToken ||
          process.env.FONNTE_TOKEN;

        if (!fonnteToken || fonnteToken.trim() === '') {
          return res.status(200).json({
            success: false,
            status: 'failed',
            message:
              'Token Fonnte belum dimasukkan. Sila masukkan Device Token Fonnte di ruangan tetapan WhatsApp atau tetapkan FONNTE_TOKEN pada persekitaran server.',
            fonnteConfigured: false,
          });
        }

        let fileBuffer: Buffer | null = null;
        let fileMimeType = req.file?.mimetype || 'application/pdf';
        let fileSizeBytes = 0;
        let originalName = req.file?.originalname || requestedFilename;

        if (req.file && req.file.buffer) {
          fileBuffer = req.file.buffer;
          fileSizeBytes = req.file.size;
        } else if (req.body.pdfBase64) {
          fileBuffer = Buffer.from(req.body.pdfBase64, 'base64');
          fileSizeBytes = fileBuffer.length;
        }

        const pdfFileName = requestedFilename.endsWith('.pdf') ? requestedFilename : `${requestedFilename}.pdf`;

        let isPdfSignatureValid = false;
        if (fileBuffer && fileBuffer.length >= 5) {
          const headerString = fileBuffer.slice(0, 5).toString('ascii');
          isPdfSignatureValid = headerString.startsWith('%PDF-') || headerString.startsWith('%PDF');
        }

        const safeMessage = message || `Terima kasih. Ini resit pembelian anda (${invoiceNo || ''}).`;

        const fonnteForm = new FormDataNode();
        fonnteForm.append('target', cleanPhone);
        fonnteForm.append('message', safeMessage);
        fonnteForm.append('countryCode', '60');
        fonnteForm.append('filename', pdfFileName);

        if (fileBuffer && fileBuffer.length > 0) {
          fonnteForm.append('file', fileBuffer, {
            filename: pdfFileName,
            contentType: 'application/pdf',
            knownLength: fileBuffer.length,
          });
        }

        const formHeaders = fonnteForm.getHeaders();
        const formBuffer = fonnteForm.getBuffer();

        const fonnteResponse = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            ...formHeaders,
            Authorization: fonnteToken.trim(),
          },
          body: formBuffer,
        });

        const responseText = await fonnteResponse.text();
        let responseJson: any = {};
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = { raw: responseText };
        }

        let isFonnteSuccess = false;
        let failureReason = '';

        if (fonnteResponse.ok && responseJson) {
          const statusValue = responseJson.status;
          const hasSuccessfulStatus = statusValue === true || statusValue === 'true' || statusValue === 'success';

          if (hasSuccessfulStatus) {
            isFonnteSuccess = true;
            if (Array.isArray(responseJson.id) && responseJson.id.length === 0) {
              isFonnteSuccess = false;
              failureReason = responseJson.reason || responseJson.detail || 'Fonnte meluluskan permintaan tetapi senarai giliran ID kosong.';
            }
          } else {
            isFonnteSuccess = false;
            failureReason = responseJson.reason || responseJson.detail || responseJson.message || 'Fonnte mengembalikan status kegagalan.';
          }
        } else {
          isFonnteSuccess = false;
          failureReason = responseJson?.reason || responseJson?.detail || responseJson?.message || `Ralat HTTP ${fonnteResponse.status}`;
        }

        if (isFonnteSuccess) {
          return res.json({
            success: true,
            status: 'sent',
            message: 'Resit PDF berjaya dihantar ke WhatsApp pelanggan!',
            pdfAttached: !!fileBuffer,
            fonnteHttpStatus: fonnteResponse.status,
            fonnteResponse: responseJson,
          });
        } else {
          return res.json({
            success: false,
            status: 'failed',
            message: `Gagal menghantar WhatsApp: ${failureReason}`,
            pdfAttached: false,
            fonnteHttpStatus: fonnteResponse.status,
            fonnteError: responseJson,
          });
        }
      } catch (err: any) {
        console.error('[Diagnostic Server] Fonnte send error:', err);
        return res.status(500).json({
          success: false,
          status: 'failed',
          message: err?.message || 'Ralat dalaman server semasa memproses penghantaran WhatsApp.',
        });
      }
    }
  );

  // API Route: Test Fonnte Connection
  app.post('/api/whatsapp/test-fonnte', async (req, res) => {
    try {
      const currentSettings = await getSettings();
      const fonnteToken =
        (req.body.token && String(req.body.token).trim()) ||
        currentSettings?.fonnteToken ||
        process.env.FONNTE_TOKEN;

      if (!fonnteToken || fonnteToken.trim() === '') {
        return res.json({
          success: false,
          connected: false,
          message: 'Sila masukkan Token Fonnte terlebih dahulu.',
        });
      }

      const fonnteRes = await fetch('https://api.fonnte.com/device', {
        method: 'POST',
        headers: {
          Authorization: fonnteToken.trim(),
        },
      });

      const resText = await fonnteRes.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = { raw: resText };
      }

      if (fonnteRes.ok && (resJson.status === true || resJson.status === 'true')) {
        return res.json({
          success: true,
          connected: true,
          device: resJson.device || resJson.name || 'Fonnte WhatsApp Device',
          device_status: resJson.device_status || resJson.status,
          message: 'Sambungan Fonnte berjaya! Peranti WhatsApp aktif.',
        });
      } else {
        const reason = resJson.reason || resJson.message || 'Token tidak sah atau peranti terputus.';
        return res.json({
          success: false,
          connected: false,
          message: `Sambungan Fonnte gagal: ${reason}`,
        });
      }
    } catch (err: any) {
      console.error('Fonnte test error:', err);
      return res.status(500).json({
        success: false,
        connected: false,
        message: err?.message || 'Ralat semasa menyemak sambungan Fonnte.',
      });
    }
  });

  // ==========================================
  // CUSTOM SERVER-SIDE AUTHENTICATION API
  // ==========================================

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { loginId, password } = req.body;
      if (!loginId || !password) {
        return res.status(400).json({ success: false, error: 'Sila masukkan Login ID dan kata laluan.' });
      }

      const user = await getUserByLoginId(loginId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Login ID atau kata laluan tidak sah.' });
      }

      if (user.status === 'inactive' || user.status === 'disabled') {
        return res.status(403).json({ success: false, error: 'Akaun anda telah dinyahaktifkan. Sila hubungi Master Admin.' });
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Login ID atau kata laluan tidak sah.' });
      }

      const token = signAuthToken({
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
      });

      setSessionCookie(res, token);

      // Sanitize user object (omit passwordHash)
      const { passwordHash, ...cleanUser } = user;

      return res.json({
        success: true,
        user: cleanUser,
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Ralat pelayan semasa log masuk.' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Berjaya log keluar.' });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ success: false, authenticated: false, error: 'Belum log masuk.' });
      }

      const payload = verifyAuthToken(token);
      if (!payload) {
        clearSessionCookie(res);
        return res.status(401).json({ success: false, authenticated: false, error: 'Sesi tamat tempoh.' });
      }

      const user = await getUserById(payload.id);
      if (!user || user.status === 'inactive') {
        clearSessionCookie(res);
        return res.status(403).json({ success: false, authenticated: false, error: 'Akaun tidak aktif.' });
      }

      const { passwordHash, ...cleanUser } = user;
      return res.json({
        success: true,
        authenticated: true,
        user: cleanUser,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Ralat menyemak sesi.' });
    }
  });

  // ==========================================
  // STAFF MANAGEMENT API
  // ==========================================

  // GET /api/staff
  app.get('/api/staff', requireAdmin, async (_req, res) => {
    try {
      const staffList = await getUsers();
      const sanitized = staffList.map(({ passwordHash, ...u }) => u);
      return res.json({ success: true, staff: sanitized });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Gagal mengambil senarai staf.' });
    }
  });

  // POST /api/staff
  app.post('/api/staff', requireMasterAdmin, async (req, res) => {
    try {
      const { name, phone, loginId, password, role, status } = req.body;

      if (!name || !loginId || !password || !role) {
        return res.status(400).json({ success: false, error: 'Sila lengkapkan nama, login ID, kata laluan, dan peranan.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' });
      }

      const existing = await getUserByLoginId(loginId);
      if (existing) {
        return res.status(400).json({ success: false, error: `Login ID "${loginId}" telah wujud.` });
      }

      const passwordHash = await hashPassword(password);
      const newStaff = await createUser({
        name,
        phone: phone || '',
        login_id: loginId,
        password_hash: passwordHash,
        role,
        status: status || 'active',
      });

      const { passwordHash: _, ...clean } = newStaff!;
      return res.json({ success: true, staff: clean });
    } catch (err: any) {
      console.error('Error creating staff:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal mencipta staf.' });
    }
  });

  // PUT /api/staff/:id
  app.put('/api/staff/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, phone, loginId, password, role, status } = req.body;

      const target = await getUserById(id);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Pengguna tidak ditemui.' });
      }

      // Cashier/Admin protection: Non-master cannot edit master admin
      if (target.role === 'master_admin' && req.user?.role !== 'master_admin') {
        return res.status(403).json({ success: false, error: 'Hanya Master Admin boleh mengubah akaun Master Admin.' });
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (loginId) updates.loginId = loginId;
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (password && password.trim().length >= 6) {
        updates.passwordHash = await hashPassword(password);
      }

      const updated = await updateUser(id, updates);
      const { passwordHash: _, ...clean } = updated!;
      return res.json({ success: true, staff: clean });
    } catch (err: any) {
      console.error('Error updating staff:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal mengemas kini staf.' });
    }
  });

  // DELETE /api/staff/:id
  app.delete('/api/staff/:id', requireMasterAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const target = await getUserById(id);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Pengguna tidak ditemui.' });
      }

      if (target.role === 'master_admin') {
        return res.status(400).json({ success: false, error: 'Akaun Master Admin tidak boleh dipadam!' });
      }

      await deleteUser(id);
      return res.json({ success: true, message: 'Staf berjaya dipadam.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Gagal memadam staf.' });
    }
  });

  // ==========================================
  // DATA CRUD API (PRODUCTS, CATEGORIES, CUSTOMERS, TXS, SETTINGS)
  // ==========================================

  // Products
  app.get('/api/products', async (_req, res) => {
    const products = await getProducts();
    res.json({ success: true, products });
  });

  app.post('/api/products', requireAdmin, async (req, res) => {
    try {
      const saved = await saveProduct(req.body);
      res.json({ success: true, product: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/products/:id', requireAdmin, async (req, res) => {
    try {
      const saved = await saveProduct({ ...req.body, id: req.params.id });
      res.json({ success: true, product: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
      await deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/products/reorder', requireAdmin, async (req, res) => {
    try {
      const { products } = req.body;
      if (Array.isArray(products)) {
        for (let i = 0; i < products.length; i++) {
          await saveProduct({ ...products[i], sortOrder: i + 1 });
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Categories
  app.get('/api/categories', async (_req, res) => {
    const categories = await getCategories();
    res.json({ success: true, categories });
  });

  app.post('/api/categories', requireAdmin, async (req, res) => {
    try {
      const saved = await saveCategory(req.body);
      res.json({ success: true, category: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
      const saved = await saveCategory({ ...req.body, id: req.params.id });
      res.json({ success: true, category: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
    try {
      await deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/categories/reorder', requireAdmin, async (req, res) => {
    try {
      const { categories } = req.body;
      if (Array.isArray(categories)) {
        for (let i = 0; i < categories.length; i++) {
          await saveCategory({ ...categories[i], sortOrder: i + 1 });
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Customers
  app.get('/api/customers', async (_req, res) => {
    const customers = await getCustomers();
    res.json({ success: true, customers });
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const saved = await saveCustomer(req.body);
      res.json({ success: true, customer: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    try {
      const saved = await saveCustomer({ ...req.body, id: req.params.id });
      res.json({ success: true, customer: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      await deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Transactions
  app.get('/api/transactions', async (_req, res) => {
    const transactions = await getTransactions();
    res.json({ success: true, transactions });
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const saved = await saveTransaction(req.body);
      res.json({ success: true, transaction: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/transactions/:id/void', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'Sebab pembatalan (void) wajib diisi.' });
      }
      const voidedBy = req.user?.name || 'Admin';
      await voidTransaction(id, reason, voidedBy);
      res.json({ success: true, message: 'Transaksi berjaya dibatalkan (void).' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/transactions/:id/whatsapp', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, sent, phone, error } = req.body;
      await updateTransactionWhatsApp(id, { status, sent, phone, error });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Held Tickets
  app.get('/api/held-tickets', async (_req, res) => {
    const heldTickets = await getHeldTickets();
    res.json({ success: true, heldTickets });
  });

  app.post('/api/held-tickets', async (req, res) => {
    try {
      const { tickets } = req.body;
      await saveHeldTickets(Array.isArray(tickets) ? tickets : [req.body]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Settings
  app.get('/api/settings', async (_req, res) => {
    const settings = await getSettings();
    res.json({ success: true, settings });
  });

  app.put('/api/settings', requireAdmin, async (req, res) => {
    try {
      const saved = await saveSettings(req.body);
      res.json({ success: true, settings: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Khairul Fresh POS API',
      database: 'MySQL / Persistent DB',
    });
  });

  // API 404 Handler
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      status: 'failed',
      message: 'API endpoint tidak dijumpai.',
    });
  });

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express global error handler:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      success: false,
      status: 'failed',
      message: err.message || 'Ralat dalaman pemprosesan pelayan.',
    });
  });

  // Mount Vite in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Khairul Fresh POS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
