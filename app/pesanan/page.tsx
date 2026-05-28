import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerOrderHistory from '@/components/order/CustomerOrderHistory';
import PetaniOrderHistory from '@/components/order/PetaniOrderHistory';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function OrdersPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/pesanan');
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'customer';

  if (role === 'admin') {
    redirect('/admin/operasional');
  }

  // Fetch orders based on role
  let orders: any[] = [];

  if (role === 'petani') {
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        shipping_cost,
        subtotal,
        total,
        created_at,
        customer_id,
        customer_profiles:customer_id (
          full_name,
          phone
        ),
        order_items (
          id,
          name,
          price,
          quantity,
          subtotal,
          unit
        )
      `)
      .eq('petani_id', user.id)
      .order('created_at', { ascending: false });

    orders = data || [];
  } else {
    // Customer
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_method,
        shipping_cost,
        subtotal,
        total,
        created_at,
        petani_id,
        midtrans_token,
        petani_profiles:petani_id (
          full_name,
          store_name,
          store_location
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
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    orders = data || [];
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {role === 'petani' ? (
          <PetaniOrderHistory orders={orders} />
        ) : (
          <CustomerOrderHistory orders={orders} onRefresh={redirect.bind(null, '/pesanan')} />
        )}
      </main>
      <Footer />
    </div>
  );
}
