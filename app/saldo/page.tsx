import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PetaniSaldoClient from '@/components/dashboard/PetaniSaldoClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function SaldoPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/saldo');
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

  // Fetch all withdrawals history
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('petani_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PetaniSaldoClient 
          saldo={saldo} 
          withdrawals={(withdrawals as any) || []} 
          onRefresh={redirect.bind(null, '/saldo')}
        />
      </main>
      <Footer />
    </div>
  );
}
