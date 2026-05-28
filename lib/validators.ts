import { z } from 'zod';
import { isValidPhone } from './utils';

// Helper for email or phone validation
const emailOrPhoneSchema = z.string().min(1, 'Email atau Nomor Telepon wajib diisi').refine((val) => {
  const isEmail = z.string().email().safeParse(val).success;
  const isPhone = isValidPhone(val);
  return isEmail || isPhone;
}, {
  message: 'Harus berupa Email yang valid atau Nomor Telepon Indonesia yang valid (contoh: 0812xxx)',
});

// 1. Login Schema
export const loginSchema = z.object({
  emailOrPhone: emailOrPhoneSchema,
  password: z.string().min(6, 'Kata sandi minimal terdiri dari 6 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// 2. Register Schema
export const registerSchema = z.object({
  fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().refine(isValidPhone, 'Nomor telepon tidak valid (contoh: 0812xxx atau 62812xxx)'),
  password: z.string().min(6, 'Kata sandi minimal terdiri dari 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi kata sandi wajib diisi'),
  role: z.enum(['customer', 'petani'], {
    message: 'Pilih peran sebagai Pembeli atau Petani',
  }),
  storeName: z.string().optional(),
  storeLocation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Konfirmasi kata sandi tidak cocok',
      path: ['confirmPassword'],
    });
  }
  if (data.role === 'petani') {
    if (!data.storeName || data.storeName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nama Toko/Kebun wajib diisi untuk Petani',
        path: ['storeName'],
      });
    }
    if (!data.storeLocation || data.storeLocation.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lokasi Kebun (kota) wajib diisi untuk Petani',
        path: ['storeLocation'],
      });
    }
  }
});

export type RegisterInput = z.infer<typeof registerSchema>;

// 3. Product Schema
export const productSchema = z.object({
  name: z.string().min(3, 'Nama produk minimal 3 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
  price: z.number({ message: 'Harga harus berupa angka' }).min(100, 'Harga minimal Rp 100'),
  unit: z.string().min(1, 'Satuan unit wajib diisi (contoh: 1kg, 250g, 1 ikat)'),
  stock: z.number({ message: 'Stok harus berupa angka' }).min(0, 'Stok tidak boleh negatif'),
  category: z.enum(['sayur', 'buah', 'bumbu', 'umbi', 'organik'], {
    message: 'Pilih kategori produk yang valid',
  }),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).min(1, 'Unggah minimal 1 foto produk'),
});

export type ProductInput = z.infer<typeof productSchema>;

// 4. Address Schema
export const addressSchema = z.object({
  label: z.string().min(1, 'Label alamat wajib diisi (contoh: Rumah, Kantor)'),
  name: z.string().min(3, 'Nama penerima minimal 3 karakter'),
  phone: z.string().refine(isValidPhone, 'Nomor telepon penerima tidak valid'),
  address: z.string().min(10, 'Alamat lengkap minimal 10 karakter'),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  kota: z.string().min(1, 'Kota/Kabupaten wajib diisi'),
  provinsi: z.string().min(1, 'Provinsi wajib diisi'),
  kode_pos: z.string().optional(),
  is_primary: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

// 5. Withdrawal Schema
export const withdrawalSchema = z.object({
  amount: z.number({ message: 'Jumlah penarikan harus berupa angka' }).min(50000, 'Batas penarikan minimal Rp 50.000'),
  bankName: z.string().min(2, 'Nama bank wajib diisi'),
  accountNumber: z.string().min(5, 'Nomor rekening minimal 5 digit'),
  accountName: z.string().min(3, 'Nama pemilik rekening minimal 3 karakter'),
});

export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
