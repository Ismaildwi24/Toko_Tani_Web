# TUGAS: Toko Tani — Marketplace Sayur & Buah Lokal

> **Instruksi untuk AI Agent**: Baca dokumen ini secara menyeluruh sebelum menulis satu baris kode pun. Setiap bagian bersifat wajib kecuali ditandai `(opsional)`. Jika ada ambiguitas, selalu pilih pendekatan yang paling sesuai dengan prototype yang dideskripsikan.

---

## 1. Ringkasan Proyek

**Toko Tani** adalah platform marketplace web yang menghubungkan petani lokal langsung dengan konsumen, tanpa perantara. Konsumen dapat membeli sayur, buah, umbi-umbian, dan bumbu segar langsung dari petani. Petani mengelola produk dan pesanan mereka sendiri. Admin memverifikasi pembayaran dan mengelola ekosistem platform.

**Tagline**: *"Sayur Segar Langsung dari Petani Lokal"*

---

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | **Next.js 14** (App Router) |
| Bahasa | **TypeScript** |
| Styling | **Tailwind CSS** |
| Backend / DB | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| ORM | **Supabase JS Client** (`@supabase/supabase-js`) |
| State Management | **Zustand** |
| Form Handling | **React Hook Form** + **Zod** |
| Payment Gateway | **Midtrans** (Snap.js) |
| Realtime Chat | **Supabase Realtime** |
| Image Upload | **Supabase Storage** |
| Icons | **Lucide React** |
| Notifications | **React Hot Toast** |
| Date | **date-fns** dengan locale `id` |

---

## 3. Identitas Visual & Design System

### 3.1 Warna
```css
/* Warna utama — sesuai prototype */
--color-primary: #1A7C3E;        /* Hijau tua — tombol utama, brand */
--color-primary-hover: #155e30;
--color-primary-light: #e8f5ee;  /* Background badge organik */
--color-accent: #2ECC71;         /* Hijau terang — highlight */
--color-danger: #E53E3E;
--color-warning: #F6AD55;
--color-text-primary: #1A202C;
--color-text-secondary: #4A5568;
--color-text-muted: #718096;
--color-border: #E2E8F0;
--color-bg: #F7FAFC;
--color-white: #FFFFFF;
```

### 3.2 Tipografi
- **Heading / Brand**: `Plus Jakarta Sans` (Google Fonts)
- **Body**: `Inter` (fallback), gunakan `Plus Jakarta Sans` untuk semua level sebenarnya
- Ukuran heading: H1 `2.25rem`, H2 `1.5rem`, H3 `1.25rem`, body `0.875rem`–`1rem`

### 3.3 Komponen Berulang
- **Tombol primary**: bg `#1A7C3E`, teks putih, radius `0.5rem`, padding `0.75rem 1.5rem`
- **Tombol secondary/outline**: border `#1A7C3E`, teks `#1A7C3E`, bg transparan
- **Card produk**: shadow-sm, radius `0.75rem`, hover: shadow-md + slight scale
- **Badge**: `Organik` (hijau), `Bebas Pestisida` (biru), `Terlaris` (oranye), `Dilaporkan` (kuning)
- **Input**: border `#CBD5E0`, focus ring `#1A7C3E`, radius `0.5rem`

---

## 4. Struktur Database (Supabase / PostgreSQL)

Buat semua tabel berikut dengan RLS (Row Level Security) diaktifkan.

### 4.1 Tabel `profiles`
```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id)
full_name   text NOT NULL
email       text NOT NULL
phone       text
avatar_url  text
role        text NOT NULL CHECK (role IN ('customer', 'petani', 'admin'))
status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked'))
created_at  timestamptz DEFAULT now()
```

### 4.2 Tabel `products`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
petani_id       uuid REFERENCES profiles(id) ON DELETE CASCADE
name            text NOT NULL
slug            text UNIQUE NOT NULL
description     text
price           integer NOT NULL  -- dalam Rupiah
unit            text NOT NULL     -- contoh: '250g', '1kg', '1 ikat'
stock           integer NOT NULL DEFAULT 0
category        text NOT NULL CHECK (category IN ('sayur', 'buah', 'bumbu', 'umbi', 'organik'))
tags            text[]            -- ['organik', 'bebas_pestisida']
images          text[]            -- array URL dari Supabase Storage
is_featured     boolean DEFAULT false
is_active       boolean DEFAULT true
sold_count      integer DEFAULT 0
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### 4.3 Tabel `orders`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_number    text UNIQUE NOT NULL  -- format: TK-XXXX
customer_id     uuid REFERENCES profiles(id)
petani_id       uuid REFERENCES profiles(id)
status          text NOT NULL DEFAULT 'menunggu_pembayaran'
                -- CHECK: 'menunggu_pembayaran' | 'menunggu_verifikasi' | 'diproses' | 'dikirim' | 'selesai' | 'dibatalkan'
payment_method  text NOT NULL
                -- CHECK: 'transfer_bca' | 'transfer_bri' | 'transfer_mandiri' | 'transfer_bni' | 'qris' | 'midtrans'
payment_proof_url text          -- URL bukti transfer (jika manual)
midtrans_token  text            -- snap token jika pakai Midtrans
shipping_address jsonb NOT NULL -- { name, phone, address, rt, rw, kelurahan, kecamatan, kota, provinsi, kode_pos }
courier         text            -- 'lalamove' | 'aci' | 'gojek'
shipping_cost   integer DEFAULT 0
subtotal        integer NOT NULL
total           integer NOT NULL
notes           text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### 4.4 Tabel `order_items`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid REFERENCES orders(id) ON DELETE CASCADE
product_id  uuid REFERENCES products(id)
name        text NOT NULL        -- snapshot nama produk saat order
price       integer NOT NULL     -- snapshot harga saat order
quantity    integer NOT NULL
subtotal    integer NOT NULL
unit        text NOT NULL
```

### 4.5 Tabel `reviews`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid REFERENCES orders(id)
product_id  uuid REFERENCES products(id)
customer_id uuid REFERENCES profiles(id)
rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5)
comment     text
image_url   text
created_at  timestamptz DEFAULT now()
```

### 4.6 Tabel `messages`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
room_id     text NOT NULL        -- format: '{user_id_kecil}_{user_id_besar}'
sender_id   uuid REFERENCES profiles(id)
receiver_id uuid REFERENCES profiles(id)
order_id    uuid REFERENCES orders(id)  -- nullable, konteks order
content     text NOT NULL
is_read     boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

### 4.7 Tabel `addresses`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id)
label       text NOT NULL        -- 'Rumah', 'Kantor', dll
name        text NOT NULL
phone       text NOT NULL
address     text NOT NULL
rt          text
rw          text
kelurahan   text
kecamatan   text
kota        text NOT NULL
provinsi    text NOT NULL
kode_pos    text
is_primary  boolean DEFAULT false
```

### 4.8 Tabel `withdrawals` (Petani)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
petani_id       uuid REFERENCES profiles(id)
amount          integer NOT NULL
bank_name       text NOT NULL
account_number  text NOT NULL
account_name    text NOT NULL
status          text DEFAULT 'pending' CHECK (status IN ('pending', 'diproses', 'selesai', 'ditolak'))
created_at      timestamptz DEFAULT now()
```

### 4.9 RLS Policies (wajib dibuat)
- `profiles`: user hanya bisa read/update profil sendiri; admin bisa read semua
- `products`: semua bisa read produk aktif; petani hanya bisa CRUD produk miliknya; admin bisa update semua
- `orders`: customer bisa baca order miliknya; petani bisa baca order yang ditujukan ke dia; admin bisa baca semua
- `messages`: user hanya bisa baca/kirim di room yang melibatkan dirinya
- `reviews`: customer bisa insert review untuk order yang sudah selesai dan miliknya; semua bisa read

---

## 5. Struktur Folder Project

```
toko-tani/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (customer)/
│   │   ├── layout.tsx                  -- Navbar + Footer customer
│   │   ├── page.tsx                    -- Dashboard/Homepage
│   │   ├── produk/
│   │   │   ├── page.tsx                -- Listing semua produk
│   │   │   └── [slug]/page.tsx         -- Detail produk
│   │   ├── keranjang/page.tsx          -- Halaman checkout/cart
│   │   ├── pesanan/
│   │   │   ├── page.tsx                -- Riwayat pesanan
│   │   │   └── [id]/page.tsx           -- Detail pesanan
│   │   ├── chat/
│   │   │   ├── page.tsx                -- Daftar chat
│   │   │   └── [roomId]/page.tsx       -- Chat room
│   │   └── profil/page.tsx
│   ├── (petani)/
│   │   ├── layout.tsx                  -- Navbar petani
│   │   ├── dashboard/page.tsx          -- Dashboard Mitra
│   │   ├── produk/
│   │   │   ├── page.tsx                -- List produk petani
│   │   │   ├── tambah/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── pesanan/
│   │   │   ├── page.tsx                -- Semua pesanan
│   │   │   └── [id]/page.tsx           -- Detail + proses pesanan
│   │   ├── chat/
│   │   │   ├── page.tsx
│   │   │   └── [roomId]/page.tsx
│   │   ├── saldo/page.tsx              -- Saldo + tarik dana
│   │   └── profil/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx                  -- Navbar admin
│   │   ├── dashboard/page.tsx
│   │   └── operasional/page.tsx        -- Verifikasi pembayaran + manajemen user
│   └── api/
│       ├── midtrans/create-token/route.ts
│       └── midtrans/notification/route.ts
├── components/
│   ├── ui/                             -- Komponen atom (Button, Input, Badge, Modal, dll)
│   ├── layout/                         -- Navbar, Footer
│   ├── product/                        -- ProductCard, ProductGrid, ProductFilter
│   ├── order/                          -- OrderCard, OrderStatus
│   ├── chat/                           -- ChatBubble, ChatInput, OrderContext
│   └── shared/                         -- LoadingSpinner, EmptyState, ErrorBoundary
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   -- createBrowserClient
│   │   ├── server.ts                   -- createServerClient (cookies)
│   │   └── middleware.ts
│   ├── midtrans.ts
│   ├── utils.ts                        -- formatRupiah, generateOrderNumber, dll
│   └── validators/                     -- Zod schemas
├── store/
│   ├── cartStore.ts                    -- Zustand cart state
│   └── authStore.ts
├── types/
│   └── index.ts                        -- Type definitions dari DB schema
├── hooks/
│   ├── useCart.ts
│   ├── useAuth.ts
│   └── useRealtimeChat.ts
└── middleware.ts                       -- Auth guard & route protection
```

---

## 6. Halaman & Fitur Detail

### 6.1 Halaman Login (`/login`)

**Berdasarkan prototype**: Background foto bahan makanan (blur), card di tengah.

**Elemen UI:**
- Logo "Toko Tani" di navbar (kiri atas), link "Help Center" (kanan atas)
- Judul: "Selamat Datang Kembali, Ibu!" — sapa dengan nama/sapaan dari profile (fallback: "Selamat Datang!")
- Subtitle: "Masuk untuk mulai belanja sayur segar langsung dari petani."
- Field: **Email atau Nomor Telepon** (satu field, deteksi otomatis)
- Field: **Kata Sandi** (dengan toggle show/hide password)
- Link: "Lupa kata sandi?" → modal reset password via Supabase
- Tombol: **Masuk →** (full width, hijau)
- Divider: "ATAU MASUK DENGAN"
- Tombol: **Google** (OAuth via Supabase)
- Link: "Belum punya akun? **Daftar Sekarang**" → `/register`
- Footer: Privacy Policy · Terms of Service · Support · Contact Us · Copyright

**Logika:**
- Setelah login sukses, cek `role` dari tabel `profiles`
  - `customer` → redirect `/`
  - `petani` → redirect `/dashboard` (petani)
  - `admin` → redirect `/admin/dashboard`
- Jika user baru (OAuth Google pertama kali), tampilkan modal pilih role: "Saya Pembeli" / "Saya Petani"
- Simpan session ke Supabase Auth

**Edge Cases:**
- Email tidak ditemukan → toast error "Email atau nomor telepon tidak terdaftar"
- Password salah → toast error "Kata sandi salah"
- Loading state pada tombol Masuk (disable + spinner)
- Jika sudah login, redirect langsung sesuai role

---

### 6.2 Halaman Register (`/register`)

**Elemen UI:**
- Form: Nama Lengkap, Email, Nomor Telepon, Kata Sandi, Konfirmasi Kata Sandi
- Radio/toggle: "Saya adalah **Pembeli**" / "Saya adalah **Petani**"
- Jika pilih Petani: muncul field tambahan: Nama Toko/Kebun, Lokasi Kebun (kota)
- Tombol: **Daftar Sekarang**
- Link kembali ke login

**Logika:**
- Validasi semua field dengan Zod sebelum submit
- Buat user di Supabase Auth, lalu insert ke tabel `profiles` dengan role yang dipilih
- Petani baru punya `status: 'active'` langsung (simplified, tidak perlu approval)

---

### 6.3 Homepage / Dashboard Customer (`/`)

**Berdasarkan prototype**: Full marketplace homepage.

**Struktur halaman (dari atas ke bawah):**

#### Navbar
- Logo "Toko Tani" (kiri)
- Search bar (tengah, lebar): placeholder "Cari sayur, buah, atau bumbu segar..."
  - Real-time search: debounce 300ms, redirect ke `/produk?q=...`
- Ikon chat, notifikasi (dengan badge merah jika ada unread), keranjang (badge count), avatar profil
- Semua icon menggunakan Lucide React

#### Hero Banner
- Background: gambar ladang sayuran (gunakan Unsplash URL atau placeholder gambar relevan)
- Teks overlay (putih): H1 "Sayur Segar Langsung dari Petani Lokal"
- Subtitle: "Dukung ketahanan pangan nasional dengan membeli langsung hasil panen terbaik dari pahlawan pangan kita."
- Tombol: **Belanja Sekarang** (outline/semi-transparent, hijau)
- Tinggi banner: `400px` di desktop, `250px` di mobile

#### Filter Kategori (Chips/Pills)
- "Semua" | "Sayur" | "Buah" | "Bumbu" | "Umbi-umbian" | "Organik"
- Default: "Semua" aktif (style filled hijau), lainnya outline
- Klik chip → filter produk di bawahnya (client-side)

#### Seksi "Terlaris Minggu Ini"
- Judul + subtitle + link "Lihat Semua →"
- Grid produk: 4 kolom desktop, 2 kolom tablet, 1 kolom mobile (scroll horizontal di mobile)
- Setiap **ProductCard** memiliki:
  - Badge di pojok kiri atas: "ORGANIK" (hijau) atau "BEBAS PESTISIDA" (biru)
  - Gambar produk (aspect ratio 4:3)
  - Avatar + nama petani + lokasi (di bawah gambar)
  - Nama produk (bold)
  - Harga dengan unit (contoh: `Rp 12.500 / 250g`)
  - Tombol **Beli** (full width, hijau)

#### Seksi "Berlangganan Box Mingguan"
- Background: biru muda (`#EBF8FF` atau serupa)
- Kiri: teks promo + input email + tombol "Daftar Sekarang"
- Kanan: gambar box sayuran
- Fungsi: hanya simpan email ke tabel `newsletter_subscribers` (buat tabel sederhana)

#### Footer
- Kiri: Logo + copyright "© 2026 Toko Tani Ecosystem. Memberdayakan Petani Lokal."
- Kanan: Link Tentang Kami, Pusat Bantuan, Privasi, Syarat & Ketentuan
- Ikon globe (bahasa) + ikon share

---

### 6.4 Halaman Detail Produk (`/produk/[slug]`)

**Elemen UI:**
- Breadcrumb: ← Kembali Belanja
- Kiri (60%): Gambar utama besar + thumbnail gallery (3 gambar, klik untuk ganti)
- Kanan (40%):
  - Nama produk (H1)
  - Harga + unit (hijau, besar)
  - Badge tag: "Organik / Bebas Pestisida" + "Ditanam oleh [Nama Petani] di [Kota]"
  - Deskripsi produk (3-4 baris)
  - Quantity selector: tombol `-` / angka / `+` (min 1, max stok)
  - Tombol: **Tambahkan ke Keranjang** (full width, hijau, dengan ikon keranjang)
- Di bawah: **Ulasan Pembeli**
  - Header: "Ulasan Pembeli" + rating agregat "4.8 / 5 ★★★★★"
  - 3 review card (nama, bintang, komentar, foto opsional)
  - Tampilkan hanya 3 review terbaru, tombol "Lihat Semua Ulasan" jika lebih
- Di bawah: **Mungkin Anda juga butuh** — 4 produk rekomendasi dari kategori sama

**Logika:**
- Ambil produk berdasarkan `slug`
- Jika produk tidak ditemukan → tampilkan halaman 404 kustom
- Tombol "Tambahkan ke Keranjang":
  - Jika belum login → redirect ke `/login` dengan `?redirect=/produk/[slug]`
  - Jika sudah login → tambah ke Zustand cart store, tampilkan toast "Berhasil ditambahkan ke keranjang 🛒"
- Rekomendasi: query 4 produk aktif dengan kategori sama, exclude produk ini, order by `sold_count DESC`

---

### 6.5 Halaman Keranjang & Checkout (`/keranjang`)

**Berdasarkan prototype**: Layout dua kolom.

**Kiri (Keranjang Belanja):**
- Checkbox "Pilih Semua"
- Setiap item: checkbox + gambar + nama + nama petani + harga + tombol hapus (ikon) + quantity selector
- Item yang tidak dipilih tampak dimmed (opacity 0.5)

**Kanan (Ringkasan Belanja):**
- Judul: "Ringkasan Belanja"
- **Alamat Pengiriman**: dropdown pilih dari `addresses` user, atau tombol "Tambah Alamat"
  - Jika belum ada alamat → modal form tambah alamat
- **Metode Pembayaran**:
  - Radio list: Transfer BCA, Transfer BRI, Transfer Mandiri, Transfer BNI, QRIS, **Bayar via Midtrans** (payment gateway)
  - Jika pilih salah satu transfer → tampilkan instruksi nomor rekening setelah order dibuat
  - Jika pilih Midtrans → akan redirect ke Snap popup
- Total Harga (N barang): `Rp XX.XXX`
- **Total Tagihan**: `Rp XX.XXX` (bold, hijau)
- Tombol: **Beli (N)** — N = jumlah item yang dipilih

**Logika Checkout:**
1. Validasi: harus ada item dipilih, alamat terpilih, metode pembayaran terpilih
2. Buat order di tabel `orders` dengan status `menunggu_pembayaran`
3. Insert semua item ke `order_items`
4. Jika manual transfer:
   - Tampilkan halaman konfirmasi dengan instruksi transfer + nomor rekening
   - User upload bukti transfer (file image) ke Supabase Storage
   - Update `orders.payment_proof_url` + ubah status ke `menunggu_verifikasi`
5. Jika Midtrans:
   - Call `/api/midtrans/create-token` → dapatkan `snap_token`
   - Buka `window.snap.pay(snap_token, { onSuccess, onPending, onError })`
   - `onSuccess`: update status order ke `diproses`, redirect ke `/pesanan/[id]`

**Edge Cases:**
- Stok produk habis saat checkout → tampilkan peringatan, nonaktifkan tombol beli untuk item tersebut
- Keranjang kosong → tampilkan ilustrasi kosong + tombol "Mulai Belanja"
- Koneksi terputus saat submit → tampilkan error toast, jangan duplikasi order

---

### 6.6 Halaman Profil Customer (`/profil`)

**Berdasarkan prototype**: Halaman "Identitas Customer".

**Elemen UI:**
- Avatar + Nama + Badge "Premium Member" + "Pecinta Organik" (berdasarkan history pembelian)
- **Pesanan Saya** (4 ikon status dengan badge count):
  - Menunggu Pembayaran (badge merah jika ada)
  - Diproses
  - Dikirim / Diantar
  - Beri Ulasan
- **Banner "Pahlawan Pangan Lokal"** (hijau tua):
  - Teks dinamis berdasarkan total belanja bulan ini
- Menu list:
  - Daftar Alamat Pengiriman → modal/halaman manage alamat
  - Metode Pembayaran Tersimpan → (UI saja, opsional simpan referensi)
  - Pusat Bantuan → `/bantuan`
  - **Keluar Akun** (merah) → Supabase signOut + redirect `/login`

---

### 6.7 Halaman Chat Customer (`/chat/[roomId]`)

**Berdasarkan prototype**: Tampilan mirip WhatsApp Web.

**Layout dua panel:**
- Kiri: Header (avatar petani, nama, status Online/Offline, tombol telepon & cari), area pesan, input box
- Kanan: Card **Detail Pesanan** (order terkait) — ID, status badge, item list, alamat, tombol "Lihat Detail Penuh"

**Chat bubble:**
- Pesan masuk (petani): bg putih/abu, rata kiri
- Pesan keluar (customer): bg hijau tua `#1A7C3E`, teks putih, rata kanan
- Timestamp di bawah setiap bubble
- System message (center): "Anda menghubungi [Nama] terkait Order #ORD-XXXX"

**Fitur:**
- Realtime via Supabase Realtime (subscribe ke channel `room_id`)
- Lampiran file (ikon clip) → upload ke Supabase Storage
- Auto-scroll ke pesan terbaru
- Status baca (is_read update saat pesan dilihat)
- Debounce send (cegah double send)

**Edge Cases:**
- Koneksi Realtime terputus → tampilkan banner "Sedang offline, mencoba reconnect..." + auto-reconnect
- Pesan kosong tidak bisa dikirim (validasi)

---

### 6.8 Dashboard Petani (`/dashboard`)

**Berdasarkan prototype**: Dashboard Mitra.

**Elemen UI:**
- Header: "Halo, [Nama Petani]" + "TOTAL SALDO: **Rp X.XXX.XXX**"
- Dua tombol aksi besar:
  - **Upload Panen Baru →** → `/produk/tambah`
  - **Tarik Dana →** → modal withdrawal
- **Pesanan Aktif** dengan badge "X Pesanan Baru"
- List pesanan (card per pesanan):
  - Nama customer (bold)
  - Waktu order (format: "Hari ini, 08:30" atau "Kemarin, 19:45")
  - Total bayar (bold, rata kanan)
  - Tombol **Proses Pesanan** → `/pesanan/[id]`
- Tombol: "Lihat Semua Pesanan"
- Navbar: Logo + "Beranda" + "Riwayat Pesanan" + ikon chat + notifikasi + avatar

**Logika saldo:**
- Saldo = SUM dari `orders.subtotal` yang `status = 'selesai'` dan `petani_id = current_user` MINUS total withdrawal sukses

**Modal Tarik Dana:**
- Field: Jumlah Tarik, Nama Bank, Nomor Rekening, Nama Pemilik Rekening
- Validasi: jumlah ≤ saldo tersedia, minimum Rp 50.000
- Insert ke tabel `withdrawals` dengan status `pending`
- Toast sukses: "Permintaan penarikan dikirim, diproses dalam 1x24 jam"

---

### 6.9 Halaman Detail Pesanan Petani (`/pesanan/[id]`)

**Berdasarkan prototype**: "Detail Pemrosesan Pesanan".

**Layout dua kolom:**
- Header: "Detail Pemrosesan Pesanan" + Order ID badge
- Kiri:
  - Card **Informasi Pelanggan**: nama + waktu order + tombol "Hubungi [Nama]" (→ buka chat)
  - Alamat Pengiriman (fulltext)
  - Card **Ringkasan Produk**: tabel (Produk, Jumlah, Harga Satuan, Subtotal)
  - Total Barang + Ongkos Kirim + **Total Pembayaran**
- Kanan:
  - Card **Pilih Kurir Pengiriman** (radio list):
    - Lalamove — Estimasi 15-30 mnt — Rp 12.000
    - ACI — Estimasi 20-40 mnt — Rp 10.000
    - Gojek — Estimasi 10-25 mnt — Rp 15.000
  - Tombol: **Pesanan Siap, Serahkan ke Kurir** (hijau, full width)
  - Tombol: **Kembali** (outline)
  - Alert info: "Pastikan semua produk telah dipacking dengan standar keamanan pangan sebelum diserahkan ke kurir."

**Logika:**
- Tombol "Serahkan ke Kurir" → update `orders.status = 'dikirim'`, simpan kurir yang dipilih
- Notifikasi realtime ke customer bahwa pesanan sudah dikirim

---

### 6.10 Dashboard Admin (`/admin/dashboard`)

**Berdasarkan prototype**: Dashboard Super Admin.

**Navbar Admin:**
- Logo "Toko Tani Admin" (bold)
- Nav: "Beranda" | "Operasional"
- Tombol: **Unduh Laporan** (hijau)
- Avatar admin

**Konten:**
- Greeting: "Halo, Selamat Pagi [Nama Admin]!" + subtitle
- **4 Stat Cards** (dengan tren):
  - Transaksi Hari Ini: total `orders.total` hari ini yang `status != 'dibatalkan'`
  - Petani Aktif: COUNT profiles dengan `role='petani' AND status='active'`
  - Konsumen Terdaftar: COUNT profiles dengan `role='customer'`
  - Komisi Sistem: 3.5% dari total transaksi selesai bulan ini
- **Kurasi Produk Halaman Depan**: grid 4 produk dengan toggle `is_featured`
  - Klik toggle → update `products.is_featured`
  - Label badge TERLARIS (berdasarkan `sold_count`)
- **Operasional Terkini** (feed aktivitas terbaru):
  - Verifikasi akun petani baru
  - Laporan keluhan konsumen
  - Transaksi masuk

---

### 6.11 Halaman Operasional Admin (`/admin/operasional`)

**Tab 1: Verifikasi Pembayaran**

**Berdasarkan prototype**: Tabel verifikasi manual transfer.

- Search: "Cari ID atau Nama..."
- Sort: "Paling Lama" / "Paling Baru"
- Tabel kolom: ID ORDER | PEMBELI & PETANI | TOTAL BAYAR | BUKTI TRANSFER | AKSI
- Setiap baris:
  - Order number (contoh: `#TT-9012`)
  - Nama pembeli + nama petani
  - Total bayar (hijau, bold)
  - Tombol **Lihat Foto** → modal tampilkan bukti transfer full screen
  - Tombol **Terima** (hijau) → ubah order status ke `diproses`
  - Tombol **Tolak** (merah outline) → modal konfirmasi + isi alasan → ubah status ke `dibatalkan`
- Pagination: "Menampilkan X-Y dari Z" + prev/next + page numbers
- Hanya tampilkan order dengan `status = 'menunggu_verifikasi'`

**Tab 2: Manajemen Pengguna**

**Berdasarkan prototype**: Tabel user management.

- Search: "Cari nama atau email pengguna..."
- Filter dropdown: "Semua Peran" / "Konsumen" / "Petani"
- Tabel kolom: NAMA PENGGUNA | PERAN | TANGGAL GABUNG | STATUS | AKSI
- Status badge: `Aktif` (hijau), `Dilaporkan` (kuning/orange), `Ditangguhkan` (abu), `Diblokir` (merah)
- Tombol **Tangguhkan** (orange outline) → ubah `profiles.status = 'suspended'`
- Tombol **Blokir** (merah) → ubah `profiles.status = 'blocked'` + konfirmasi dialog
- Pagination dengan tampil "Menampilkan 1-3 dari 124 pengguna"

---

## 7. Middleware & Auth Guard

File `middleware.ts` di root:

```typescript
// Proteksi route berdasarkan role
const protectedRoutes = {
  customer: ['/', '/produk', '/keranjang', '/pesanan', '/chat', '/profil'],
  petani: ['/dashboard', '/produk', '/pesanan', '/chat', '/saldo', '/profil'],
  admin: ['/admin'],
}

// Logic:
// 1. Cek session Supabase
// 2. Jika tidak ada session & route protected → redirect /login
// 3. Jika ada session, cek role dari profiles table
// 4. Jika role tidak sesuai route → redirect ke dashboard sesuai role
// 5. Route /login & /register → jika sudah login, redirect ke dashboard
```

---

## 8. API Routes

### `POST /api/midtrans/create-token`
```typescript
// Body: { order_id, amount, customer_name, customer_email, items }
// Response: { snap_token, redirect_url }
// Gunakan Midtrans Node SDK atau fetch ke Midtrans API
// Env: MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION=false
```

### `POST /api/midtrans/notification`
```typescript
// Webhook dari Midtrans
// Verifikasi signature key
// Update orders.status berdasarkan transaction_status:
//   'settlement' → 'diproses'
//   'pending'    → 'menunggu_pembayaran'
//   'cancel'/'deny'/'expire' → 'dibatalkan'
```

---

## 9. Cart Store (Zustand)

```typescript
interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  unit: string
  quantity: number
  image: string
  petani_name: string
  max_stock: number
  selected: boolean
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (product_id: string) => void
  updateQuantity: (product_id: string, quantity: number) => void
  toggleSelect: (product_id: string) => void
  toggleSelectAll: () => void
  clearCart: () => void
  getSelectedItems: () => CartItem[]
  getTotal: () => number
  getCount: () => number
}

// Persist ke localStorage dengan key 'toko-tani-cart'
```

---

## 10. Utility Functions

Buat di `lib/utils.ts`:

```typescript
// Format angka ke Rupiah: 15000 → "Rp 15.000"
formatRupiah(amount: number): string

// Generate order number: "TK-8821" (random 4 digit)
generateOrderNumber(): string

// Format tanggal relatif: "Hari ini, 08:30" / "Kemarin, 19:45" / "12 Mei 2026"
formatRelativeDate(date: Date | string): string

// Generate room ID untuk chat (deterministik)
getChatRoomId(userId1: string, userId2: string): string
// → sort kedua ID secara alphabetical, join dengan '_'

// Truncate teks
truncate(text: string, maxLength: number): string

// Validasi nomor telepon Indonesia (08xx / 628xx)
isValidPhone(phone: string): boolean
```

---

## 11. Dummy / Seed Data

Buat file `supabase/seed.sql` dengan data berikut:

### Users (insert ke auth.users + profiles)
```
- Admin: ahmad@tokotani.id / password123 / role: admin
- Petani 1: pak.sudarso@email.com / password123 / role: petani / nama: "Pak Sudarso" / kota: Batu
- Petani 2: bu.warsi@email.com / password123 / role: petani / nama: "Ibu Warsi" / kota: Lembang
- Customer 1: budi.setiawan@email.com / password123 / role: customer / nama: "Budi Setiawan"
- Customer 2: siti.aminah@email.com / password123 / role: customer / nama: "Siti Aminah"
```

### Products (5-8 produk)
```
1. Bayam Hijau Premium — Rp 12.500/250g — petani: Pak Sudarso — tags: ['organik'] — stok: 50
2. Tomat Cherry Manis — Rp 18.000/500g — petani: Ibu Warsi — tags: ['bebas_pestisida'] — stok: 30
3. Wortel Manis Cipanas — Rp 15.000/1kg — petani: Pak Sudarso — tags: ['organik'] — stok: 25
4. Selada Keriting Hidroponik — Rp 9.500/200g — petani: Pak Sudarso — tags: ['organik'] — stok: 40
5. Cabe Rawit Merah — Rp 8.500/100g — petani: Ibu Warsi — tags: [] — stok: 60
6. Bawang Merah Brebes — Rp 12.000/250g — petani: Pak Sudarso — tags: [] — stok: 35
7. Tomat Merah Segar (Curah) — Rp 15.000/kg — petani: Pak Sudarso — tags: ['organik', 'bebas_pestisida'] — stok: 45
8. Jeruk Nipis Segar — Rp 9.500/500g — petani: Ibu Warsi — category: buah — stok: 20
```

### Orders (2-3 sample orders, berbagai status)
```
- Order TK-9012: Budi → Pak Sudarso, status: menunggu_verifikasi, total: Rp 450.000
- Order TK-9013: Siti → Ibu Warsi, status: menunggu_verifikasi, total: Rp 1.250.000
- Order TK-8821: Budi → Pak Sudarso, status: diproses, total: Rp 57.000
```

### Reviews (untuk produk Tomat Merah)
```
- Ibu Siti: 5 bintang, "Tomatnya masih keras dan segar banget, mantap! Pengiriman juga cepat sekali untuk area kota."
- Ahmad B.: 4 bintang, "Kualitas bagus, cuma ada satu yang agak bonyok sedikit wajar lah. Overall memuaskan belanja disini."
- Dewi W.: 5 bintang, "Beli grosir untuk warung, harganya masuk banget dan kualitas terjaga. Langganan terus pokoknya."
```

---

## 12. Environment Variables

Buat file `.env.local.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Midtrans
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 13. Responsive Behavior

| Elemen | Mobile (< 768px) | Tablet (768–1024px) | Desktop (> 1024px) |
|---|---|---|---|
| Navbar | Logo + hamburger menu (drawer) | Logo + icons saja | Full navbar |
| Search bar | Full width di bawah logo | Di navbar | Di navbar tengah |
| Product grid | 1 kolom (atau 2 kolom kecil) | 2–3 kolom | 4 kolom |
| Checkout | Stack vertical (cart atas, summary bawah) | Stack vertical | Side-by-side |
| Chat | Hanya panel chat (tanpa sidebar order) | Hanya panel chat | Two-panel |
| Hero banner | Height 250px, teks lebih kecil | Height 320px | Height 400px |
| Dashboard petani | List pesanan full width | Full width | Full width |
| Admin tabel | Horizontal scroll | Horizontal scroll | Full width |

---

## 14. Edge Cases & Error Handling Global

- **Supabase error**: Semua Supabase query dibungkus try/catch. Tampilkan toast error yang user-friendly, jangan expose error mentah.
- **Stok habis**: `products.stock = 0` → badge "Stok Habis" di product card, tombol "Beli" diganti "Hubungi Petani".
- **User tidak login** mencoba checkout → redirect ke `/login?redirect=/keranjang`
- **User terblokir** login → toast "Akun Anda telah diblokir. Hubungi support." + jangan beri akses
- **Upload gambar**: Max 5MB per file, hanya terima `image/jpeg`, `image/png`, `image/webp`. Tampilkan progress bar saat upload.
- **Order timeout**: Jika order `menunggu_pembayaran` lebih dari 24 jam → tampilkan banner peringatan di halaman detail pesanan customer.
- **Realtime disconnect**: Tampilkan notifikasi koneksi & auto-reconnect tiap 5 detik.
- **Empty states**: Setiap list/grid yang mungkin kosong harus punya ilustrasi + teks informatif + tombol CTA.
  - Keranjang kosong: "Keranjang masih kosong" + tombol Mulai Belanja
  - Tidak ada pesanan: "Belum ada pesanan" + tombol Belanja Sekarang
  - Tidak ada hasil pencarian: "Produk '[keyword]' tidak ditemukan" + saran: "Coba kata kunci lain"
- **Halaman 404**: Custom page, tampilkan logo + pesan + tombol kembali ke beranda
- **Loading skeleton**: Semua halaman yang fetch data dari server harus punya skeleton loader (bukan spinner saja)

---

## 15. Catatan Implementasi

1. **Mulai dari schema database** — jalankan SQL di Supabase Studio sebelum menulis kode Next.js
2. **Buat komponen UI atom** dulu (`Button`, `Input`, `Badge`, `Modal`) sebelum halaman
3. **Halaman prioritas** (kerjakan dalam urutan ini):
   1. Auth (Login + Register)
   2. Homepage Customer
   3. Detail Produk
   4. Keranjang + Checkout
   5. Dashboard Petani
   6. Detail Pesanan Petani
   7. Chat
   8. Admin Dashboard + Operasional
   9. Profil Customer + Petani
4. **Gunakan `loading.tsx`** di setiap route segment untuk streaming SSR
5. **Server Components** untuk halaman yang tidak butuh interaktivitas (homepage, detail produk static)
6. **Client Components** untuk: cart, chat, form, realtime, toggle
7. Semua teks UI dalam **Bahasa Indonesia** sesuai prototype
8. Gunakan **`date-fns/locale/id`** untuk semua format tanggal
9. Format mata uang selalu gunakan `formatRupiah()` dari utils — jangan hardcode "Rp"
10. Setiap gambar produk yang tidak ada → gunakan placeholder dari `https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani`

---

*Dokumen ini dibuat berdasarkan prototype UI Toko Tani. Semua nama, angka, dan data dalam dummy data adalah fiktif untuk keperluan pengembangan.*
