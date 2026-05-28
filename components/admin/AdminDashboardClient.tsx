'use client';

import React, { useState } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, Users, BarChart3, Star, Sparkles, 
  ToggleLeft, ToggleRight, Landmark, ArrowUpRight, TrendingUp 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sold_count: number;
  is_featured: boolean;
  petani_profiles: {
    full_name: string;
  } | null;
}

interface AdminDashboardClientProps {
  adminName: string;
  stats: {
    todayRevenue: number;
    activeFarmers: number;
    registeredCustomers: number;
    systemCommission: number;
  };
  featuredProducts: Product[];
  onRefresh: () => void;
}

export const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  adminName,
  stats,
  featuredProducts,
  onRefresh,
}) => {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(featuredProducts);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const handleToggleFeatured = async (productId: string, currentFeatured: boolean) => {
    setIsUpdating(prev => ({ ...prev, [productId]: true }));
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: !currentFeatured })
        .eq('id', productId);

      if (error) throw error;

      toast.success(currentFeatured ? 'Produk dihapus dari sorotan halaman utama' : 'Produk ditambahkan ke sorotan halaman utama! ✨');
      
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, is_featured: !currentFeatured } : p)
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status kurasi produk');
    } finally {
      setIsUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Greeting Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
          Halo, Selamat Pagi {adminName}!
        </h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary">Berikut ringkasan statistik ekosistem Toko Tani hari ini.</p>
      </div>

      {/* 4 Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        
        {/* Card 1: Transaksi */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center text-brand-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Transaksi Hari Ini</span>
            <div className="p-2 bg-emerald-50 text-brand-primary rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-black text-brand-text-primary">{formatRupiah(stats.todayRevenue)}</span>
            <span className="text-[9px] text-brand-primary font-bold mt-1">Status sukses & proses</span>
          </div>
        </div>

        {/* Card 2: Petani */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center text-brand-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Petani Aktif</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-black text-brand-text-primary">{stats.activeFarmers} Petani</span>
            <span className="text-[9px] text-blue-600 font-bold mt-1">Status kebun aktif</span>
          </div>
        </div>

        {/* Card 3: Konsumen */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center text-brand-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Konsumen Terdaftar</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-black text-brand-text-primary">{stats.registeredCustomers} Pengguna</span>
            <span className="text-[9px] text-indigo-600 font-bold mt-1">Akun pembeli terdaftar</span>
          </div>
        </div>

        {/* Card 4: Komisi */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center text-brand-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Komisi Sistem (3.5%)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-black text-brand-primary">{formatRupiah(stats.systemCommission)}</span>
            <span className="text-[9px] text-amber-600 font-bold mt-1">Hasil bersih bulan ini</span>
          </div>
        </div>

      </section>

      {/* Front Page Curation Section */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-black text-brand-text-primary tracking-tight">Kurasi Produk Halaman Depan</h2>
          <p className="text-xs text-brand-text-secondary mt-0.5">Atur penayangan produk unggulan petani di etalase utama (terdapat toggle unggulan).</p>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-brand-bg border-b border-brand-border text-brand-text-secondary font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-4">Nama Produk</th>
                  <th className="p-4">Petani Kebun</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Harga</th>
                  <th className="p-4">Stok</th>
                  <th className="p-4">Terjual</th>
                  <th className="p-4 text-center">Kurasi Sorotan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 text-brand-text-secondary">
                {products.length > 0 ? (
                  products.map((prod) => {
                    const isTerlaris = prod.sold_count > 10;
                    return (
                      <tr key={prod.id} className="hover:bg-brand-bg/40 transition-colors">
                        <td className="p-4 font-bold text-brand-text-primary flex items-center gap-2">
                          {prod.name}
                          {isTerlaris && <Badge variant="terlaris">Terlaris</Badge>}
                        </td>
                        <td className="p-4">{prod.petani_profiles?.full_name || 'Petani Lokal'}</td>
                        <td className="p-4 uppercase text-[10px] font-semibold">{prod.category}</td>
                        <td className="p-4 font-bold text-brand-primary">{formatRupiah(prod.price)}</td>
                        <td className="p-4 font-semibold">{prod.stock}</td>
                        <td className="p-4 font-semibold">{prod.sold_count}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleFeatured(prod.id, prod.is_featured)}
                            disabled={isUpdating[prod.id]}
                            className="p-1 hover:bg-brand-bg rounded-lg transition-colors inline-block"
                            title={prod.is_featured ? 'Hapus Sorotan' : 'Sorot di Beranda'}
                          >
                            {prod.is_featured ? (
                              <span className="flex items-center justify-center gap-1.5 text-xs text-brand-primary font-bold">
                                <ToggleRight className="w-7 h-7 text-brand-primary" />
                                <span>Unggulan</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1.5 text-xs text-brand-text-muted font-bold">
                                <ToggleLeft className="w-7 h-7 text-brand-text-muted" />
                                <span>Biasa</span>
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-brand-text-muted italic">
                      Tidak ada produk panen terdaftar di database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
};
export default AdminDashboardClient;
