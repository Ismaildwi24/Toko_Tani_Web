import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductDetailClient from '@/components/product/ProductDetailClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

export const revalidate = 0; // Fetch fresh data on every request

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function Page({ params }: PageProps) {
  const supabase = createClient();
  const slug = params.slug;

  // 1. Fetch main product details
  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      price,
      unit,
      stock,
      category,
      tags,
      images,
      is_featured,
      sold_count,
      petani_id,
      profiles:petani_id (
        id,
        full_name,
        store_name,
        store_location
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  // 404 Kustom jika produk tidak ditemukan
  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-brand-primary-light text-brand-primary rounded-full animate-bounce">
            <Leaf className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-black text-brand-text-primary tracking-tight">Panenan Tidak Ditemukan</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary max-w-md">
            Maaf, produk hasil panen yang Anda cari tidak tersedia, sudah habis terjual, atau telah dihapus oleh petani.
          </p>
          <Link href="/produk" className="mt-2">
            <Button variant="primary" className="font-bold">Kembali ke Katalog</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Fetch product reviews with customer profiles
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      image_url,
      created_at,
      profiles:customer_id (
        full_name,
        avatar_url
      )
    `)
    .eq('product_id', product.id)
    .order('created_at', { ascending: false });

  // 3. Fetch category recommendations (excluding current product, limit 4)
  const { data: recommendations } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      price,
      unit,
      stock,
      category,
      tags,
      images,
      is_featured,
      sold_count,
      petani_id,
      profiles:petani_id (
        full_name,
        store_name,
        store_location
      )
    `)
    .eq('category', product.category)
    .eq('is_active', true)
    .neq('id', product.id)
    .order('sold_count', { ascending: false })
    .limit(4);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetailClient 
          product={product as any} 
          reviews={(reviews as any) || []} 
          recommendations={(recommendations as any) || []} 
        />
      </main>
      <Footer />
    </div>
  );
}
