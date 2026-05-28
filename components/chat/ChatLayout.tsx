'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, Send, Paperclip, ChevronLeft, 
  MapPin, ShoppingBag, ClipboardList, Clock, 
  CheckCheck, AlertCircle, X, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  order_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatRoom {
  room_id: string;
  participant: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  orderId: string | null;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  shipping_address: any;
  created_at: string;
  order_items: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
}

interface ChatLayoutProps {
  initialRoomId?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ initialRoomId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoomId || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderDetails | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [roomsSearch, setRoomsSearch] = useState('');
  const [isRoomOffline, setIsRoomOffline] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetOrderId = searchParams.get('orderId') || null;

  // 1. Fetch all chat rooms/conversations
  const fetchChatRooms = async () => {
    if (!user) return;
    try {
      const { data: rawMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          room_id,
          sender_id,
          receiver_id,
          order_id,
          content,
          is_read,
          created_at
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by room_id
      const roomsMap: Record<string, Message[]> = {};
      rawMessages?.forEach((msg) => {
        if (!roomsMap[msg.room_id]) {
          roomsMap[msg.room_id] = [];
        }
        roomsMap[msg.room_id].push(msg);
      });

      // Compile room details
      const compiledRooms: ChatRoom[] = [];
      
      for (const roomId of Object.keys(roomsMap)) {
        const roomMsgs = roomsMap[roomId];
        const lastMsg = roomMsgs[0];
        
        // Find other participant ID
        const otherId = lastMsg.sender_id === user.id ? lastMsg.receiver_id : lastMsg.sender_id;
        
        // Query participant details
        const { data: partProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .eq('id', otherId)
          .single();

        if (partProfile) {
          const unreadCount = roomMsgs.filter(
            (m) => m.receiver_id === user.id && !m.is_read
          ).length;

          compiledRooms.push({
            room_id: roomId,
            participant: partProfile,
            lastMessage: lastMsg.content,
            lastMessageTime: lastMsg.created_at,
            unreadCount,
            orderId: lastMsg.order_id,
          });
        }
      }

      setChatRooms(compiledRooms.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    }
  };

  // 2. Fetch messages in active room
  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Update unread status as read
      if (user) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('room_id', roomId)
          .eq('receiver_id', user.id);
      }
      
      // If there's an associated order in the room messages, load it
      const lastMsgWithOrder = data?.reverse().find(m => m.order_id);
      const currentOrderId = targetOrderId || lastMsgWithOrder?.order_id;
      if (currentOrderId) {
        fetchOrderDetails(currentOrderId);
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // 3. Fetch order details for context panel
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          shipping_address,
          created_at,
          order_items (
            name,
            quantity,
            unit
          )
        `)
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setActiveOrder(data as any);
      }
    } catch (err) {
      console.error('Error loading order details context:', err);
    }
  };

  // Auto-scroll helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  // Load messages when active room changes
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId]);

  // Supabase Realtime Listener for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // If this message belongs to the currently active room
          if (newMsg.room_id === activeRoomId) {
            setMessages((prev) => [...prev, newMsg]);
            
            // Mark read if we are receiver
            if (newMsg.receiver_id === user.id) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(() => fetchChatRooms());
            }
          } else {
            // Just update unread count list
            fetchChatRooms();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        () => {
          // If message is marked read by other participant
          if (activeRoomId) {
            fetchMessages(activeRoomId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRoomOffline(false);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRoomOffline(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, user, supabase]);

  // Send Message Logic
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeRoomId || !user) return;

    // Prevent double send
    setIsSending(true);
    const textToSend = inputMessage.trim();
    setInputMessage('');

    try {
      const activeRoom = chatRooms.find((r) => r.room_id === activeRoomId);
      const otherParticipantId = activeRoom 
        ? activeRoom.participant.id 
        : activeRoomId.replace(user.id, '').replace('_', '');

      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: activeRoomId,
          sender_id: user.id,
          receiver_id: otherParticipantId,
          order_id: targetOrderId || activeOrder?.id || null,
          content: textToSend,
          is_read: false,
        });

      if (error) throw error;
      
      // Update room list
      fetchChatRooms();
    } catch (err: any) {
      toast.error('Gagal mengirim pesan');
      setInputMessage(textToSend); // restore text
    } finally {
      setIsSending(false);
    }
  };

  // Upload attachment file
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeRoomId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      // Upload file to Supabase storage bucket `chat` (or public fallback)
      let publicUrl = `https://placehold.co/400x300/e8f5ee/1A7C3E?text=Attachment`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
          if (data) publicUrl = data.publicUrl;
        }
      } catch (err) {
        console.warn('Attachments bucket not ready');
      }

      // Send image URL as content in message
      const activeRoom = chatRooms.find((r) => r.room_id === activeRoomId);
      const otherParticipantId = activeRoom 
        ? activeRoom.participant.id 
        : activeRoomId.replace(user.id, '').replace('_', '');

      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: activeRoomId,
          sender_id: user.id,
          receiver_id: otherParticipantId,
          order_id: targetOrderId || activeOrder?.id || null,
          content: `📷 FOTO LAMPIRAN: ${publicUrl}`,
          is_read: false,
        });

      if (error) throw error;
      fetchChatRooms();
    } catch (err: any) {
      toast.error('Gagal mengunggah berkas');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    setActiveRoomId(roomId);
    router.push(`/chat/${roomId}`);
  };

  const activeRoom = chatRooms.find((r) => r.room_id === activeRoomId);
  const filteredRoomsList = chatRooms.filter(r => 
    r.participant.full_name.toLowerCase().includes(roomsSearch.toLowerCase())
  );

  return (
    <div className="bg-white border border-brand-border rounded-2xl shadow-sm h-[80vh] overflow-hidden flex flex-col md:flex-row relative">
      
      {/* 1. Left Panel - Chat list (Drawer/Sticky sidebar) */}
      <aside className={`
        w-full md:w-80 border-r border-brand-border flex flex-col h-full bg-brand-bg/10
        ${activeRoomId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Search header */}
        <div className="p-4 border-b border-brand-border flex flex-col gap-3">
          <h2 className="font-extrabold text-sm text-brand-text-primary tracking-tight">Percakapan Mitra</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama petani atau pembeli..."
              value={roomsSearch}
              onChange={(e) => setRoomsSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
            <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Room items list */}
        <div className="flex-1 overflow-y-auto divide-y divide-brand-border/60">
          {filteredRoomsList.length > 0 ? (
            filteredRoomsList.map((room) => {
              const isSelected = room.room_id === activeRoomId;
              const hasAttachment = room.lastMessage.startsWith('📷 FOTO LAMPIRAN:');
              const displayMsg = hasAttachment ? '📎 Lampiran Foto' : room.lastMessage;

              return (
                <div
                  key={room.room_id}
                  onClick={() => handleRoomSelect(room.room_id)}
                  className={`
                    flex gap-3 p-4 items-center justify-between cursor-pointer transition-colors
                    ${isSelected ? 'bg-brand-primary-light/50 border-l-4 border-brand-primary' : 'hover:bg-brand-bg'}
                  `}
                >
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-primary-light text-brand-primary font-bold text-xs uppercase flex items-center justify-center flex-shrink-0">
                      {room.participant.avatar_url ? (
                        <img src={room.participant.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        room.participant.full_name.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-xs text-brand-text-primary truncate">{room.participant.full_name}</span>
                      <span className="text-[10px] text-brand-text-muted truncate leading-tight">{displayMsg}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[9px] text-brand-text-muted">{formatRelativeDate(room.lastMessageTime)}</span>
                    {room.unreadCount > 0 && (
                      <span className="w-4 h-4 bg-brand-danger text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-[10px] text-brand-text-muted text-center py-10 italic">Tidak ada percakapan aktif</p>
          )}
        </div>
      </aside>

      {/* 2. Middle Panel - Messages Chat Box */}
      <section className={`
        flex-1 flex flex-col h-full bg-brand-bg/5
        ${!activeRoomId ? 'hidden md:flex items-center justify-center gap-4 text-center p-8 bg-brand-bg/10' : 'flex'}
      `}>
        {activeRoomId && activeRoom ? (
          <>
            {/* Header info */}
            <div className="px-5 py-3 border-b border-brand-border bg-white flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button 
                  onClick={() => { setActiveRoomId(''); router.push('/chat'); }}
                  className="md:hidden p-1 rounded-lg text-brand-text-secondary hover:bg-brand-bg mr-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-full bg-brand-primary-light text-brand-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {activeRoom.participant.avatar_url ? (
                    <img src={activeRoom.participant.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    activeRoom.participant.full_name.charAt(0)
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold text-xs text-brand-text-primary truncate">{activeRoom.participant.full_name}</span>
                  <span className="text-[9px] text-brand-primary font-bold uppercase tracking-wider">{activeRoom.participant.role}</span>
                </div>
              </div>

              {isRoomOffline && (
                <span className="text-[9px] text-brand-danger font-bold uppercase tracking-widest bg-red-50 border border-red-100 px-2 py-0.5 rounded animate-pulse">
                  Koneksi Terputus...
                </span>
              )}
            </div>

            {/* Messages scroll box */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98993f189b87b293f2f5339d87f5e8.jpg')] bg-repeat bg-[size:360px_auto]">
              
              {/* Context order header */}
              {activeOrder && (
                <div className="mx-auto max-w-sm p-3 bg-brand-primary-light text-brand-text-secondary border border-brand-primary/20 rounded-xl text-[10px] text-center flex flex-col gap-1 leading-normal font-semibold">
                  <p>Anda menghubungi {activeRoom.participant.full_name} terkait Pesanan {activeOrder.order_number}</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isAttachment = msg.content.startsWith('📷 FOTO LAMPIRAN:');
                const imgUrl = isAttachment ? msg.content.replace('📷 FOTO LAMPIRAN:', '').trim() : '';

                return (
                  <div 
                    key={msg.id}
                    className={`
                      max-w-[70%] rounded-xl px-4 py-2.5 flex flex-col shadow-sm text-xs
                      ${isMe 
                        ? 'bg-brand-primary text-white self-end rounded-tr-none' 
                        : 'bg-white text-brand-text-secondary self-start rounded-tl-none border border-brand-border'}
                    `}
                  >
                    {isAttachment ? (
                      <a href={imgUrl} target="_blank" rel="noreferrer" className="block max-w-[200px] rounded-lg overflow-hidden border border-brand-border bg-white p-1">
                        <img src={imgUrl} alt="lampiran" className="w-full h-auto object-cover max-h-48" />
                        <span className="block text-[8px] text-brand-text-muted mt-1 text-center font-bold">📎 Buka Foto</span>
                      </a>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    
                    <div className="flex items-center gap-1 self-end text-[8px] mt-1.5 opacity-80">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-blue-300' : 'text-white'}`} />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area footer */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-brand-border flex gap-3 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadAttachment}
                disabled={isUploading || isSending}
                className="hidden"
                accept="image/*"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                className="p-2 border border-brand-border rounded-xl text-brand-text-secondary hover:text-brand-primary hover:bg-brand-bg transition-colors"
                title="Kirim Foto"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder="Tulis pesan segar Anda..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending || isUploading}
                className="flex-1 px-4 py-2 border border-brand-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
              />

              <Button 
                type="submit" 
                variant="primary" 
                className="p-2.5 h-10 w-10 rounded-xl"
                isLoading={isSending}
                disabled={!inputMessage.trim()}
              >
                {!isSending && <Send className="w-4 h-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <MessageSquare className="w-12 h-12 text-brand-text-muted/30 animate-pulse" />
            <h3 className="font-extrabold text-brand-text-primary text-sm">Buka Chat Toko Tani</h3>
            <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
              Pilih percakapan di bilah kiri untuk mulai berkirim pesan segar langsung dengan petani mitra atau pembeli Anda.
            </p>
          </div>
        )}
      </section>

      {/* 3. Right Panel - Order context details (only on desktop/two-panel mode) */}
      {activeRoomId && activeOrder && (
        <aside className="hidden lg:flex w-72 border-l border-brand-border flex-col h-full bg-brand-bg/20 p-5 gap-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-brand-text-muted flex items-center gap-1">
            <ClipboardList className="w-4 h-4 text-brand-primary" /> Detail Transaksi
          </h3>
          
          <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col gap-3 text-xs shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-brand-border">
              <span className="font-extrabold text-brand-text-primary">{activeOrder.order_number}</span>
              <Badge variant="primary">{activeOrder.status.replace('_', ' ')}</Badge>
            </div>
            
            <div className="flex flex-col gap-1.5 text-brand-text-secondary">
              <span className="font-semibold text-brand-text-primary">Daftar Panen:</span>
              <ul className="list-disc list-inside flex flex-col gap-0.5 text-[11px] text-brand-text-secondary pl-1">
                {activeOrder.order_items.map((item, idx) => (
                  <li key={idx} className="truncate">{item.quantity} {item.unit} x {item.name}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center font-bold border-t border-brand-border pt-2.5 mt-1 text-xs">
              <span>Total Tagihan:</span>
              <span className="text-brand-primary">{formatRupiah(activeOrder.total)}</span>
            </div>

            <Link href={`/pesanan/${activeOrder.id}`} className="mt-2 w-full">
              <Button variant="secondary" fullWidth className="text-[10px] font-bold py-2">
                Buka Detail Penuh
              </Button>
            </Link>
          </div>
        </aside>
      )}

    </div>
  );
};
export default ChatLayout;
