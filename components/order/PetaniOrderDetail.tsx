'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, MapPin, ClipboardList, AlertCircle, 
  Clock, CheckCircle2, Truck, MessageSquare, ShieldCheck, ShoppingBag 
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
  shipping_address: any;
  courier: string | null;
  shipping_cost: number;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  customer_id: string;
  customer_profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  order_items: OrderItem[];
}

interface PetaniOrderDetailProps {
  order: Order;
  onRefresh: () => void;
}

export const PetaniOrderDetail: React.FC<PetaniOrderDetailProps> = ({ order, onRefresh }) => {
  const router = useRouter();
  const supabase = createClient();
  const [selectedCourier, setSelectedCourier] = useState(order.courier || 'aci');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const couriers = [
    { key: 'lalamove', label: 'Lalamove', time: '15-30 mnt', cost: 12000 },
    { key: 'aci', label: 'ACI', time: '20-40 mnt', cost: 10000 },
    { key: 'gojek', label: 'Gojek Instant', time: '10-25 mnt', cost: 15000 },
  ];

  const handleShipOrder = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'dikirim',
          courier: selectedCourier,
          shipping_cost: couriers.find(c => c.key === selectedCourier)?.cost || 10000,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Status diubah: Pesanan diserahkan ke kurir untuk dikirim! 🚚');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyerahkan pesanan ke kurir');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const address = order.shipping_address;
  const customerName = order.customer_profiles?.full_name || 'Pelanggan Toko';

  return (
    <div className="flex flex-col gap-8">
      
      {/* Back Button */}
      <div>
        <Link href="/pesanan" className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Semua Pesanan
        </Link>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
            Pemrosesan Pesanan {order.order_number}
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">Kelola packing hasil panen sebelum diserahkan ke kurir pengantar.</p>
        </div>
        <div className="self-start">
          {getStatusBadge(order.status)}
        </div>
      </div>

      {/* Main Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Customer Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-brand-text-primary pb-3 border-b border-brand-border flex justify-between items-center">
              <span>Informasi Pelanggan</span>
              <span className="text-[10px] text-brand-text-muted font-normal">Dipesan pada {formatRelativeDate(order.created_at)}</span>
            </h3>
            
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-brand-text-primary">{customerName}</span>
                <span className="text-[10px] text-brand-text-muted mt-0.5">Kontak: {order.customer_profiles?.phone || '-'}</span>
              </div>

              <Link href={`/chat/${[order.id, order.customer_id].sort().join('_')}`}>
                <Button variant="outline" className="text-xs font-bold px-4 py-1.5 h-8 flex gap-1.5 items-center border-brand-primary text-brand-primary">
                  <MessageSquare className="w-4 h-4" /> Hubungi Pelanggan
                </Button>
              </Link>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1 border-t border-brand-border pt-4 mt-2">
              <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">Alamat Kirim</span>
              {address ? (
                <div className="text-xs text-brand-text-secondary leading-relaxed mt-1">
                  <p className="font-semibold text-brand-text-primary">{address.name} ({address.phone})</p>
                  <p>{address.address}</p>
                  <p>
                    {address.rt && `RT ${address.rt}`} {address.rw && `RW ${address.rw}`} {address.kelurahan && `, ${address.kelurahan}`} {address.kecamatan && `, ${address.kecamatan}`}
                  </p>
                  <p>{address.kota}, {address.provinsi} {address.kode_pos}</p>
                </div>
              ) : (
                <p className="text-xs text-brand-text-muted italic">Alamat pengiriman kosong.</p>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-brand-text-primary pb-3 border-b border-brand-border">Daftar Panen Yang Dipesan</h3>
            
            <div className="flex flex-col divide-y divide-brand-border">
              {order.order_items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 items-center justify-between">
                  <div className="flex gap-3.5 items-center">
                    <div className="w-10 h-10 bg-brand-bg rounded-lg border border-brand-border flex items-center justify-center font-bold text-base flex-shrink-0">
                      🥬
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-brand-text-primary">{item.name}</span>
                      <span className="text-xs text-brand-text-muted">
                        {item.quantity} {item.unit} x {formatRupiah(item.price)}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-text-primary">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Note from customer */}
            {order.notes && (
              <div className="p-4 bg-brand-bg rounded-xl border border-brand-border text-xs mt-2 flex flex-col gap-1 text-brand-text-secondary leading-relaxed">
                <span className="font-bold text-brand-text-primary">Catatan Pembeli:</span>
                <p className="italic">&quot;{order.notes}&quot;</p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="border-t border-brand-border pt-4 mt-2 flex flex-col gap-2.5 text-xs text-brand-text-secondary">
              <div className="flex justify-between">
                <span>Subtotal Pendapatan</span>
                <span className="font-semibold text-brand-text-primary">{formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Kirim (Ditanggung Pembeli)</span>
                <span className="font-semibold text-brand-text-primary">{formatRupiah(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-brand-text-primary border-t border-brand-border pt-3 mt-1">
                <span>Total Dana Transaksi</span>
                <span className="text-base font-black text-brand-primary">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols) - Courier and Action */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Packaging standard check */}
          <div className="p-4 bg-emerald-50 border border-brand-primary/20 text-brand-text-secondary rounded-2xl flex gap-2.5 items-start">
            <ShieldCheck className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-xs text-brand-primary">Standar Kemasan Toko Tani</span>
              <p className="text-[10px] text-brand-text-muted leading-relaxed">
                Pastikan sayur telah dicuci bersih dan dikemas menggunakan plastik berlubang udara agar kelembapan terjaga selama proses pengantaran kurir.
              </p>
            </div>
          </div>

          {/* Action Box */}
          {order.status === 'diproses' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5 pb-2 border-b border-brand-border">
                <Truck className="w-4.5 h-4.5 text-brand-primary" /> Pengiriman Panen
              </h3>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">Pilih Armada Kurir</span>
                {couriers.map((c) => (
                  <label 
                    key={c.key}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs
                      ${selectedCourier === c.key ? 'border-brand-primary bg-brand-primary-light/50 font-bold' : 'border-brand-border hover:bg-brand-bg'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="courier_petani"
                        value={c.key}
                        checked={selectedCourier === c.key}
                        onChange={() => setSelectedCourier(c.key)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span>{c.label}</span>
                        <span className="text-[10px] text-brand-text-muted font-normal">Estimasi {c.time}</span>
                      </span>
                    </div>
                    <span className="font-bold text-brand-primary">{formatRupiah(c.cost)}</span>
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 mt-2">
                <Button
                  onClick={handleShipOrder}
                  variant="primary"
                  fullWidth
                  className="font-bold py-3.5 text-xs flex gap-1.5 items-center justify-center"
                  isLoading={isSubmitting}
                >
                  <Truck className="w-4 h-4" />
                  Pesanan Siap, Kirim Sekarang
                </Button>
                
                <Link href="/dashboard" className="w-full">
                  <Button variant="outline" fullWidth className="text-xs h-10 border-brand-border text-brand-text-secondary hover:bg-brand-bg font-semibold">
                    Kembali
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* If already shipped or completed */}
          {order.status !== 'diproses' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-sm text-brand-text-primary pb-2 border-b border-brand-border flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-brand-primary" /> Riwayat Status
              </h3>
              
              <div className="flex flex-col gap-2 text-xs leading-relaxed text-brand-text-secondary">
                <p>Status: {getStatusBadge(order.status)}</p>
                {order.courier && (
                  <p>Ekspedisi Pengiriman: <span className="font-bold uppercase text-brand-text-primary">{order.courier}</span></p>
                )}
                {order.payment_method && (
                  <p>Metode Pembayaran: <span className="font-bold uppercase text-brand-text-primary">{order.payment_method.replace('_', ' ')}</span></p>
                )}
              </div>
            </div>
          )}

        </div>

      </section>

    </div>
  );
};
export default PetaniOrderDetail;
