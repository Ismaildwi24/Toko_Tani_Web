'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { isValidPhone } from '@/lib/utils';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '';
  const supabase = createClient();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [greetingName, setGreetingName] = useState('!');

  useEffect(() => {
    // Check local storage for last user name to greet nicely
    const cached = localStorage.getItem('toko_tani_last_user');
    if (cached) {
      setGreetingName(`, ${cached}!`);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role || 'customer';
      if (redirectPath) {
        router.push(redirectPath);
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'petani') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [user, router, redirectPath]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      let email = data.emailOrPhone;

      // Handle phone login lookup
      if (isValidPhone(data.emailOrPhone)) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('phone', data.emailOrPhone)
          .maybeSingle();

        if (profileError || !profile) {
          toast.error('Nomor telepon tidak terdaftar');
          setIsLoading(false);
          return;
        }
        email = profile.email;
      }

      // Perform auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (authError) {
        // Map error messages friendly
        if (authError.message.includes('Invalid login credentials')) {
          toast.error('Email, nomor telepon, atau kata sandi salah');
        } else {
          toast.error(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Check if user is blocked or suspended
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        if (profile.status === 'blocked') {
          await supabase.auth.signOut();
          toast.error('Akun Anda telah diblokir. Hubungi support.');
          setIsLoading(false);
          return;
        }
        if (profile.status === 'suspended') {
          await supabase.auth.signOut();
          toast.error('Akun Anda telah ditangguhkan sementara.');
          setIsLoading(false);
          return;
        }

        // Cache user name for greeting next time
        const firstName = profile.full_name.split(' ')[0];
        localStorage.setItem('toko_tani_last_user', firstName);
      }

      toast.success('Berhasil masuk! Selamat berbelanja 🥬');
      
      // Redirect happens in useEffect
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };



  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Masukkan email Anda');
      return;
    }
    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/profil`,
      });
      if (error) throw error;
      toast.success('Tautan reset kata sandi telah dikirim ke email Anda');
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim email reset');
    } finally {
      setIsResetLoading(false);
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

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 flex flex-col gap-6">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">
              Selamat Datang Kembali{greetingName}
            </h2>
            <p className="text-sm text-brand-text-secondary">
              Masuk untuk mulai belanja sayur segar langsung dari petani.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email atau Nomor Telepon"
              type="text"
              placeholder="contoh@email.com atau 0812xxxx"
              error={errors.emailOrPhone?.message}
              disabled={isLoading}
              {...register('emailOrPhone')}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-xs text-brand-primary font-bold hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <Input
                type="password"
                placeholder="Masukkan kata sandi"
                error={errors.password?.message}
                disabled={isLoading}
                {...register('password')}
              />
            </div>

            <Button type="submit" variant="primary" fullWidth className="mt-2" isLoading={isLoading}>
              Masuk
            </Button>
          </form>



          <p className="text-center text-sm text-brand-text-secondary mt-2">
            Belum punya akun?{' '}
            <Link href="/register" className="text-brand-primary font-bold hover:underline">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center text-xs text-white/70 bg-black/45 backdrop-blur-sm flex flex-col md:flex-row gap-4 items-center justify-between">
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

      {/* Reset Password Modal */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title="Reset Kata Sandi">
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <p className="text-sm text-brand-text-secondary">
            Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.
          </p>
          <Input
            label="Email"
            type="email"
            placeholder="contoh@email.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            disabled={isResetLoading}
          />
          <div className="flex gap-3 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)} disabled={isResetLoading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isResetLoading}>
              Kirim Tautan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-primary text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
