'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { 
  Sprout, Wallet, ArrowUpRight, ClipboardList, MessageSquare, 
  ArrowRight, AlertCircle, TrendingUp, Sparkles, Building 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawalSchema, WithdrawalInput } from '@/lib/validators';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  customer_profiles: {
    full_name: string;
  } | null;
}

interface PetaniDashboardClientProps {
  farmerName: string;
  saldo: number;
  activeOrders: Order[];
  onRefresh: () => void;
}

export const PetaniDashboardClient: React.FC<PetaniDashboardClientProps> = ({
  farmerName,
  saldo,
  activeOrders,
  onRefresh,
}) => {
  const supabase = createClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WithdrawalInput>({
    resolver: zodResolver(withdrawalSchema),
  });

  const onWithdrawSubmit = async (data: WithdrawalInput) => {
    if (data.amount > saldo) {
      toast.error('Jumlah penarikan melebihi total saldo Anda');
      return;
    }

    setIsWithdrawLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('withdrawals')
        .insert({
          petani_id: user.id,
          amount: data.amount,
          bank_name: data.bankName,
          account_number: data.accountNumber,
          account_name: data.accountName,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Permintaan penarikan dikirim, diproses dalam 1x24 jam');
      setIsWithdrawOpen(false);
      reset();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengajukan penarikan dana');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'primary' | 'aktif' | 'info' | 'dilaporkan' | 'diblokir' | 'ditangguhkan' }> = {
      menunggu_pembayaran: { label: 'Belum Bayar', variant: 'ditangguhkan' },
      menunggu_verifikasi: { label: 'Verifikasi', variant: 'info' },
      diproses: { label: 'Perlu Diproses', variant: 'primary' },
      dikirim: { label: 'Dikirim', variant: 'organik' as any },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
            Halo, {farmerName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">Selamat datang kembali di Dashboard Mitra Toko Tani Anda.</p>
        </div>
        <span className="text-xs font-bold text-brand-text-muted bg-brand-primary-light text-brand-primary px-3.5 py-1.5 rounded-lg border border-brand-primary/10 self-start">
          Mitra Tani Terverifikasi 🥬
        </span>
      </div>

      {/* Saldo and Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Saldo Box (8 cols) */}
        <div className="md:col-span-8 bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl p-6 sm:p-8 text-white flex flex-col justify-between gap-6 shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> Total Saldo Toko
              </span>
              <span className="text-3xl sm:text-4xl font-black mt-1">
                {formatRupiah(saldo)}
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-white/15 pt-6">
            <Link href="/produk/tambah" className="flex-1 min-w-[140px]">
              <Button variant="secondary" className="w-full bg-white hover:bg-white/95 text-brand-primary font-bold border-0 text-xs py-3 rounded-xl flex gap-1.5 items-center justify-center">
                <Sprout className="w-4 h-4" /> Upload Panen Baru
              </Button>
            </Link>
            <button 
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 min-w-[140px] px-5 py-3 bg-white/15 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex gap-1.5 items-center justify-center border border-white/20"
            >
              Tarik Dana <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick statistics card (4 cols) */}
        <div className="md:col-span-4 bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-xs uppercase text-brand-text-muted tracking-wider">Aktivitas Hari Ini</h3>
            <p className="text-[10px] text-brand-text-secondary mt-0.5">Informasi singkat perkembangan toko.</p>
          </div>

          <div className="flex flex-col gap-4 border-t border-brand-border pt-4 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-brand-text-secondary">Pesanan Perlu Diproses</span>
              <span className="font-extrabold text-brand-primary text-sm">{activeOrders.filter(o => o.status === 'diproses').length}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-brand-text-secondary">Pesanan Sedang Dikirim</span>
              <span className="font-extrabold text-brand-primary text-sm">{activeOrders.filter(o => o.status === 'dikirim').length}</span>
            </div>
          </div>
        </div>

      </section>

      {/* Active Orders List */}
      <section className="flex flex-col gap-5">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-lg font-black text-brand-text-primary tracking-tight">Pesanan Aktif Mitra</h2>
            <p className="text-xs text-brand-text-secondary mt-0.5">Daftar pesanan baru yang harus dipersiapkan hari ini.</p>
          </div>
          <Link href="/pesanan" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
            Lihat Semua Pesanan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeOrders.length > 0 ? (
          <div className="flex flex-col gap-3">
            {activeOrders.map((order) => (
              <div 
                key={order.id}
                className="bg-white border border-brand-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-primary-light text-brand-primary rounded-lg border border-brand-primary/10 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    📦
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-brand-text-primary text-sm">{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-brand-text-secondary">
                      Pembeli: <span className="font-bold text-brand-text-primary">{order.customer_profiles?.full_name || 'Pelanggan'}</span> • {formatRelativeDate(order.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[9px] text-brand-text-muted font-bold uppercase">Hasil Bersih</span>
                    <p className="text-sm font-black text-brand-primary">{formatRupiah(order.subtotal)}</p>
                  </div>
                  
                  <Link href={`/pesanan/${order.id}`}>
                    <Button variant="secondary" className="text-xs font-bold px-4 py-2 h-9 flex gap-1 items-center">
                      Proses Pesanan <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-4">
            <ClipboardList className="w-12 h-12 text-brand-text-muted/30" />
            <h4 className="font-bold text-brand-text-primary text-xs sm:text-sm">Tidak Ada Pesanan Aktif</h4>
            <p className="text-xs text-brand-text-secondary max-w-xs">
              Semua pesanan masuk sudah terkirim atau selesai. Nikmati hasil panen Anda!
            </p>
          </div>
        )}
      </section>

      {/* Tarik Dana Modal */}
      <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Penarikan Saldo Toko" size="md">
        <form onSubmit={handleSubmit(onWithdrawSubmit)} className="flex flex-col gap-4">
          <div className="p-4 bg-brand-primary-light/50 border border-brand-primary/10 rounded-xl flex gap-2.5 text-xs text-brand-text-secondary">
            <AlertCircle className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-brand-primary">Saldo Tersedia: {formatRupiah(saldo)}</span>
              <p className="text-[10px] text-brand-text-muted">Proses transfer penarikan dana memerlukan waktu verifikasi 1x24 jam kerja.</p>
            </div>
          </div>

          <Input
            label="Jumlah Penarikan (Rupiah)"
            type="number"
            placeholder="Min Rp 50.000"
            error={errors.amount?.message}
            disabled={isWithdrawLoading}
            {...register('amount', { valueAsNumber: true })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nama Bank"
              placeholder="BCA, Mandiri, BRI..."
              error={errors.bankName?.message}
              disabled={isWithdrawLoading}
              {...register('bankName')}
            />
            <Input
              label="Nomor Rekening"
              placeholder="123456789"
              error={errors.accountNumber?.message}
              disabled={isWithdrawLoading}
              {...register('accountNumber')}
            />
          </div>

          <Input
            label="Nama Pemilik Rekening"
            placeholder="Sesuai buku tabungan"
            error={errors.accountName?.message}
            disabled={isWithdrawLoading}
            {...register('accountName')}
          />

          <div className="flex gap-3 justify-end border-t border-brand-border pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsWithdrawOpen(false)} disabled={isWithdrawLoading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isWithdrawLoading}>
              Kirim Permintaan
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
export default PetaniDashboardClient;
