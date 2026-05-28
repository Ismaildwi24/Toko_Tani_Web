# Laporan Progres Proyek: Toko Tani

Dokumen ini berisi rangkuman detail seluruh proses pengembangan, struktur teknis, fitur-fitur, serta perbaikan (bugfixes) yang telah dikerjakan untuk platform **Toko Tani — Marketplace Sayur & Buah Lokal**.

---

## 1. Arsitektur & Tech Stack Terpasang
- **Framework Utama**: Next.js 14 (App Router)
- **Bahasa**: TypeScript (Pengecekan tipe ketat)
- **Styling**: Tailwind CSS dengan skema warna hijau brand (`#1A7C3E` sebagai warna primary)
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, dan Realtime Chat)
- **State Management**: Zustand (untuk mengelola Cart / Keranjang belanja)
- **Penanganan Form**: React Hook Form + Zod (untuk validasi sisi klien & tipe data)
- **Payment Gateway**: Midtrans Snap Integration (Online) & Transfer Manual (Offline)
- **Sistem Notifikasi**: React Hot Toast

---

## 2. Struktur Database (Supabase / PostgreSQL)
Tabel-tabel berikut telah dibuat lengkap beserta **Row Level Security (RLS) Policies** dan trigger otomatis:

1. **`profiles`**: Menyimpan data identitas pengguna (Customer, Petani, Admin).
2. **`products`**: Menyimpan produk jualan petani beserta stok, harga, deskripsi, kategori, tags (`organik`, `bebas_pestisida`), dan gambar.
3. **`orders`**: Menyimpan data pesanan, nomor transaksi (`TK-XXXX`), alamat pengiriman, status pembayaran, metode pembayaran, kurir, dan biaya.
4. **`order_items`**: Menyimpan snapshot detail produk yang dibeli saat pesanan dibuat.
5. **`reviews`**: Menyimpan ulasan pembeli beserta rating bintang (1–5) dan komentar.
6. **`messages`**: Menyimpan riwayat pesan obrolan realtime antara customer dan petani.
7. **`addresses`**: Menyimpan daftar alamat pengiriman customer (mendukung multi-alamat).
8. **`withdrawals`**: Mengatur permintaan penarikan dana saldo oleh petani.
9. **`newsletter_subscribers`**: Menyimpan data email langganan newsletter di halaman beranda.
10. **`Trigger handle_new_user`**: Trigger PostgreSQL otomatis untuk membuat profil di tabel `profiles` saat user baru mendaftar di auth Supabase.

---

## 3. Rangkuman Modul & Fitur yang Selesai Dikerjakan

### 3.1 Modul Otentikasi & Keamanan (Auth & Middleware)
- **Halaman Login (`/login`)**: Login menggunakan Email atau Nomor Telepon (deteksi otomatis). Terintegrasi dengan fitur Lupa Kata Sandi via email.
- **Halaman Register (`/register`)**: Pendaftaran user baru dengan opsi peran "Pembeli" atau "Petani". Jika memilih Petani, form akan meminta detail nama toko dan lokasi kebun secara dinamis.
- **Middleware Guard**: Melindungi rute secara ketat berdasarkan peran pengguna (Admin tidak bisa akses halaman customer, Petani diarahkan ke Dashboard Mitra, dst).

### 3.2 Modul Customer (Pembeli)
- **Homepage (`/`)**: Navigasi lengkap, pencarian produk realtime, filter kategori (*Sayur, Buah, Bumbu, Umbi, Organik*), grid produk terlaris dengan badge organik/bebas pestisida, serta langganan newsletter.
- **Detail Produk (`/produk/[slug]`)**: Menampilkan gambar produk, deskripsi budidaya, rating bintang, ulasan pembeli, kuantitas order, serta produk rekomendasi sejenis.
- **Keranjang & Checkout (`/keranjang`)**: Manajemen keranjang belanja multi-item dari petani berbeda, integrasi pilihan alamat pengiriman, opsi pembayaran online via Midtrans Snap (QRIS, Kartu Kredit, dll) atau Transfer Manual (BCA, BRI, Mandiri, BNI).
- **Riwayat & Detail Pesanan (`/pesanan` & `/pesanan/[id]`)**: Melacak status pesanan secara dinamis, mengunggah bukti transfer (jika menggunakan metode manual), serta memberikan ulasan bintang jika pesanan sudah berstatus selesai.

### 3.3 Modul Petani (Mitra)
- **Dashboard Mitra (`/dashboard`)**: Ringkasan saldo berjalan petani, list pesanan aktif yang perlu diproses, serta menu aksi cepat.
- **Modul Saldo (`/saldo`)**: Menghitung akumulasi pendapatan dari pesanan yang sukses dikurangi penarikan dana. Form pengajuan tarik dana (minimum Rp50.000) terintegrasi ke tabel `withdrawals`.
- **Manajemen Hasil Panen (`/produk/tambah` & `/produk/[slug]/edit`)**: Mengunggah foto panen (melalui penyimpanan Supabase Storage atau tautan URL), pengelolaan stok, harga per unit, kategori, serta tags sorotan.
- **Proses Pesanan (`/pesanan/[id]`)**: Petani dapat memilih kurir (Lalamove, ACI, Gojek) dan mengubah status pesanan menjadi dikirim.

### 3.4 Modul Komunikasi & Chat Realtime (`/chat` & `/chat/[roomId]`)
- Panel komunikasi dua arah bertema hijau.
- Terhubung langsung dengan basis data realtime Supabase untuk pembaruan pesan secara instan tanpa perlu reload halaman.
- Panel kanan menampilkan konteks detail pesanan terkait untuk mempermudah transaksi.

### 3.5 Modul Admin (`/admin/dashboard` & `/admin/operasional`)
- **Dashboard Utama**: Menampilkan 4 kartu statistik utama (Transaksi Hari Ini, Petani Aktif, Konsumen Terdaftar, Komisi 3.5% Sistem) serta toggle kurasi produk unggulan untuk ditampilkan di halaman depan customer.
- **Operasional Tab 1 (Verifikasi Pembayaran)**: Menampilkan tabel pesanan dengan status `menunggu_verifikasi` (bukti transfer manual). Admin dapat meninjau foto bukti transfer secara fullscreen, lalu memutuskan untuk menerima (status pesanan berubah ke `diproses`) atau menolak (disertai alasan pembatalan).
- **Operasional Tab 2 (Manajemen Pengguna)**: Menampilkan seluruh profil terdaftar. Admin memiliki otoritas penuh untuk menangguhkan (`suspended`) atau memblokir (`blocked`) akun bermasalah demi menjaga keamanan platform.

---

## 4. Perbaikan Teknis & Bugfixes yang Dibereskan
Selama proses penyempurnaan, beberapa kendala krusial berhasil diatasi agar aplikasi dapat dicompile dengan bersih:
1. **Type Error pada Zod Validator**:
   - Menyelaraskan output skema `tags` di `productSchema` menggunakan `.optional()` alih-alih `.default([])` untuk menghindari error asignasi resolver React Hook Form.
   - Mengubah parameter `invalid_type_error` dan `errorMap` pada tipe Zod `.number()` dan `.enum()` menjadi `message` agar kompatibel dengan versi parser Zod terinstal.
2. **Next.js Prerendering Bailout Error**:
   - Mengatasi kegagalan build Next.js pada halaman `/login`. Karena pemanggilan `useSearchParams()` untuk mendeteksi redirect URL bersifat dinamis di sisi klien, seluruh konten login sekarang dibungkus di dalam `<Suspense>` boundary.
3. **Penyelesaian Dynamic Route Conflict**:
   - Menghindari konflik segmentasi Next.js dengan merubah rute edit produk petani dari format `/app/produk/[id]/edit/page.tsx` menjadi `/app/produk/[slug]/edit/page.tsx`, menyatukan parameter dinamik segmen utama produk.

---

## 5. Status Verifikasi Akhir
- **ESLint Linting (`npm run lint`)**: **SUKSES** (0 error, hanya menyisakan peringatan standar performa `<img>` dan array dependensi `useEffect`).
- **Production Build (`npm run build`)**: **SUKSES** (seluruh modul dan 19 rute teroptimasi dan siap dideploy ke server produksi).
