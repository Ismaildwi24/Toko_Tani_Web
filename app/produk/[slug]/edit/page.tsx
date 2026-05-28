import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EditProductClient from '@/components/product/EditProductClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

export const revalidate = 0; // Fetch fresh data on every request

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function EditPage({ params }: PageProps) {
  const supabase = createClient();
  const productId = params.slug;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/produk/${productId}/edit`);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'petani') {
    redirect('/');
  }

  // Fetch product
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('petani_id', user.id)
    .maybeSingle();

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-brand-primary-light text-brand-primary rounded-full animate-bounce">
            <Leaf className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-black text-brand-text-primary tracking-tight">Hasil Panen Tidak Ditemukan</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary max-w-md">
            Maaf, produk hasil panen yang ingin Anda edit tidak tersedia atau Anda tidak memiliki wewenang untuk merubahnya.
          </p>
          <Link href="/produk" className="mt-2">
            <Button variant="primary" className="font-bold">Kembali ke Kelola Panen</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <EditProductClient product={product as any} />
      <Footer />
    </div>
  );
}
