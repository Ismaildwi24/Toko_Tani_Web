import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductListClient from '@/components/product/ProductListClient';
import PetaniProductList from '@/components/product/PetaniProductList';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

interface SearchProps {
  searchParams: {
    q?: string;
    category?: string;
    sort?: string;
  };
}

export default async function Page({ searchParams }: SearchProps) {
  const supabase = createClient();
  const q = searchParams.q;
  const category = searchParams.category;
  const sort = searchParams.sort;

  const { data: { user } } = await supabase.auth.getUser();

  let role = 'customer';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile) {
      role = profile.role;
    }
  }

  if (role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (role === 'petani') {
    const { data: farmerProducts } = await supabase
      .from('products')
      .select('*')
      .eq('petani_id', user!.id)
      .order('created_at', { ascending: false });

    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <PetaniProductList initialProducts={(farmerProducts as any) || []} onRefresh={redirect.bind(null, '/produk')} />
        </main>
        <Footer />
      </div>
    );
  }

  let query = supabase
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
    .eq('is_active', true);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  if (category && category !== 'Semua') {
    if (category === 'organik') {
      // Find where tags contain 'organik' OR category is 'organik'
      query = query.or(`category.eq.organik,tags.cs.{"organik"}`);
    } else {
      query = query.eq('category', category);
    }
  }

  // Handle Sorting
  if (sort === 'termurah') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'termahal') {
    query = query.order('price', { ascending: false });
  } else if (sort === 'terpopuler') {
    query = query.order('sold_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: products } = await query;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <ProductListClient products={(products as any) || []} />
      </main>
      <Footer />
    </div>
  );
}
