'use client';

import React, { useState } from 'react';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { 
  ClipboardList, Search, Check, X, ShieldAlert, 
  UserX, ShieldCheck, HelpCircle, Eye, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_proof_url: string | null;
  total: number;
  created_at: string;
  customer_profiles: {
    full_name: string;
  } | null;
  petani_profiles: {
    full_name: string;
  } | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface AdminOperasionalClientProps {
  initialPendingOrders: Order[];
  initialProfiles: UserProfile[];
}

export const AdminOperasionalClient: React.FC<AdminOperasionalClientProps> = ({
  initialPendingOrders,
  initialProfiles,
}) => {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'verifikasi' | 'users'>('verifikasi');
  const [pendingOrders, setPendingOrders] = useState<Order[]>(initialPendingOrders);
  const [profiles, setProfiles] = useState<UserProfile[]>(initialProfiles);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('semua');

  // Modal States
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null);
  const [rejectionOrderId, setRejectionOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Verifikasi Pembayaran Handlers
  const handleApprovePayment = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Setujui verifikasi pembayaran untuk pesanan ${orderNumber}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'diproses',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Pembayaran untuk order ${orderNumber} berhasil diverifikasi!`);
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui pembayaran');
    }
  };

  const handleOpenRejection = (orderId: string) => {
    setRejectionOrderId(orderId);
    setRejectionReason('');
  };

  const handleRejectPayment = async () => {
    if (!rejectionOrderId || !rejectionReason.trim()) {
      toast.error('Masukkan alasan penolakan pembayaran');
      return;
    }

    setIsSubmittingRejection(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'dibatalkan',
          notes: `Pembayaran Ditolak Admin: ${rejectionReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rejectionOrderId);

      if (error) throw error;

      toast.success('Bukti pembayaran ditolak. Pesanan dibatalkan.');
      setPendingOrders(prev => prev.filter(o => o.id !== rejectionOrderId));
      setRejectionOrderId(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak pembayaran');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // User Moderation Handlers
  const handleUpdateUserStatus = async (userId: string, newStatus: string, userName: string) => {
    const actionLabel = newStatus === 'suspended' ? 'menangguhkan' : newStatus === 'blocked' ? 'memblokir' : 'mengaktifkan';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} akun "${userName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Akun "${userName}" berhasil di-set ke status ${newStatus}`);
      setProfiles(prev => 
        prev.map(p => p.id === userId ? { ...p, status: newStatus } : p)
      );
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status pengguna');
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.full_name.toLowerCase().includes(userSearch.toLowerCase()) || 
      p.email.toLowerCase().includes(userSearch.toLowerCase());

    const matchesRole = roleFilter === 'semua' || p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getStatusUserBadge = (status: string) => {
    const maps: Record<string, { label: string; variant: 'aktif' | 'ditangguhkan' | 'diblokir' | 'primary' }> = {
      active: { label: 'Aktif', variant: 'aktif' },
      suspended: { label: 'Ditangguhkan', variant: 'ditangguhkan' },
      blocked: { label: 'Diblokir', variant: 'diblokir' },
    };
    const mapped = maps[status] || { label: status, variant: 'primary' };
    return <Badge variant={mapped.variant as any}>{mapped.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-brand-border pb-1">
        <button
          onClick={() => setActiveTab('verifikasi')}
          className={`
            px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5
            ${activeTab === 'verifikasi' 
              ? 'border-brand-primary text-brand-primary' 
              : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}
          `}
        >
          Verifikasi Pembayaran ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`
            px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center gap-1.5
            ${activeTab === 'users' 
              ? 'border-brand-primary text-brand-primary' 
              : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}
          `}
        >
          Manajemen Pengguna ({profiles.length})
        </button>
      </div>

      {/* Render TAB 1: Verifikasi Pembayaran */}
      {activeTab === 'verifikasi' && (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black text-brand-text-primary tracking-tight">Verifikasi Manual Bukti Transfer</h2>
            <p className="text-xs text-brand-text-secondary mt-0.5">Periksa bukti transfer dan konfirmasi pembayaran manual untuk memproses pesanan.</p>
          </div>

          <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-bg border-b border-brand-border text-brand-text-secondary font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-4">ID Order</th>
                    <th className="p-4">Pembeli & Petani</th>
                    <th className="p-4">Total Bayar</th>
                    <th className="p-4">Metode Transfer</th>
                    <th className="p-4 text-center">Bukti Foto</th>
                    <th className="p-4 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60 text-brand-text-secondary">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-brand-bg/40 transition-colors">
                        <td className="p-4 font-black text-brand-text-primary">{order.order_number}</td>
                        <td className="p-4 flex flex-col gap-0.5">
                          <span className="font-semibold text-brand-text-primary">{order.customer_profiles?.full_name}</span>
                          <span className="text-[10px] text-brand-text-muted">Ke: {order.petani_profiles?.full_name}</span>
                        </td>
                        <td className="p-4 font-bold text-brand-primary">{formatRupiah(order.total)}</td>
                        <td className="p-4 uppercase text-[10px] font-bold">{order.payment_method.replace('_', ' ')}</td>
                        <td className="p-4 text-center">
                          {order.payment_proof_url ? (
                            <button
                              onClick={() => setActiveProofUrl(order.payment_proof_url)}
                              className="px-3 py-1 bg-brand-primary-light text-brand-primary hover:bg-brand-primary/20 rounded-lg text-[10px] font-bold flex gap-1 items-center mx-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> Lihat Foto
                            </button>
                          ) : (
                            <span className="text-[10px] text-brand-text-muted italic">Tidak ada</span>
                          )}
                        </td>
                        <td className="p-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprovePayment(order.id, order.order_number)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg transition-all"
                            title="Terima Pembayaran"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenRejection(order.id)}
                            className="p-1.5 bg-red-50 text-brand-danger border border-red-100 hover:bg-red-100 rounded-lg transition-all"
                            title="Tolak Pembayaran"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-brand-text-muted italic">
                        Tidak ada bukti transfer baru yang membutuhkan verifikasi saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Render TAB 2: Manajemen Pengguna */}
      {activeTab === 'users' && (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black text-brand-text-primary tracking-tight">Manajemen Keamanan Pengguna</h2>
            <p className="text-xs text-brand-text-secondary mt-0.5">Tangguhkan atau blokir pengguna yang melakukan kecurangan atau pelanggaran.</p>
          </div>

          {/* Search filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
              />
              <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-brand-text-muted">Peran:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-brand-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
              >
                <option value="semua">Semua Peran</option>
                <option value="customer">Konsumen (Pembeli)</option>
                <option value="petani">Mitra (Petani)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-bg border-b border-brand-border text-brand-text-secondary font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-4">Nama Pengguna</th>
                    <th className="p-4">Email Akun</th>
                    <th className="p-4">Peran</th>
                    <th className="p-4">Tanggal Gabung</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi Moderasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60 text-brand-text-secondary">
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map((p) => {
                      if (p.role === 'admin') return null; // skip admins
                      return (
                        <tr key={p.id} className="hover:bg-brand-bg/40 transition-colors">
                          <td className="p-4 font-bold text-brand-text-primary">{p.full_name}</td>
                          <td className="p-4">{p.email}</td>
                          <td className="p-4 uppercase text-[10px] font-bold">{p.role}</td>
                          <td className="p-4">{formatRelativeDate(p.created_at)}</td>
                          <td className="p-4">{getStatusUserBadge(p.status)}</td>
                          <td className="p-4 text-center flex items-center justify-center gap-2">
                            {p.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateUserStatus(p.id, 'suspended', p.full_name)}
                                  className="px-2 py-1 bg-amber-50 text-brand-warning hover:bg-amber-100 border border-amber-100 rounded-lg font-bold text-[9px] flex gap-1 items-center"
                                  title="Tangguhkan Akun"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" /> Tangguhkan
                                </button>
                                <button
                                  onClick={() => handleUpdateUserStatus(p.id, 'blocked', p.full_name)}
                                  className="px-2 py-1 bg-red-50 text-brand-danger hover:bg-red-100 border border-red-100 rounded-lg font-bold text-[9px] flex gap-1 items-center"
                                  title="Blokir Akun"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Blokir
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserStatus(p.id, 'active', p.full_name)}
                                  className="px-3 py-1 bg-emerald-50 text-brand-primary hover:bg-emerald-100 border border-emerald-100 rounded-lg font-bold text-[9px] flex gap-1 items-center"
                                  title="Aktifkan Kembali Akun"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Aktifkan
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-brand-text-muted italic">
                        Tidak ada pengguna terdaftar yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 1. Modal View Proof of payment */}
      <Modal isOpen={activeProofUrl !== null} onClose={() => setActiveProofUrl(null)} title="Bukti Transfer Pembayaran" size="md">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full rounded-lg overflow-hidden border border-brand-border bg-brand-bg flex items-center justify-center">
            {activeProofUrl && (
              <img src={activeProofUrl} alt="Bukti Pembayaran Manual" className="max-h-[60vh] object-contain w-full" />
            )}
          </div>
          <Button variant="outline" onClick={() => setActiveProofUrl(null)} className="font-bold text-xs mt-2">
            Tutup Pratinjau
          </Button>
        </div>
      </Modal>

      {/* 2. Modal Rejection Reason */}
      <Modal isOpen={rejectionOrderId !== null} onClose={() => setRejectionOrderId(null)} title="Tolak Pembayaran Manual" size="md">
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 text-brand-danger rounded-xl border border-red-100 text-xs flex gap-2 items-center font-semibold leading-normal">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Menolak pembayaran akan membatalkan pesanan ini secara otomatis dan memberitahu pembeli.</span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-text-secondary uppercase">Alasan Penolakan</label>
            <textarea
              placeholder="contoh: Nominal transfer tidak sesuai, atau berkas bukti buram..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmittingRejection}
              className="w-full px-4 py-2.5 rounded-lg border border-brand-border text-xs min-h-[4.5rem] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
            />
          </div>

          <div className="flex gap-3 justify-end border-t border-brand-border pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setRejectionOrderId(null)} disabled={isSubmittingRejection}>
              Batal
            </Button>
            <Button 
              onClick={handleRejectPayment}
              variant="danger" 
              className="font-bold px-4" 
              isLoading={isSubmittingRejection}
              disabled={!rejectionReason.trim()}
            >
              Tolak Pembayaran
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
export default AdminOperasionalClient;
