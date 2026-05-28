'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, MessageSquare, AlertCircle, 
  Clock, CheckCircle2, Truck 
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  unit: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  shipping_cost: number;
  subtotal: number;
  total: number;
  created_at: string;
  customer_id: string;
  customer_profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  order_items: OrderItem[];
}

interface PetaniOrderHistoryProps {
  orders: Order[];
}

export const PetaniOrderHistory: React.FC<PetaniOrderHistoryProps> = ({ orders }) => {
  const [activeTab, setActiveTab] = useState('aktif');

  const getFilteredOrders = () => {
    if (activeTab === 'baru') {
      return orders.filter(o => o.status === 'menunggu_pembayaran' || o.status === 'menunggu_verifikasi');
    }
    if (activeTab === 'aktif') {
      return orders.filter(o => o.status === 'diproses' || o.status === 'dikirim');
    }
    return orders.filter(o => o.status === 'selesai' || o.status === 'dibatalkan');
  };

  const filteredOrders = getFilteredOrders();

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'primary' | 'aktif' | 'info' | 'dilaporkan' | 'diblokir' | 'ditangguhkan' }> = {
      menunggu_pembayaran: { label: 'Belum Bayar', variant: 'ditangguhkan' },
      menunggu_verifikasi: { label: 'Menunggu Verifikasi', variant: 'info' },
      diproses: { label: 'Perlu Diproses', variant: 'primary' },
      dikirim: { label: 'Sedang Dikirim', variant: 'organik' as any },
      selesai: { label: 'Selesai', variant: 'aktif' },
      dibatalkan: { label: 'Dibatalkan', variant: 'diblokir' },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Pesanan Masuk Mitra</h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary">Kelola pemenuhan pesanan dan packing sayur segar pesanan pelanggan.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-border">
        {[
          { label: 'Perlu Diproses', value: 'aktif', count: orders.filter(o => o.status === 'diproses' || o.status === 'dikirim').length },
          { label: 'Baru / Belum Bayar', value: 'baru', count: orders.filter(o => o.status === 'menunggu_pembayaran' || o.status === 'menunggu_verifikasi').length },
          { label: 'Riwayat Selesai', value: 'selesai', count: orders.filter(o => o.status === 'selesai' || o.status === 'dibatalkan').length },
        ].map(tab => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5
                ${isActive 
                  ? 'border-brand-primary text-brand-primary' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}
              `}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text-secondary border border-brand-border'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const customerName = order.customer_profiles?.full_name || 'Pelanggan Toko';
            const itemsPreview = order.order_items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', ');

            return (
              <div 
                key={order.id}
                className="bg-white border border-brand-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
              >
                
                <div className="flex flex-col gap-2.5">
                  {/* Order meta */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-brand-text-primary text-sm">{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {/* Details */}
                  <div className="text-xs text-brand-text-secondary flex flex-col gap-1.5 border-t border-brand-border pt-3">
                    <p>Pembeli: <span className="font-bold text-brand-text-primary">{customerName}</span></p>
                    <p>Waktu Order: <span>{formatRelativeDate(order.created_at)}</span></p>
                    <p className="line-clamp-2 text-brand-text-muted mt-1 bg-brand-bg p-2 rounded border border-brand-border">
                      {itemsPreview}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-brand-border pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-brand-text-muted font-bold uppercase">Total Hasil</span>
                    <span className="text-sm font-black text-brand-primary">{formatRupiah(order.subtotal)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/chat/${[order.id, order.customer_id].sort().join('_')}`}>
                      <button className="p-2 border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg transition-all">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link href={`/pesanan/${order.id}`}>
                      <Button variant="primary" className="text-xs font-bold px-4 py-2 h-9">
                        {order.status === 'diproses' ? 'Proses Pesanan' : 'Lihat Detail'}
                      </Button>
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-4">
          <ClipboardList className="w-16 h-16 text-brand-text-muted/30" />
          <h3 className="font-bold text-brand-text-primary">Tidak Ada Pesanan</h3>
          <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
            Tidak ada pesanan masuk untuk kategori filter &quot;{activeTab}&quot; saat ini.
          </p>
        </div>
      )}

    </div>
  );
};
export default PetaniOrderHistory;
