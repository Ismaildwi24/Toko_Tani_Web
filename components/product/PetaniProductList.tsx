'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sprout, Plus, Edit, Trash2, SwitchCamera, 
  ToggleLeft, ToggleRight, Eye, EyeOff, Search, Leaf 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  category: string;
  tags: string[];
  images: string[];
  is_active: boolean;
  sold_count: number;
}

interface PetaniProductListProps {
  initialProducts: Product[];
  onRefresh: () => void;
}

export const PetaniProductList: React.FC<PetaniProductListProps> = ({
  initialProducts,
  onRefresh,
}) => {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    setIsUpdating(prev => ({ ...prev, [productId]: true }));
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(currentStatus ? 'Produk dinonaktifkan dari katalog' : 'Produk diaktifkan di katalog!');
      
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, is_active: !currentStatus } : p)
      );
    } catch (err: any) {
      toast.error(err.message || 'Gagal merubah status produk');
    } finally {
      setIsUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus produk "${productName}" secara permanen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success(`Produk "${productName}" berhasil dihapus`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus produk');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Manajemen Hasil Panen</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">Kelola daftar sayuran, buah-buahan, dan stok yang ditawarkan ke pembeli.</p>
        </div>

        <Link href="/produk/tambah" className="self-start">
          <Button variant="primary" className="text-xs font-bold flex gap-1.5 items-center py-2.5">
            <Plus className="w-4 h-4" /> Tambah Panen Baru
          </Button>
        </Link>
      </div>

      {/* Search Filter */}
      <div className="w-full max-w-md relative">
        <input
          type="text"
          placeholder="Cari panen Anda..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {/* Products list */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const hasImages = product.images && product.images.length > 0;
            const imgUrl = hasImages ? product.images[0] : 'https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani';

            return (
              <div 
                key={product.id}
                className={`
                  bg-white rounded-xl border border-brand-border overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-200
                  ${!product.is_active ? 'border-dashed opacity-75' : ''}
                `}
              >
                {/* Photo and active overlay */}
                <div className="relative aspect-[16/10] w-full bg-brand-bg border-b border-brand-border overflow-hidden">
                  <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                  {!product.is_active && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-white text-xs font-bold gap-1">
                      <EyeOff className="w-4 h-4" /> Tidak Aktif di Katalog
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge variant="primary">{product.category}</Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-sm text-brand-text-primary truncate">{product.name}</h3>
                    <p className="text-xs font-black text-brand-primary mt-0.5">
                      {formatRupiah(product.price)} <span className="text-brand-text-muted font-normal text-[10px]">/ {product.unit}</span>
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-brand-text-muted mt-2 border-t border-brand-border pt-2">
                      <span>Stok Tersedia: <span className="font-bold text-brand-text-primary">{product.stock}</span></span>
                      <span>Terjual: <span className="font-bold text-brand-text-primary">{product.sold_count || 0}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center border-t border-brand-border pt-4 mt-2">
                    <button
                      onClick={() => handleToggleActive(product.id, product.is_active)}
                      disabled={isUpdating[product.id]}
                      className={`
                        text-xs font-semibold flex items-center gap-1.5 transition-colors
                        ${product.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-brand-text-muted hover:text-brand-text-secondary'}
                      `}
                    >
                      {product.is_active ? (
                        <>
                          <Eye className="w-4 h-4 text-emerald-600" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 text-brand-text-muted" />
                          <span>Draft</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-2">
                      <Link href={`/produk/${product.id}/edit`}>
                        <button className="p-2 border border-brand-border rounded-lg text-brand-text-secondary hover:text-brand-primary hover:bg-brand-bg transition-colors" title="Edit Panen">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-2 border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-danger hover:bg-red-50 transition-colors"
                        title="Hapus Panen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-4">
          <Leaf className="w-12 h-12 text-brand-text-muted/30" />
          <h3 className="font-bold text-brand-text-primary">Belum Ada Panenan</h3>
          <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
            Anda belum mendaftarkan sayur atau buah hasil kebun Anda.
          </p>
          <Link href="/produk/tambah" className="mt-1">
            <Button variant="primary" className="text-xs font-bold">Mulai Upload Panen</Button>
          </Link>
        </div>
      )}

    </div>
  );
};
export default PetaniProductList;
