'use client';

import React, { useState } from 'react';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wallet, ArrowUpRight, ArrowLeft, History, 
  HelpCircle, AlertCircle, TrendingUp, CheckCircle, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawalSchema, WithdrawalInput } from '@/lib/validators';
import Link from 'next/link';

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
}

interface PetaniSaldoClientProps {
  saldo: number;
  withdrawals: Withdrawal[];
  onRefresh: () => void;
}

export const PetaniSaldoClient: React.FC<PetaniSaldoClientProps> = ({
  saldo,
  withdrawals,
  onRefresh,
}) => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WithdrawalInput>({
    resolver: zodResolver(withdrawalSchema),
  });

  const onSubmit = async (data: WithdrawalInput) => {
    if (data.amount > saldo) {
      toast.error('Jumlah penarikan melebihi total saldo Anda');
      return;
    }

    setIsLoading(true);
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
      reset();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengajukan penarikan dana');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'primary' | 'aktif' | 'info' | 'dilaporkan' | 'diblokir' | 'ditangguhkan' }> = {
      pending: { label: 'Menunggu', variant: 'ditangguhkan' },
      diproses: { label: 'Diproses', variant: 'info' },
      selesai: { label: 'Selesai', variant: 'aktif' },
      ditolak: { label: 'Ditolak', variant: 'diblokir' },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Back button */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Manajemen Saldo & Keuangan</h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary">Kelola pendapatan dari hasil penjualan panen dan ajukan pencairan dana.</p>
      </div>

      {/* Main Layout Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side - Saldo & Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Balance card */}
          <div className="bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl p-6 text-white shadow-md flex flex-col gap-4">
            <span className="text-xs text-white/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Saldo Tersedia untuk Ditarik
            </span>
            <span className="text-3xl font-black">{formatRupiah(saldo)}</span>
            <div className="text-[10px] text-white/70 leading-relaxed border-t border-white/10 pt-3 mt-1">
              *Hanya pendapatan dari order berstatus &quot;Selesai&quot; yang dapat dicairkan.
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-brand-text-primary pb-2 border-b border-brand-border flex items-center gap-1.5">
              <ArrowUpRight className="w-4.5 h-4.5 text-brand-primary" /> Pengajuan Pencairan Dana
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Jumlah Penarikan (Rupiah)"
                type="number"
                placeholder="Min Rp 50.000"
                error={errors.amount?.message}
                disabled={isLoading}
                {...register('amount', { valueAsNumber: true })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nama Bank"
                  placeholder="BCA, Mandiri, BRI..."
                  error={errors.bankName?.message}
                  disabled={isLoading}
                  {...register('bankName')}
                />
                <Input
                  label="Nomor Rekening"
                  placeholder="123456789"
                  error={errors.accountNumber?.message}
                  disabled={isLoading}
                  {...register('accountNumber')}
                />
              </div>

              <Input
                label="Nama Pemilik Rekening"
                placeholder="Sesuai buku tabungan"
                error={errors.accountName?.message}
                disabled={isLoading}
                {...register('accountName')}
              />

              <Button type="submit" variant="primary" fullWidth className="font-bold py-3 text-xs mt-2" isLoading={isLoading}>
                Kirim Permintaan
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side - Withdrawal History (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-sm text-brand-text-primary pb-3 border-b border-brand-border flex items-center gap-1.5">
            <History className="w-4.5 h-4.5 text-brand-primary" /> Riwayat Penarikan Saldo
          </h3>

          {withdrawals.length > 0 ? (
            <div className="flex flex-col divide-y divide-brand-border">
              {withdrawals.map((w) => (
                <div key={w.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-lg flex-shrink-0
                      ${w.status === 'selesai' ? 'bg-green-50 text-brand-primary' : w.status === 'ditolak' ? 'bg-red-50 text-brand-danger' : 'bg-gray-50 text-brand-text-muted'}
                    `}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black text-brand-text-primary">{formatRupiah(w.amount)}</span>
                      <span className="text-[10px] text-brand-text-muted">
                        {w.bank_name} {w.account_number} a/n {w.account_name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 text-[10px] text-brand-text-muted">
                    <span>{formatRelativeDate(w.created_at)}</span>
                    {getStatusBadge(w.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 flex flex-col items-center justify-center gap-2">
              <History className="w-10 h-10 text-brand-text-muted/30" />
              <h4 className="font-bold text-brand-text-primary text-xs sm:text-sm">Belum Ada Riwayat</h4>
              <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
                Anda belum pernah melakukan penarikan pendapatan ke rekening bank.
              </p>
            </div>
          )}
        </div>

      </section>

    </div>
  );
};
export default PetaniSaldoClient;
