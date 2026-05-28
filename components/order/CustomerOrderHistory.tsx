'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, ShoppingBag, MessageSquare, ChevronRight, 
  Clock, CheckCircle2, Truck, AlertCircle, HelpCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

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
  payment_method: string;
  shipping_cost: number;
  subtotal: number;
  total: number;
  created_at: string;
  petani_id: string;
  midtrans_token: string | null;
  petani_profiles: {
    full_name: string;
    store_name: string;
    store_location: string;
  } | null;
  order_items: OrderItem[];
}

interface CustomerOrderHistoryProps {
  orders: Order[];
  onRefresh: () => void;
}

export const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({ orders, onRefresh }) => {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('semua');

  const statusTabs = [
    { label: 'Semua', value: 'semua' },
    { label: 'Belum Bayar', value: 'menunggu_pembayaran' },
    { label: 'Verifikasi', value: 'menunggu_verifikasi' },
    { label: 'Diproses', value: 'diproses' },
    { label: 'Dikirim', value: 'dikirim' },
    { label: 'Selesai', value: 'selesai' },
  ];

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'semua') return true;
    return order.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'primary' | 'aktif' | 'info' | 'dilaporkan' | 'diblokir' | 'ditangguhkan' }> = {
      menunggu_pembayaran: { label: 'Menunggu Pembayaran', variant: 'ditangguhkan' },
      menunggu_verifikasi: { label: 'Menunggu Verifikasi', variant: 'info' },
      diproses: { label: 'Diproses', variant: 'primary' },
      dikirim: { label: 'Dikirim', variant: 'organik' as any }, // custom green
      selesai: { label: 'Selesai', variant: 'aktif' },
      dibatalkan: { label: 'Dibatalkan', variant: 'diblokir' },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  const handlePayMidtrans = (order: Order) => {
    const snapToken = order.midtrans_token;
    if (!snapToken) {
      toast.error('Token pembayaran tidak ditemukan. Silakan hubungi admin.');
      return;
    }

    if ((window as any).snap) {
      (window as any).snap.pay(snapToken, {
        onSuccess: function (result: any) {
          toast.success('Pembayaran berhasil!');
          onRefresh();
        },
        onPending: function (result: any) {
          toast.success('Menunggu pembayaran Anda...');
          onRefresh();
        },
        onError: function (result: any) {
          toast.error('Pembayaran gagal, silakan coba lagi');
        },
        onClose: function () {
          toast('Jendela pembayaran ditutup', { icon: '⚠️' });
        }
      });
    } else {
      toast.error('Snap payment library tidak termuat. Muat ulang halaman.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Riwayat Pesanan Saya</h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary">Pantau status transaksi dan pengiriman sayur segar Anda.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-brand-border">
        {statusTabs.map((tab) => {
          const count = tab.value === 'semua' ? orders.length : orders.filter(o => o.status === tab.value).length;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5
                ${isActive 
                  ? 'border-brand-primary text-brand-primary' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}
              `}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text-secondary border border-brand-border'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order Cards */}
      {filteredOrders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => {
            const firstItem = order.order_items?.[0];
            const itemsCount = order.order_items?.length || 0;
            const farmerName = order.petani_profiles?.store_name || order.petani_profiles?.full_name || 'Petani Lokal';
            const farmerLocation = order.petani_profiles?.store_location || 'Indonesia';

            return (
              <div 
                key={order.id} 
                className="bg-white border border-brand-border rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-4 text-xs text-brand-text-secondary">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold text-brand-text-primary text-sm">{order.order_number}</span>
                    <span>•</span>
                    <span>{formatRelativeDate(order.created_at)}</span>
                    <span>•</span>
                    <span>Mitra: <span className="font-bold text-brand-text-primary">{farmerName} ({farmerLocation})</span></span>
                  </div>
                  <div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Items Preview */}
                <div className="flex gap-4">
                  {/* Mock item image or generic box */}
                  <div className="w-16 h-16 bg-brand-primary-light text-brand-primary rounded-lg flex items-center justify-center font-bold text-lg border border-brand-primary/10">
                    🥬
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      {firstItem ? (
                        <p className="text-sm font-bold text-brand-text-primary">
                          {firstItem.name}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-brand-text-primary">Sayuran Segar</p>
                      )}
                      {firstItem && (
                        <p className="text-xs text-brand-text-secondary mt-0.5">
                          {firstItem.quantity} x {formatRupiah(firstItem.price)} / {firstItem.unit}
                        </p>
                      )}
                    </div>

                    {itemsCount > 1 && (
                      <p className="text-[10px] text-brand-text-muted font-bold mt-1">
                        + {itemsCount - 1} barang lainnya
                      </p>
                    )}
                  </div>

                  {/* Total pricing */}
                  <div className="text-right flex flex-col justify-center border-l border-brand-border pl-6 pr-2">
                    <span className="text-[10px] text-brand-text-muted font-medium">Total Belanja</span>
                    <span className="text-sm font-black text-brand-primary mt-0.5">
                      {formatRupiah(order.total)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-brand-border pt-4 mt-2">
                  <Link href={`/chat/${[order.id, order.petani_id].sort().join('_')}`}>
                    <Button variant="outline" className="text-xs font-bold px-4 py-2 h-9 flex gap-1.5 items-center border-brand-border text-brand-text-secondary hover:bg-brand-bg">
                      <MessageSquare className="w-4 h-4" /> Hubungi Petani
                    </Button>
                  </Link>

                  <Link href={`/pesanan/${order.id}`}>
                    <Button variant="secondary" className="text-xs font-bold px-4 py-2 h-9">
                      Detail Pesanan
                    </Button>
                  </Link>

                  {order.status === 'menunggu_pembayaran' && (
                    order.payment_method === 'midtrans' ? (
                      <Button 
                        onClick={() => handlePayMidtrans(order)}
                        variant="primary" 
                        className="text-xs font-bold px-5 py-2 h-9"
                      >
                        Bayar Sekarang
                      </Button>
                    ) : (
                      <Link href={`/pesanan/${order.id}`}>
                        <Button 
                          variant="primary" 
                          className="text-xs font-bold px-5 py-2 h-9"
                        >
                          Upload Bukti Transfer
                        </Button>
                      </Link>
                    )
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-4">
          <ClipboardList className="w-16 h-16 text-brand-text-muted/30" />
          <h3 className="font-bold text-brand-text-primary">Belum Ada Pesanan</h3>
          <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
            Anda belum melakukan pemesanan hasil panen. Mulai dukung pahlawan pangan lokal hari ini!
          </p>
          <Link href="/produk" className="mt-1">
            <Button variant="primary" className="text-xs font-bold">Belanja Sekarang</Button>
          </Link>
        </div>
      )}

    </div>
  );
};
export default CustomerOrderHistory;
