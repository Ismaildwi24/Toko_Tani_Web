import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminOperasionalClient from '@/components/admin/AdminOperasionalClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function AdminOperasionalPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin/operasional');
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

  // Fetch orders waiting manual verification (status='menunggu_verifikasi' and payment_method!='midtrans')
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      payment_method,
      payment_proof_url,
      total,
      created_at,
      customer_profiles:customer_id (
        full_name
      ),
      petani_profiles:petani_id (
        full_name
      )
    `)
    .eq('status', 'menunggu_verifikasi')
    .neq('payment_method', 'midtrans')
    .order('created_at', { ascending: false });

  // Fetch all profiles excluding admin for moderation
  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      status,
      created_at
    `)
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <AdminOperasionalClient
          initialPendingOrders={(pendingOrders as any) || []}
          initialProfiles={(profiles as any) || []}
        />
      </main>
      <Footer />
    </div>
  );
}
