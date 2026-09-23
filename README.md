# Khairul Fresh POS - Sunmi V3 & Laravel Hybrid System

Sistem Point of Sale (POS) Simple Mode yang dioptimumkan untuk perniagaan barangan basah dan sejuk beku (**Khairul Fresh and Frozen Food**), serasi dengan peranti mudah alih dan terminal pintar seperti **Sunmi V3**.

## 🚀 Ciri-Ciri Utama

1. **Aliran Jualan Pantas (Fast Sale Mode)**
   - Sokongan timbang kilo (Kg) dan kira unit (Ekor/Pkt/Set) dengan keypad sentuh pantas.
   - Pilihan variasi harga automatik (cth: Siakap Bersih vs Siakap Biasa).
   - Pengurusan diskaun item & diskaun keseluruhan pesanan.

2. **Pengurusan Resit Pintar**
   - **Receipt Designer**: Suntingan tajuk resit, maklumat perniagaan (SSM, Alamat, Telefon), pesanan footer, dan kod QR bayaran (DuitNow).
   - **Penjanaan Resit PDF**: Format resit 58mm/80mm standard industri dengan sokongan cetakan terus.
   - **WhatsApp Receipt Sharing (Fonnte API)**: Penghantaran terus resit jualan dan dokumen PDF ke nombor WhatsApp pelanggan melalui integrasi pelayan backend.

3. **Pengurusan Transaksi & Tiket**
   - Fungsi **Hold Ticket** untuk menangguhkan transaksi pelanggan semasa waktu sibuk.
   - Fungsi **Void Transaction** dengan audit log dan kebenaran keselamatan.
   - Penjejakan status pembayaran (Tunai, DuitNow QR, Kad, Baki Pelanggan).

4. **Kawalan Akses Berperingkat (RBAC)**
   - **Master Admin**: Pengurusan penuh sistem, penetapan token peranti Fonnte, dan tetapan akaun perniagaan.
   - **Admin**: Pengurusan inventori, produk, kategori, pelanggan, dan laporan.
   - **Cashier**: Antara muka jualan pantas, buka/tutup syif, dan cetakan resit.
   - Log masuk selamat berasaskan Firebase Authentication & Firestore Security Rules.

5. **Laporan Jualan & Analitik**
   - Ringkasan jualan harian, mingguan, dan bulanan.
   - Laporan kaedah pembayaran dan produk paling laris.

---

## 🛠️ Senibina Teknologi

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide React
- **Backend / Proxy**: Node.js & Express (`server.ts`) dengan sokongan perkhidmatan API Fonnte & Firebase Admin
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **PHP / Laravel Backend Integration**: Laravel 11 (`laravel/`) serasi untuk deployment HestiaCP VPS

---

## 📦 Pemasangan & Menjalankan Aplikasi

### Keperluan Sistem
- Node.js 18+ / Bun / NPM
- PHP 8.2+ & Composer *(untuk modul Laravel)*

### Pembangunan Tempatan (Local Development)
```bash
# Pasang dependencies
npm install

# Jalankan server pembangunan
npm run dev
```

### Binaan Pengeluaran (Production Build)
```bash
npm run build
```

---

## 🔒 Keselamatan
- Semua kelayakan sensitif (Fonnte API Token, Admin credentials) dilindungi di peringkat pelayan (`server-side`).
- Tiada token API atau kelayakan sulit disimpan dalam repositori awam.
