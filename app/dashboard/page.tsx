import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PetaniDashboardClient from '@/components/dashboard/PetaniDashboardClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'petani') {
    redirect('/');
  }

  // Calculate Saldo:
  // Saldo = sum(orders.subtotal) where status='selesai' and petani_id = user.id
  // minus sum(withdrawals.amount) where status='selesai' and petani_id = user.id
  const { data: finishedOrders } = await supabase
    .from('orders')
    .select('subtotal')
    .eq('petani_id', user.id)
    .eq('status', 'selesai');

  const { data: finishedWithdrawals } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('petani_id', user.id)
    .eq('status', 'selesai');

  const totalIncome = finishedOrders?.reduce((sum, o) => sum + o.subtotal, 0) || 0;
  const totalWithdrawals = finishedWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
  const saldo = totalIncome - totalWithdrawals;

  // Fetch active orders (limit 5)
  const { data: activeOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total,
      subtotal,
      created_at,
      customer_profiles:customer_id (
        full_name
      )
    `)
    .eq('petani_id', user.id)
    .in('status', ['menunggu_pembayaran', 'menunggu_verifikasi', 'diproses', 'dikirim'])
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PetaniDashboardClient 
          farmerName={profile.full_name} 
          saldo={saldo} 
          activeOrders={(activeOrders as any) || []} 
          onRefresh={redirect.bind(null, '/dashboard')}
        />
      </main>
      <Footer />
    </div>
  );
}
