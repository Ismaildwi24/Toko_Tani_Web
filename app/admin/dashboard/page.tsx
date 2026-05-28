import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin/dashboard');
  }

  // Get user profile to check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  // 1. Today's Revenue: sum of orders total today (status in 'menunggu_verifikasi', 'diproses', 'dikirim', 'selesai')
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', startOfToday.toISOString())
    .in('status', ['menunggu_verifikasi', 'diproses', 'dikirim', 'selesai']);

  const todayRevenue = todayOrders?.reduce((sum, o) => sum + o.total, 0) || 0;

  // 2. Active Farmers count
  const { count: activeFarmers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'petani')
    .eq('status', 'active');

  // 3. Registered Customers count
  const { count: registeredCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer');

  // 4. System Commission (3.5% of completed orders total this month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: completedOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'selesai')
    .gte('created_at', startOfMonth.toISOString());

  const completedTotal = completedOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const systemCommission = Math.round(completedTotal * 0.035);

  // 5. Fetch all products for frontpage curation
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      stock,
      category,
      sold_count,
      is_featured,
      petani_profiles:petani_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  const stats = {
    todayRevenue,
    activeFarmers: activeFarmers || 0,
    registeredCustomers: registeredCustomers || 0,
    systemCommission,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardClient
          adminName={profile.full_name}
          stats={stats}
          featuredProducts={(products as any) || []}
          onRefresh={redirect.bind(null, '/admin/dashboard')}
        />
      </main>
      <Footer />
    </div>
  );
}
