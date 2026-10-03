import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import FormDataNode from 'form-data';
import cookieParser from 'cookie-parser';

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

        const fonnteToken =
          (req.body.token && String(req.body.token).trim()) ||
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
        if (req.file && req.file.buffer) {
          fileBuffer = req.file.buffer;
        } else if (req.body.pdfBase64) {
          fileBuffer = Buffer.from(req.body.pdfBase64, 'base64');
        }

        const pdfFileName = requestedFilename.endsWith('.pdf') ? requestedFilename : `${requestedFilename}.pdf`;
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
      const fonnteToken =
        (req.body.token && String(req.body.token).trim()) ||
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

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Khairul Fresh POS API',
      database: 'Firebase Cloud Firestore',
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
