import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatLayout from '@/components/chat/ChatLayout';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fetch fresh data on every request

interface PageProps {
  params: {
    roomId: string;
  };
}

export default async function ChatRoomPage({ params }: PageProps) {
  const supabase = createClient();
  const roomId = params.roomId;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/chat/${roomId}`);
  }

  // Security check: ensure user is participant in this roomId
  // roomId is alphabetical joined with underscore, e.g. '{userId1}_{userId2}'
  const userParts = roomId.split('_');
  if (!userParts.includes(user.id)) {
    redirect('/chat');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <ChatLayout initialRoomId={roomId} />
      </main>
      <Footer />
    </div>
  );
}
