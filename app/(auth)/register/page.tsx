'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role || 'customer';
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'petani') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
            role: data.role,
            store_name: data.role === 'petani' ? data.storeName : null,
            store_location: data.role === 'petani' ? data.storeLocation : null,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        toast.success('Pendaftaran berhasil! Silakan masuk ke akun Anda.');
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Background Image with Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10 brightness-[0.7]" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1920')" }}
      />
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[4px] -z-10" />

      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between text-white bg-gradient-to-b from-black/50 to-transparent">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
            <span className="bg-brand-primary p-1.5 rounded-lg text-white text-sm">🥬</span>
            Toko Tani
          </span>
        </Link>
        <Link href="/bantuan" className="text-sm font-medium hover:underline text-white/90">
          Help Center
        </Link>
      </header>

      {/* Main Register Card */}
      <main className="flex-1 flex items-center justify-center p-6 my-4">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 flex flex-col gap-5">
          <div className="text-center flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">
              Mulai Langkah Segar Anda
            </h2>
            <p className="text-sm text-brand-text-secondary">
              Daftar sekarang untuk terhubung langsung dalam rantai pangan lokal.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="Masukkan nama lengkap Anda"
              error={errors.fullName?.message}
              disabled={isLoading}
              {...register('fullName')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Email"
                type="email"
                placeholder="contoh@email.com"
                error={errors.email?.message}
                disabled={isLoading}
                {...register('email')}
              />
              <Input
                label="Nomor Telepon"
                type="text"
                placeholder="08xxxxxxxxxx"
                error={errors.phone?.message}
                disabled={isLoading}
                {...register('phone')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Buat kata sandi"
                error={errors.password?.message}
                disabled={isLoading}
                {...register('password')}
              />
              <Input
                label="Konfirmasi Kata Sandi"
                type="password"
                placeholder="Ulangi kata sandi"
                error={errors.confirmPassword?.message}
                disabled={isLoading}
                {...register('confirmPassword')}
              />
            </div>

            {/* Role Selection Options */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">
                Peran Akun
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className={`
                  flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${selectedRole === 'customer' 
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold' 
                    : 'border-brand-border bg-white text-brand-text-secondary hover:bg-brand-bg'}
                `}>
                  <input
                    type="radio"
                    value="customer"
                    className="sr-only"
                    disabled={isLoading}
                    {...register('role')}
                  />
                  <span>Saya Pembeli</span>
                </label>
                <label className={`
                  flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${selectedRole === 'petani' 
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold' 
                    : 'border-brand-border bg-white text-brand-text-secondary hover:bg-brand-bg'}
                `}>
                  <input
                    type="radio"
                    value="petani"
                    className="sr-only"
                    disabled={isLoading}
                    {...register('role')}
                  />
                  <span>Saya Petani</span>
                </label>
              </div>
              {errors.role && <span className="text-xs text-brand-danger font-medium mt-0.5">{errors.role.message}</span>}
            </div>

            {/* Conditional Farmer Fields */}
            {selectedRole === 'petani' && (
              <div className="p-4 rounded-lg bg-brand-primary-light/40 border border-brand-primary/10 flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Informasi Mitra Kebun</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <Input
                    label="Nama Toko/Kebun"
                    type="text"
                    placeholder="contoh: Kebun Hijau Sudarso"
                    error={errors.storeName?.message}
                    disabled={isLoading}
                    {...register('storeName')}
                  />
                  <Input
                    label="Lokasi Kebun (Kota)"
                    type="text"
                    placeholder="contoh: Batu atau Lembang"
                    error={errors.storeLocation?.message}
                    disabled={isLoading}
                    {...register('storeLocation')}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth className="mt-2 text-sm py-3" isLoading={isLoading}>
              Daftar Sekarang
            </Button>
          </form>

          <p className="text-center text-sm text-brand-text-secondary mt-1">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-brand-primary font-bold hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-5 text-center text-xs text-white/70 bg-black/45 backdrop-blur-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <span>·</span>
          <Link href="/support" className="hover:underline">Support</Link>
          <span>·</span>
          <Link href="/contact" className="hover:underline">Contact Us</Link>
        </div>
        <p>© 2026 Toko Tani. Memberdayakan Petani Lokal.</p>
      </footer>
    </div>
  );
}
