import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import multer from 'multer';
import FormDataNode from 'form-data';

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Firebase Admin SDK using applet config
  const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

  if (getApps().length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  const dbAdmin = getFirestore(getApps()[0]!, firebaseConfig.firestoreDatabaseId || '(default)');

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

  // API Route: Send WhatsApp Receipt via Fonnte Server-Side Proxy (Strict Binary Multipart & Forensic Audit)
  app.post('/api/whatsapp/receipt', upload.single('file'), async (req, res) => {
    try {
      const phone = req.body.phone;
      const message = req.body.message;
      const invoiceNo = req.body.invoiceNo;
      const transactionId = req.body.transactionId;
      const requestedFilename = req.body.filename || req.file?.originalname || `Resit_${invoiceNo || 'INV'}.pdf`;

      if (!phone) {
        return res.status(400).json({
          success: false,
          status: 'failed',
          message: 'Nombor telefon WhatsApp penerima wajib diisi.'
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

      const fonnteToken = (req.body.token && String(req.body.token).trim()) || process.env.FONNTE_TOKEN;

      if (!fonnteToken || fonnteToken.trim() === '') {
        return res.status(200).json({
          success: false,
          status: 'failed',
          message: 'Token Fonnte belum dimasukkan. Sila masukkan Device Token Fonnte di ruangan tetapan WhatsApp atau tetapkan FONNTE_TOKEN pada persekitaran server.',
          fonnteConfigured: false
        });
      }

      // 1. FORENSIC AUDIT: Verify req.file and binary PDF buffer
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

      // 2 & 3. Verify PDF signature (%PDF-)
      let isPdfSignatureValid = false;
      let pdfHeaderHex = '';
      if (fileBuffer && fileBuffer.length >= 5) {
        const headerString = fileBuffer.slice(0, 5).toString('ascii');
        isPdfSignatureValid = headerString.startsWith('%PDF-') || headerString.startsWith('%PDF');
        pdfHeaderHex = fileBuffer.slice(0, 8).toString('hex');
      }

      // 4. Audit Fonnte Device Profile & Package
      let devicePackage = 'unknown';
      let deviceStatus = 'unknown';
      try {
        const deviceCheckRes = await fetch('https://api.fonnte.com/device', {
          method: 'POST',
          headers: {
            Authorization: fonnteToken.trim()
          }
        });
        if (deviceCheckRes.ok) {
          const deviceJson: any = await deviceCheckRes.json();
          devicePackage = String(deviceJson.package || deviceJson.device_package || 'free').toLowerCase();
          deviceStatus = String(deviceJson.device_status || deviceJson.status || 'unknown');
        }
      } catch (devErr) {
        console.warn('[Diagnostic Audit] Could not fetch Fonnte device profile:', devErr);
      }

      // Safe Forensic Console Logging (NEVER logs token or credentials)
      console.log('=== [FORENSIC AUDIT] WHATSAPP RECEIPT REQUEST ===');
      console.log('req.file exists:', !!req.file);
      console.log('req.file.originalname:', originalName);
      console.log('req.file.mimetype:', fileMimeType);
      console.log('req.file.size (bytes):', fileSizeBytes);
      console.log('PDF Header Signature Valid (%PDF-):', isPdfSignatureValid);
      console.log('PDF Header Sample Hex:', pdfHeaderHex);
      console.log('Fonnte Device Status:', deviceStatus);
      console.log('Fonnte Device Package:', devicePackage);
      console.log('Recipient Phone:', cleanPhone ? `${cleanPhone.substring(0, 4)}****` : 'none');
      console.log('================================================');

      const safeMessage = message || `Terima kasih. Ini resit pembelian anda (${invoiceNo || ''}).`;

      // 5. Construct multipart/form-data for Fonnte API
      const fonnteForm = new FormDataNode();
      fonnteForm.append('target', cleanPhone);
      fonnteForm.append('message', safeMessage);
      fonnteForm.append('countryCode', '60');
      fonnteForm.append('filename', pdfFileName);

      if (fileBuffer && fileBuffer.length > 0) {
        fonnteForm.append('file', fileBuffer, {
          filename: pdfFileName,
          contentType: 'application/pdf',
          knownLength: fileBuffer.length
        });
      }

      const formHeaders = fonnteForm.getHeaders();
      const formBuffer = fonnteForm.getBuffer();

      console.log('Outgoing Content-Type:', formHeaders['content-type']);
      console.log('Outgoing Body Length (bytes):', formBuffer.length);

      // Execute POST https://api.fonnte.com/send
      const fonnteResponse = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          ...formHeaders,
          Authorization: fonnteToken.trim(),
        },
        body: formBuffer
      });

      const responseText = await fonnteResponse.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      console.log('=== [FORENSIC AUDIT] FONNTE API RESPONSE ===');
      console.log('HTTP Status:', fonnteResponse.status);
      console.log('Response JSON:', JSON.stringify(responseJson));
      console.log('============================================');

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

      // Check package plan compatibility: Fonnte explicitly requires Super/Advanced/Ultra for file parameter
      const isPackageSupportingFile = devicePackage === 'super' || devicePackage === 'advanced' || devicePackage === 'ultra' || devicePackage === 'enterprise' || devicePackage === 'pro';
      const lowercaseReason = String(responseJson?.reason || responseJson?.detail || responseJson?.message || '').toLowerCase();
      
      const attachmentFailedInResponse = !fileBuffer || 
                                         lowercaseReason.includes('package limit') || 
                                         lowercaseReason.includes('not allowed') || 
                                         lowercaseReason.includes('unsupported') || 
                                         lowercaseReason.includes('failed to upload') || 
                                         lowercaseReason.includes('error uploading') || 
                                         lowercaseReason.includes('invalid file');

      // Comprehensive status determination:
      // If the device package is free/basic, Fonnte API returns status: true for text but will SILENTLY IGNORE file!
      const isAttachmentDelivered = isFonnteSuccess && isPackageSupportingFile && !attachmentFailedInResponse;

      if (isFonnteSuccess) {
        if (!isAttachmentDelivered) {
          const detailedNotice = !isPackageSupportingFile && devicePackage !== 'unknown'
            ? `Pakej peranti Fonnte anda adalah "${devicePackage.toUpperCase()}". Menurut dokumentasi rasmi Fonnte, penghantaran lampiran fail/dokumen memerlukan pakej "Super, Advanced, atau Ultra".`
            : `Fonnte memproses mesej teks, tetapi lampiran PDF tidak disokong pada akaun/peranti ini.`;

          return res.json({
            success: true,
            status: 'warning',
            message: '⚠️ Mesej WhatsApp berjaya dihantar, tetapi PDF gagal dilampirkan.',
            reason: detailedNotice,
            pdfAttached: false,
            fonnteHttpStatus: fonnteResponse.status,
            fonnteResponse: responseJson,
            pdfReceived: !!fileBuffer,
            pdfSize: fileSizeBytes,
            pdfMimeType: fileMimeType,
            pdfFilename: pdfFileName,
            pdfSignatureValid: isPdfSignatureValid,
            devicePackage: devicePackage,
            deviceStatus: deviceStatus
          });
        }

        return res.json({
          success: true,
          status: 'sent',
          message: 'Resit PDF berjaya dihantar ke WhatsApp pelanggan!',
          pdfAttached: true,
          fonnteHttpStatus: fonnteResponse.status,
          fonnteResponse: responseJson,
          pdfReceived: !!fileBuffer,
          pdfSize: fileSizeBytes,
          pdfMimeType: fileMimeType,
          pdfFilename: pdfFileName,
          pdfSignatureValid: isPdfSignatureValid,
          devicePackage: devicePackage,
          deviceStatus: deviceStatus
        });
      } else {
        return res.json({
          success: false,
          status: 'failed',
          message: `Gagal menghantar WhatsApp: ${failureReason}`,
          pdfAttached: false,
          fonnteHttpStatus: fonnteResponse.status,
          fonnteError: responseJson,
          pdfReceived: !!fileBuffer,
          pdfSize: fileSizeBytes,
          pdfMimeType: fileMimeType,
          pdfFilename: pdfFileName,
          pdfSignatureValid: isPdfSignatureValid,
          devicePackage: devicePackage,
          deviceStatus: deviceStatus
        });
      }
    } catch (err: any) {
      console.error('[Diagnostic Server] Fonnte send error:', err);
      return res.status(500).json({
        success: false,
        status: 'failed',
        message: err?.message || 'Ralat dalaman server semasa memproses penghantaran WhatsApp.',
        pdfReceived: false
      });
    }
  });

  // API Route: Test Fonnte Connection / Token validity
  app.post('/api/whatsapp/test-fonnte', async (req, res) => {
    try {
      const fonnteToken = (req.body.token && String(req.body.token).trim()) || process.env.FONNTE_TOKEN;

      if (!fonnteToken || fonnteToken.trim() === '') {
        return res.json({
          success: false,
          connected: false,
          message: 'Sila masukkan Token Fonnte terlebih dahulu.'
        });
      }

      const fonnteRes = await fetch('https://api.fonnte.com/device', {
        method: 'POST',
        headers: {
          Authorization: fonnteToken.trim(),
        }
      });

      const resText = await fonnteRes.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = { raw: resText };
      }

      console.log('Fonnte device test response:', resJson);

      if (fonnteRes.ok && (resJson.status === true || resJson.status === 'true')) {
        const deviceStatus = resJson.device_status || resJson.status;
        return res.json({
          success: true,
          connected: true,
          device: resJson.device || resJson.name || 'Fonnte WhatsApp Device',
          device_status: deviceStatus,
          message: 'Sambungan Fonnte berjaya! Peranti WhatsApp aktif.'
        });
      } else {
        const reason = resJson.reason || resJson.message || 'Token tidak sah atau peranti terputus.';
        return res.json({
          success: false,
          connected: false,
          message: `Sambungan Fonnte gagal: ${reason}`
        });
      }
    } catch (err: any) {
      console.error('Fonnte test error:', err);
      return res.status(500).json({
        success: false,
        connected: false,
        message: err?.message || 'Ralat semasa menyemak sambungan Fonnte.'
      });
    }
  });

  // ==========================================
  // SECURE BACKEND AUTH & STAFF MANAGEMENT API
  // ==========================================
  
  // Middleware to enforce Master Admin authorization via verified ID token
  async function requireMasterAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Tiada token autorisasi.' });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Ensure the email matches the designated official Master Admin account
      if (decodedToken.email === 'vpsrush@gmail.com') {
        (req as any).user = decodedToken;
        return next();
      }
      
      return res.status(403).json({ success: false, error: 'Akses ditolak. Google account ini tidak didaftarkan sebagai Master Admin.' });
    } catch (err: any) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ success: false, error: 'Sesi tidak sah atau telah tamat tempoh.' });
    }
  }

  // Create Staff
  app.post('/api/create-staff', requireMasterAdmin, async (req, res) => {
    try {
      const { name, phone, loginId, password, role, status } = req.body;

      if (!name || !loginId || !password || !role || !status) {
        return res.status(400).json({ success: false, error: 'Semua medan wajib diisi.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' });
      }

      const email = `${loginId.trim().toLowerCase()}@auth.freshmarket.my`;

      // Check if user already exists in Firestore users collection
      const userRef = dbAdmin.collection('users');
      const querySnapshot = await userRef.where('loginId', '==', loginId.trim().toLowerCase()).get();
      if (!querySnapshot.empty) {
        return res.status(400).json({ success: false, error: `Login ID "${loginId}" telah wujud.` });
      }

      // Create Firebase Auth user
      const userRecord = await getAuth().createUser({
        email,
        password,
        displayName: name,
      });

      // Create Firestore User profile doc (without passwordHash!)
      const newStaff = {
        uid: userRecord.uid,
        name: name.trim(),
        phone: phone ? phone.trim() : '',
        loginId: loginId.trim().toLowerCase(),
        email,
        role,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userRef.doc(userRecord.uid).set(newStaff);

      return res.json({ success: true, uid: userRecord.uid });
    } catch (err: any) {
      console.error('Error creating staff:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal mencipta staf.' });
    }
  });

  // Update Staff
  app.post('/api/update-staff', requireMasterAdmin, async (req, res) => {
    try {
      const { uid, name, phone, loginId, password, role, status } = req.body;

      if (!uid || !name || !loginId || !role || !status) {
        return res.status(400).json({ success: false, error: 'Semua medan wajib diisi.' });
      }

      const email = `${loginId.trim().toLowerCase()}@auth.freshmarket.my`;

      // Update Auth credentials
      try {
        const updateParams: any = {
          displayName: name,
          email,
        };
        if (password && password.trim().length >= 6) {
          updateParams.password = password;
        }
        
        // Update Firebase Auth user
        await getAuth().updateUser(uid, updateParams);

        // Disable/Enable auth user based on status
        await getAuth().updateUser(uid, {
          disabled: status === 'inactive' || status === 'disabled',
        });
      } catch (authErr: any) {
        console.warn('Backend Auth update bypassed due to Admin SDK permissions constraint, proceeding with Firestore update:', authErr.message || authErr);
      }

      // Update Firestore User profile doc (without passwordHash!)
      const updatedData = {
        name: name.trim(),
        phone: phone ? phone.trim() : '',
        loginId: loginId.trim().toLowerCase(),
        email,
        role,
        status,
        updatedAt: new Date().toISOString(),
      };

      await dbAdmin.collection('users').doc(uid).set(updatedData, { merge: true });

      return res.json({ success: true, authBypassed: true });
    } catch (err: any) {
      console.error('Error updating staff:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal mengemas kini staf.' });
    }
  });

  // Delete Staff
  app.post('/api/delete-staff', requireMasterAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ success: false, error: 'UID wajib diisi.' });
      }

      // Delete Firebase Auth User
      try {
        await getAuth().deleteUser(uid);
      } catch (authErr: any) {
        console.warn('Backend Auth deletion bypassed due to Admin SDK permissions constraint, proceeding with Firestore deletion:', authErr.message || authErr);
      }

      // Delete Firestore User profile doc
      await dbAdmin.collection('users').doc(uid).delete();

      return res.json({ success: true, authBypassed: true });
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal memadam staf.' });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Khairul Fresh POS API',
      fonnteConfigured: Boolean(process.env.FONNTE_TOKEN)
    });
  });

  // Mount Vite in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
