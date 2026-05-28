'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MapPin, SlidersHorizontal, ArrowUpDown, X, Leaf } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  is_featured: boolean;
  sold_count: number;
  petani_id: string;
  profiles: {
    full_name: string;
    store_name: string;
    store_location: string;
  } | null;
}

interface ProductListClientProps {
  products: Product[];
}

export const ProductListClient: React.FC<ProductListClientProps> = ({ products }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [searchVal, setSearchVal] = useState(searchParams.get('q') || '');
  const [selectedCat, setSelectedCat] = useState(searchParams.get('category') || 'Semua');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'terbaru');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = [
    { label: 'Semua', value: 'Semua' },
    { label: 'Sayuran', value: 'sayur' },
    { label: 'Buah-Buahan', value: 'buah' },
    { label: 'Bumbu Dapur', value: 'bumbu' },
    { label: 'Umbi-Umbian', value: 'umbi' },
    { label: 'Organik', value: 'organik' },
  ];

  const sorts = [
    { label: 'Panen Terbaru', value: 'terbaru' },
    { label: 'Terpopuler (Terlaris)', value: 'terpopuler' },
    { label: 'Harga Terendah', value: 'termurah' },
    { label: 'Harga Tertinggi', value: 'termahal' },
  ];

  // Update query params in URL
  const updateUrl = (q: string, category: string, sort: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category && category !== 'Semua') params.set('category', category);
    if (sort && sort !== 'terbaru') params.set('sort', sort);
    router.push(`/produk?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(searchVal, selectedCat, selectedSort);
  };

  const handleCategoryChange = (catVal: string) => {
    setSelectedCat(catVal);
    updateUrl(searchVal, catVal, selectedSort);
  };

  const handleSortChange = (sortVal: string) => {
    setSelectedSort(sortVal);
    updateUrl(searchVal, selectedCat, sortVal);
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setSelectedCat('Semua');
    setSelectedSort('terbaru');
    router.push('/produk');
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.images?.[0] || 'https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani',
      petani_name: product.profiles?.store_name || product.profiles?.full_name || 'Petani Lokal',
      petani_id: product.petani_id,
      max_stock: product.stock,
    });
    toast.success(`${product.name} dimasukkan ke keranjang 🛒`);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-brand-border pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Katalog Panen Lokal</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">Temukan bahan pangan sehat langsung dari kebun terpercaya.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Cari sayur, buah, atau bumbu..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-brand-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <Button type="submit" variant="primary" className="text-xs font-bold px-4">Cari</Button>
        </form>
      </div>

      {/* Filters and sorting layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Sidebar Filter (Desktop) */}
        <aside className="w-full lg:w-64 bg-white border border-brand-border rounded-xl p-5 flex flex-col gap-6 sticky top-24">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-brand-primary" /> Filter Panen
            </h3>
            {(searchVal || selectedCat !== 'Semua' || selectedSort !== 'terbaru') && (
              <button onClick={handleClearFilters} className="text-[10px] text-brand-danger font-bold hover:underline">
                Bersihkan
              </button>
            )}
          </div>

          {/* Categories select */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">Kategori</span>
            <div className="flex flex-col gap-1.5">
              {categories.map((cat) => {
                const isActive = selectedCat === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`
                      text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all
                      ${isActive 
                        ? 'bg-brand-primary-light text-brand-primary font-bold' 
                        : 'text-brand-text-secondary hover:bg-brand-bg'}
                    `}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Select */}
          <div className="flex flex-col gap-2.5 border-t border-brand-border pt-4">
            <span className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">Urutkan</span>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-brand-border rounded-lg text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
              >
                {sorts.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid Content */}
        <div className="flex-1 w-full">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => {
                const isOrganik = product.tags.includes('organik');
                const isBebasPestisida = product.tags.includes('bebas_pestisida');
                const farmerName = product.profiles?.full_name || 'Petani Lokal';
                const farmerLocation = product.profiles?.store_location || 'Indonesia';

                return (
                  <div 
                    key={product.id}
                    className="group bg-white rounded-xl border border-brand-border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative">
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                        {isOrganik && <Badge variant="organik">Organik</Badge>}
                        {isBebasPestisida && <Badge variant="bebas_pestisida">Bebas Pestisida</Badge>}
                        {product.stock === 0 && <Badge variant="diblokir">Stok Habis</Badge>}
                      </div>
                      
                      <Link href={`/produk/${product.slug}`}>
                        <div className="aspect-[4/3] w-full bg-brand-bg relative overflow-hidden">
                          <img 
                            src={product.images?.[0] || 'https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani'} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </Link>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-brand-text-muted">
                          <MapPin className="w-3 h-3 text-brand-primary" />
                          <span className="font-semibold truncate">{farmerName} • {farmerLocation}</span>
                        </div>

                        <Link href={`/produk/${product.slug}`} className="hover:text-brand-primary transition-colors">
                          <h3 className="font-bold text-sm text-brand-text-primary line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 mt-1">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-brand-text-muted font-medium">Harga</span>
                            <span className="text-sm font-black text-brand-primary">
                              {formatRupiah(product.price)}
                            </span>
                          </div>
                          <span className="text-[10px] text-brand-text-muted font-bold bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                            / {product.unit}
                          </span>
                        </div>

                        {product.stock > 0 ? (
                          <Button 
                            onClick={() => handleAddToCart(product)}
                            variant="primary" 
                            fullWidth 
                            className="text-xs font-bold"
                          >
                            Beli
                          </Button>
                        ) : (
                          <Link href={`/chat/${user ? [user.id, product.petani_id].sort().join('_') : 'guest'}`}>
                            <Button 
                              variant="outline" 
                              fullWidth 
                              className="text-xs font-bold border-brand-text-muted text-brand-text-muted hover:bg-brand-bg"
                            >
                              Hubungi Petani
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-4">
              <Leaf className="w-12 h-12 text-brand-text-muted/40 animate-pulse" />
              <h3 className="font-bold text-brand-text-primary">Produk Tidak Ditemukan</h3>
              <p className="text-xs text-brand-text-secondary max-w-sm">
                Produk dengan kata kunci <span className="font-bold text-brand-text-primary">&quot;{searchVal}&quot;</span> tidak tersedia atau tidak terdaftar.
              </p>
              <Button variant="outline" className="text-xs font-bold mt-2" onClick={handleClearFilters}>
                Kembali ke Semua Produk
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProductListClient;
