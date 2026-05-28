import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HomeClient from '@/components/HomeClient';

export const revalidate = 0; // Dynamic rendering, fetch fresh data on every request

export default async function Page() {
  const supabase = createClient();
  
  // Fetch active products with farmer profiles
  const { data: products } = await supabase
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <HomeClient initialProducts={(products as any) || []} />
      </main>
      <Footer />
    </div>
  );
}
