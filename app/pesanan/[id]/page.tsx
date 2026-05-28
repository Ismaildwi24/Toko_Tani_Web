import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerOrderDetail from '@/components/order/CustomerOrderDetail';
import PetaniOrderDetail from '@/components/order/PetaniOrderDetail';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

export const revalidate = 0; // Fetch fresh data on every request

interface PageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const orderId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/pesanan/${orderId}`);
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'customer';

  // Query order detail
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      payment_method,
      payment_proof_url,
      shipping_address,
      courier,
      shipping_cost,
      subtotal,
      total,
      notes,
      created_at,
      petani_id,
      customer_id,
      midtrans_token,
      petani_profiles:petani_id (
        id,
        full_name,
        store_name,
        store_location
      ),
      customer_profiles:customer_id (
        full_name,
        phone
      ),
      order_items (
        id,
        product_id,
        name,
        price,
        quantity,
        subtotal,
        unit
      )
    `)
    .eq('id', orderId)
    .maybeSingle();

  // If order not found or user is not authorized to view this order
  if (!order || (role === 'customer' && order.customer_id !== user.id) || (role === 'petani' && order.petani_id !== user.id)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-brand-primary-light text-brand-primary rounded-full animate-bounce">
            <Leaf className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-black text-brand-text-primary tracking-tight">Pesanan Tidak Ditemukan</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary max-w-md">
            Maaf, pesanan yang Anda cari tidak tersedia atau Anda tidak memiliki hak akses untuk membukanya.
          </p>
          <Link href="/pesanan" className="mt-2">
            <Button variant="primary" className="font-bold">Kembali ke Riwayat</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {role === 'petani' ? (
          <PetaniOrderDetail order={order as any} onRefresh={redirect.bind(null, `/pesanan/${order.id}`)} />
        ) : (
          <CustomerOrderDetail order={order as any} onRefresh={redirect.bind(null, `/pesanan/${order.id}`)} />
        )}
      </main>
      <Footer />
    </div>
  );
}
