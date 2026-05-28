import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProfilClient from '@/components/profil/ProfilClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

export default async function ProfilePage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/profil');
  }

  // Fetch orders (for stats calculation on the client)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, petani_id')
    .eq('customer_id', user.id);

  // Fetch user addresses
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <ProfilClient 
          initialOrders={(orders as any) || []} 
          initialAddresses={(addresses as any) || []} 
        />
      </main>
      <Footer />
    </div>
  );
}
