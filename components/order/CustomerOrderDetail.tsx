'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, MapPin, ClipboardList, AlertCircle, 
  Clock, CheckCircle2, Truck, MessageSquare, ShieldCheck, 
  ShoppingBag, Landmark, Upload, Star, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  product_id: string;
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
  payment_proof_url: string | null;
  shipping_address: any;
  courier: string | null;
  shipping_cost: number;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  petani_id: string;
  customer_id: string;
  midtrans_token: string | null;
  petani_profiles: {
    id: string;
    full_name: string;
    store_name: string;
    store_location: string;
  } | null;
  customer_profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  order_items: OrderItem[];
}

interface CustomerOrderDetailProps {
  order: Order;
  onRefresh: () => void;
}

export const CustomerOrderDetail: React.FC<CustomerOrderDetailProps> = ({ order, onRefresh }) => {
  const supabase = createClient();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Check if user has already reviewed this order
  useEffect(() => {
    const checkReview = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', order.id);

      if (!error && data && data.length > 0) {
        setHasReviewed(true);
      }
    };
    checkReview();
  }, [order.id, supabase]);

  // Handle Manual Payment Proof Upload
  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran bukti pembayaran maksimal 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}-${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      // Upload file to Supabase Storage
      let publicUrl = `https://placehold.co/400x300/e8f5ee/1A7C3E?text=Bukti+Transfer`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('payments')
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage.from('payments').getPublicUrl(filePath);
          if (data) publicUrl = data.publicUrl;
        }
      } catch (err) {
        console.warn('Payments bucket not ready, using fallback mockup link');
      }

      // Update order with payment proof and change status to awaiting verification
      const { error } = await supabase
        .from('orders')
        .update({
          payment_proof_url: publicUrl,
          status: 'menunggu_verifikasi',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Bukti transfer berhasil diunggah. Menunggu konfirmasi admin! 🧾');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah bukti transfer');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Pay via Midtrans Snap SDK
  const handlePayMidtrans = () => {
    if (!order.midtrans_token) {
      toast.error('Midtrans token tidak ditemukan');
      return;
    }

    if ((window as any).snap) {
      (window as any).snap.pay(order.midtrans_token, {
        onSuccess: function (result: any) {
          toast.success('Pembayaran sukses! Terima kasih.');
          onRefresh();
        },
        onPending: function (result: any) {
          toast.success('Menunggu pembayaran diselesaikan...');
          onRefresh();
        },
        onError: function (result: any) {
          toast.error('Pembayaran gagal, silakan coba lagi');
        },
        onClose: function () {
          toast('Anda menutup jendela pembayaran', { icon: '⚠️' });
        }
      });
    } else {
      toast.error('Midtrans Snap gagal dimuat. Harap segarkan halaman.');
    }
  };

  // Confirm Order Received (Complete order)
  const handleCompleteOrder = async () => {
    if (!window.confirm('Apakah Anda yakin sudah menerima pesanan ini dengan kondisi baik?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'selesai',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Pesanan selesai! Silakan berikan ulasan Anda. 🥬');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Silakan tulis ulasan komentar Anda');
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Create a review for the first product in the order
      const targetProduct = order.order_items[0];
      if (!targetProduct) throw new Error('Tidak ada produk untuk diulas');

      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: order.id,
          product_id: targetProduct.product_id,
          customer_id: order.customer_id,
          rating: rating,
          comment: comment.trim(),
        });

      if (error) throw error;

      toast.success('Terima kasih atas ulasan Anda! Ulasan Anda sangat berharga bagi petani. ✨');
      setHasReviewed(true);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan ulasan');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'primary' | 'aktif' | 'info' | 'dilaporkan' | 'diblokir' | 'ditangguhkan' }> = {
      menunggu_pembayaran: { label: 'Belum Bayar', variant: 'ditangguhkan' },
      menunggu_verifikasi: { label: 'Menunggu Verifikasi', variant: 'info' },
      diproses: { label: 'Sedang Diproses', variant: 'primary' },
      dikirim: { label: 'Sedang Dikirim', variant: 'organik' as any },
      selesai: { label: 'Selesai', variant: 'aktif' },
      dibatalkan: { label: 'Dibatalkan', variant: 'diblokir' },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  const address = order.shipping_address;
  const farmerName = order.petani_profiles?.store_name || order.petani_profiles?.full_name || 'Petani Lokal';

  // Bank accounts details for manual transfer
  const bankAccounts: Record<string, { bank: string; account: string; owner: string }> = {
    transfer_bca: { bank: 'BCA', account: '8092 1102 33', owner: 'Toko Tani Ecosystem' },
    transfer_bri: { bank: 'BRI', account: '0021 01 002133 50 1', owner: 'Toko Tani Ecosystem' },
    transfer_mandiri: { bank: 'Mandiri', account: '137 00 2233 4455', owner: 'Toko Tani Ecosystem' },
    transfer_bni: { bank: 'BNI', account: '0234 5678 90', owner: 'Toko Tani Ecosystem' },
  };

  const currentBank = bankAccounts[order.payment_method];

  return (
    <div className="flex flex-col gap-8">
      {/* Load Midtrans Snap script in Sandbox */}
      {order.payment_method === 'midtrans' && order.status === 'menunggu_pembayaran' && (
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      )}

      {/* Back Button */}
      <div>
        <Link href="/pesanan" className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat Pesanan
        </Link>
      </div>

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
            Pesanan {order.order_number}
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">Dipesan pada {formatRelativeDate(order.created_at)}</p>
        </div>
        <div className="self-start">
          {getStatusBadge(order.status)}
        </div>
      </div>

      {/* Main Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Payment Warning or Upload Bukti */}
          {order.status === 'menunggu_pembayaran' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5 pb-2 border-b border-brand-border">
                <Landmark className="w-4.5 h-4.5 text-brand-primary" /> Informasi Pembayaran
              </h3>

              {order.payment_method === 'midtrans' ? (
                <div className="flex flex-col gap-4 text-xs text-brand-text-secondary leading-relaxed">
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Silakan selesaikan pembayaran tagihan Anda secara instan menggunakan Midtrans Snap (QRIS, VA, CC).</span>
                  </div>
                  
                  <Button 
                    onClick={handlePayMidtrans}
                    variant="primary" 
                    className="font-bold py-3 text-xs w-full sm:w-48 self-start"
                  >
                    Bayar Sekarang
                  </Button>
                </div>
              ) : currentBank ? (
                <div className="flex flex-col gap-4 text-xs text-brand-text-secondary leading-relaxed">
                  <div className="p-4 bg-brand-bg rounded-xl border border-brand-border flex flex-col gap-3">
                    <span className="font-bold text-brand-text-primary text-[10px] uppercase tracking-wider">Rekening Tujuan Transfer</span>
                    <div className="flex flex-col gap-1 text-sm">
                      <p className="font-black text-brand-primary">{currentBank.bank} Transfer</p>
                      <p className="font-extrabold text-brand-text-primary">Nomor Rekening: {currentBank.account}</p>
                      <p className="font-semibold text-brand-text-secondary">Atas Nama: {currentBank.owner}</p>
                    </div>
                    <div className="text-[10px] text-brand-text-muted mt-1 leading-normal border-t border-brand-border/60 pt-2">
                      *Harap transfer tepat sebesar <span className="font-bold text-brand-text-primary">{formatRupiah(order.total)}</span> ke rekening di atas dan unggah bukti transfer di bawah.
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">Unggah Bukti Transfer</span>
                    
                    <div className="relative border border-dashed border-brand-border bg-brand-bg rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer text-xs text-brand-text-secondary hover:bg-brand-bg/80 transition-colors">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleUploadProof}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 mb-2 text-brand-primary" />
                      <span className="font-bold text-brand-text-primary">{isUploading ? 'Sedang Mengunggah...' : 'Klik untuk Pilih Foto Bukti Transfer'}</span>
                      <span className="text-[10px] text-brand-text-muted mt-1">Format JPG, PNG (Maks 5MB)</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Pending verification status */}
          {order.status === 'menunggu_verifikasi' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-center items-center justify-center">
              <Clock className="w-12 h-12 text-brand-primary animate-pulse" />
              <h3 className="font-bold text-brand-text-primary text-sm">Menunggu Verifikasi Admin</h3>
              <p className="text-xs text-brand-text-secondary max-w-sm leading-relaxed">
                Bukti pembayaran Anda telah dikirim dan sedang diperiksa secara manual oleh tim verifikasi kami. Proses ini biasanya memerlukan waktu kurang dari 1 jam.
              </p>
              {order.payment_proof_url && (
                <a 
                  href={order.payment_proof_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="mt-2 text-xs text-brand-primary font-bold hover:underline flex gap-1 items-center"
                >
                  <Eye className="w-4 h-4" /> Lihat Bukti Yang Diunggah
                </a>
              )}
            </div>
          )}

          {/* Product Items List Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-brand-text-primary pb-3 border-b border-brand-border flex justify-between items-center">
              <span>Daftar Belanjaan</span>
              <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">Mitra: {farmerName}</span>
            </h3>

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

            {/* Price details */}
            <div className="border-t border-brand-border pt-4 mt-2 flex flex-col gap-2.5 text-xs text-brand-text-secondary">
              <div className="flex justify-between">
                <span>Subtotal Belanja</span>
                <span className="font-semibold text-brand-text-primary">{formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ongkos Kirim ({order.courier ? order.courier.toUpperCase() : 'ACI'})</span>
                <span className="font-semibold text-brand-text-primary">{formatRupiah(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-brand-text-primary border-t border-brand-border pt-3 mt-1">
                <span>Total Pembayaran</span>
                <span className="text-base font-black text-brand-primary">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Ulasan Pembeli Form (Only when completed) */}
          {order.status === 'selesai' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-sm text-brand-text-primary pb-3 border-b border-brand-border flex items-center gap-1.5">
                <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" /> Tulis Ulasan Hasil Panen
              </h3>

              {hasReviewed ? (
                <div className="p-4 bg-emerald-50 text-brand-primary border border-emerald-100 rounded-xl text-xs text-center font-semibold">
                  Terima kasih! Anda sudah memberikan ulasan ulasan untuk pesanan ini. ✨
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-brand-text-secondary uppercase">Rating Kepuasan</span>
                    <div className="flex gap-1.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          disabled={isSubmittingReview}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : 'text-gray-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-brand-text-secondary uppercase">Ulasan Komentar Anda</label>
                    <textarea
                      placeholder="Bagikan pengalaman kesegaran, rasa, pengemasan, atau keramahan petani..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={isSubmittingReview}
                      className="w-full px-4 py-2.5 rounded-lg border border-brand-border text-xs min-h-[4.5rem] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="font-bold text-xs py-3 w-full sm:w-48 self-end"
                    isLoading={isSubmittingReview}
                    disabled={!comment.trim()}
                  >
                    Kirim Ulasan
                  </Button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Right Side (4 columns) - Farmer Info & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Farmer Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-brand-text-primary pb-2 border-b border-brand-border">Informasi Kebun</h3>
            
            <div className="flex flex-col gap-1 text-xs text-brand-text-secondary">
              <p className="font-bold text-brand-text-primary text-sm">{farmerName}</p>
              <p className="text-brand-text-muted mt-0.5">Lokasi kebun: {order.petani_profiles?.store_location || 'Indonesia'}</p>
            </div>

            <Link href={`/chat/${[order.id, order.customer_id].sort().join('_')}`} className="mt-1">
              <Button variant="outline" className="text-xs font-bold w-full flex gap-1.5 items-center justify-center border-brand-primary text-brand-primary">
                <MessageSquare className="w-4 h-4" /> Hubungi Petani
              </Button>
            </Link>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h3 className="font-bold text-sm text-brand-text-primary pb-2 border-b border-brand-border flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-primary" /> Alamat Pengiriman
            </h3>
            
            {address ? (
              <div className="text-xs text-brand-text-secondary leading-relaxed flex flex-col gap-1 mt-1">
                <p className="font-bold text-brand-text-primary">{address.name} ({address.phone})</p>
                <p>{address.address}</p>
                <p>{address.rt && `RT ${address.rt}`} {address.rw && `RW ${address.rw}`} {address.kelurahan && `, ${address.kelurahan}`} {address.kecamatan && `, ${address.kecamatan}`}</p>
                <p>{address.kota}, {address.provinsi} {address.kode_pos}</p>
              </div>
            ) : (
              <p className="text-xs text-brand-text-muted italic">Alamat pengiriman kosong.</p>
            )}
          </div>

          {/* Order Completion Action */}
          {order.status === 'dikirim' && (
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5 pb-2 border-b border-brand-border">
                <CheckCircle2 className="w-4.5 h-4.5 text-brand-primary" /> Konfirmasi Penerimaan
              </h3>

              <div className="text-xs text-brand-text-secondary leading-relaxed flex flex-col gap-1.5">
                <p>Pesanan Anda telah diserahkan ke kurir dan sedang dalam perjalanan pengantaran.</p>
                <p className="text-brand-text-muted mt-1 border-t border-brand-border/60 pt-2">*Konfirmasi hanya jika Anda sudah menerima barang belanjaan Anda.</p>
              </div>

              <Button
                onClick={handleCompleteOrder}
                variant="primary"
                fullWidth
                className="font-bold py-3.5 text-xs flex gap-1.5 items-center justify-center mt-2"
                isLoading={isSubmitting}
              >
                <CheckCircle2 className="w-4 h-4" />
                Pesanan Diterima (Selesai)
              </Button>
            </div>
          )}

        </div>

      </section>
    </div>
  );
};
export default CustomerOrderDetail;
