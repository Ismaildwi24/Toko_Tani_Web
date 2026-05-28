'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { 
  Award, Clock, CheckCircle2, Truck, Star, LogOut, 
  MapPin, Store, CreditCard, ChevronRight, HelpCircle, 
  Heart, AlertCircle, Edit, User, Mail, Phone 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  status: string;
  total: number;
  petani_id: string;
}

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  rt: string | null;
  rw: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string;
  provinsi: string;
  kode_pos: string | null;
  is_primary: boolean;
}

interface ProfilClientProps {
  initialOrders: Order[];
  initialAddresses: Address[];
}

export const ProfilClient: React.FC<ProfilClientProps> = ({
  initialOrders,
  initialAddresses,
}) => {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const supabase = createClient();

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  
  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [storeName, setStoreName] = useState(profile?.store_name || '');
  const [storeLocation, setStoreLocation] = useState(profile?.store_location || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setStoreName(profile.store_name || '');
      setStoreLocation(profile.store_location || '');
    }
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    toast.success('Berhasil keluar akun');
    router.push('/login');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          store_name: profile?.role === 'petani' ? storeName : null,
          store_location: profile?.role === 'petani' ? storeLocation : null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profil berhasil diperbarui!');
      setIsEditProfileOpen(false);
      
      // Update local storage name for greeting
      const firstName = fullName.split(' ')[0];
      localStorage.setItem('toko_tani_last_user', firstName);
      
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm('Hapus alamat ini?')) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      toast.success('Alamat berhasil dihapus');
      setAddresses(prev => prev.filter(a => a.id !== addressId));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus alamat');
    }
  };

  const role = profile?.role || 'customer';

  // Customer statistics calculation
  const finishedOrders = initialOrders.filter(o => o.status === 'selesai');
  const totalSpent = finishedOrders.reduce((sum, o) => sum + o.total, 0);
  const uniqueFarmersCount = new Set(finishedOrders.map(o => o.petani_id)).size;

  const getCustomerBadges = () => {
    const badges: string[] = [];
    if (totalSpent > 100000) {
      badges.push('Premium Member');
    }
    if (finishedOrders.length >= 2) {
      badges.push('Pecinta Organik');
    }
    return badges.map(badge => (
      <Badge key={badge} variant={badge === 'Premium Member' ? 'terlaris' : 'organik'}>
        {badge}
      </Badge>
    ));
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
          {role === 'petani' ? 'Profil Mitra Kebun' : 'Identitas Customer'}
        </h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary">Kelola informasi pribadi, data kebun, dan riwayat aktivitas Anda.</p>
      </div>

      {/* Main Info Card */}
      <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-primary-light text-brand-primary rounded-full flex items-center justify-center font-black text-2xl uppercase border border-brand-primary/10 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || 'U'
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-brand-text-primary tracking-tight">{profile?.full_name}</h2>
              {role === 'customer' && getCustomerBadges()}
              {role === 'petani' && <Badge variant="organik">Mitra Petani</Badge>}
              {role === 'admin' && <Badge variant="aktif">Admin Sistem</Badge>}
            </div>
            
            <div className="flex flex-col gap-0.5 text-xs text-brand-text-muted mt-1">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-brand-primary" /> {profile?.email}</span>
              {profile?.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-brand-primary" /> {profile.phone}</span>}
              {role === 'petani' && profile?.store_name && (
                <span className="flex items-center gap-1.5 font-semibold text-brand-text-secondary mt-1">
                  <Store className="w-3.5 h-3.5 text-brand-primary" /> {profile.store_name} ({profile.store_location})
                </span>
              )}
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setIsEditProfileOpen(true)}
          variant="outline" 
          className="text-xs font-bold px-4 py-2 border-brand-primary text-brand-primary flex gap-1.5 items-center self-start sm:self-center"
        >
          <Edit className="w-3.5 h-3.5" /> Edit Profil
        </Button>
      </section>

      {/* Conditional Customer Dashboard Stats */}
      {role === 'customer' && (
        <>
          {/* Order quick counts grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'menunggu_pembayaran', label: 'Belum Bayar', icon: <Clock className="w-4 h-4" />, count: initialOrders.filter(o => o.status === 'menunggu_pembayaran').length, badgeColor: 'bg-red-500' },
              { key: 'diproses', label: 'Diproses', icon: <CheckCircle2 className="w-4 h-4" />, count: initialOrders.filter(o => o.status === 'diproses').length, badgeColor: 'bg-blue-500' },
              { key: 'dikirim', label: 'Dikirim', icon: <Truck className="w-4 h-4" />, count: initialOrders.filter(o => o.status === 'dikirim').length, badgeColor: 'bg-emerald-500' },
              { key: 'selesai', label: 'Selesai / Review', icon: <Star className="w-4 h-4" />, count: finishedOrders.length, badgeColor: 'bg-amber-500' },
            ].map(status => (
              <Link href={`/pesanan?status=${status.key}`} key={status.key}>
                <div className="bg-white border border-brand-border rounded-xl p-4 shadow-sm hover:border-brand-primary/30 hover:shadow transition-all flex justify-between items-center cursor-pointer">
                  <div className="flex flex-col gap-0.5 text-xs text-brand-text-secondary">
                    <span className="flex items-center gap-1.5 font-semibold">{status.icon} {status.label}</span>
                  </div>
                  {status.count > 0 ? (
                    <span className={`w-5 h-5 rounded-full ${status.badgeColor} text-white font-bold text-[10px] flex items-center justify-center`}>
                      {status.count}
                    </span>
                  ) : (
                    <span className="text-xs text-brand-text-muted font-bold">0</span>
                  )}
                </div>
              </Link>
            ))}
          </section>

          {/* Pahlawan Pangan Banner */}
          <section className="bg-gradient-to-r from-emerald-800 to-brand-primary rounded-2xl p-6 sm:p-8 text-white shadow-md flex gap-4 items-center">
            <div className="p-3 bg-white/10 rounded-full flex-shrink-0">
              <Heart className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Pahlawan Pangan Lokal
              </span>
              <h3 className="text-sm sm:text-base font-extrabold leading-normal mt-0.5">
                Total belanja Anda bulan ini: <span className="text-amber-300 font-black">{formatRupiah(totalSpent)}</span>.
              </h3>
              <p className="text-[10px] sm:text-xs text-white/80 leading-relaxed max-w-lg mt-0.5">
                Hebat! Anda telah membeli hasil kebun dari <span className="font-bold text-white">{uniqueFarmersCount}</span> keluarga petani lokal secara langsung. Kontribusi Anda menghidupi kesejahteraan mereka.
              </p>
            </div>
          </section>
        </>
      )}

      {/* Address management section (for both customer/petani) */}
      <section className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-brand-border pb-4">
          <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5">
            <MapPin className="w-4.5 h-4.5 text-brand-primary" /> Daftar Alamat Pengiriman
          </h3>
          
          <button 
            onClick={() => setIsAddressModalOpen(true)}
            className="text-xs font-bold text-brand-primary hover:underline"
          >
            + Alamat Baru
          </button>
        </div>

        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div 
                key={addr.id}
                className={`
                  p-4 rounded-xl border flex flex-col justify-between gap-3 bg-brand-bg/50
                  ${addr.is_primary ? 'border-brand-primary bg-brand-primary-light/10' : 'border-brand-border'}
                `}
              >
                <div className="flex flex-col gap-1 text-xs text-brand-text-secondary leading-relaxed">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-brand-text-primary flex items-center gap-1.5">
                      {addr.label}
                      {addr.is_primary && <Badge variant="aktif">Utama</Badge>}
                    </span>
                  </div>
                  
                  <p className="font-semibold text-brand-text-primary mt-1">{addr.name} ({addr.phone})</p>
                  <p className="line-clamp-2">{addr.address}</p>
                  <p>{addr.rt && `RT ${addr.rt}`} {addr.rw && `RW ${addr.rw}`} {addr.kelurahan && `, ${addr.kelurahan}`} {addr.kecamatan && `, ${addr.kecamatan}`}</p>
                  <p>{addr.kota}, {addr.provinsi} {addr.kode_pos}</p>
                </div>

                <div className="flex justify-end gap-2 border-t border-brand-border pt-3 mt-1 text-[10px] font-bold">
                  <button 
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-brand-danger hover:underline"
                  >
                    Hapus Alamat
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-brand-bg rounded-xl border border-brand-border flex flex-col items-center justify-center gap-2">
            <MapPin className="w-8 h-8 text-brand-text-muted/30" />
            <p className="text-xs text-brand-text-secondary">Belum ada alamat pengiriman terdaftar.</p>
          </div>
        )}
      </section>

      {/* Menu Options & Sign Out */}
      <section className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm divide-y divide-brand-border">
        <Link href="/bantuan" className="flex items-center justify-between px-6 py-4 hover:bg-brand-bg transition-colors cursor-pointer text-xs sm:text-sm font-semibold text-brand-text-secondary">
          <span className="flex items-center gap-2.5"><HelpCircle className="w-5 h-5 text-brand-primary" /> Pusat Bantuan Toko Tani</span>
          <ChevronRight className="w-4 h-4 text-brand-text-muted" />
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-red-50/50 transition-colors text-left text-xs sm:text-sm font-semibold text-brand-danger"
        >
          <span className="flex items-center gap-2.5"><LogOut className="w-5 h-5" /> Keluar Akun</span>
          <ChevronRight className="w-4 h-4 text-brand-text-muted" />
        </button>
      </section>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Edit Profil Saya" size="md">
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <Input
            label="Nama Lengkap"
            placeholder="Nama Lengkap Anda"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSavingProfile}
          />
          <Input
            label="Nomor Telepon"
            placeholder="08xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSavingProfile}
          />

          {role === 'petani' && (
            <div className="p-4 bg-brand-primary-light/50 border border-brand-primary/10 rounded-xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5"><Store className="w-4 h-4" /> Informasi Toko Mitra</h4>
              <Input
                label="Nama Toko/Kebun"
                placeholder="Kebun Berkah"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={isSavingProfile}
              />
              <Input
                label="Lokasi Kebun (Kota)"
                placeholder="Batu atau Lembang"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                disabled={isSavingProfile}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end border-t border-brand-border pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} disabled={isSavingProfile}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSavingProfile}>
              Simpan Profil
            </Button>
          </div>
        </form>
      </Modal>

      {/* Address creation modal is handled in cart/checkout, but we can let them add directly here too */}
      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Tambah Alamat Baru" size="lg">
        {/* We can embed a simple address form here */}
        <p className="text-xs text-brand-text-secondary mb-2">Gunakan formulir ini untuk menambahkan alamat pengiriman.</p>
        <div className="border border-dashed border-brand-border p-4 rounded-xl text-center">
          <p className="text-xs text-brand-text-muted">Untuk menambahkan alamat baru, Anda dapat melakukannya di halaman checkout keranjang belanja secara interaktif, atau menggunakan manajemen alamat.</p>
          <Button variant="outline" className="text-xs mt-3" onClick={() => { setIsAddressModalOpen(false); router.push('/keranjang'); }}>Pergi ke Keranjang</Button>
        </div>
      </Modal>

    </div>
  );
};
export default ProfilClient;
