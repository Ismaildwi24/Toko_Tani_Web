'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, ArrowRight, Star, Leaf, Sparkles, Send, Gift } from 'lucide-react';
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
  is_featured: boolean;
  sold_count: number;
  petani_id: string;
  profiles: {
    full_name: string;
    store_name: string;
    store_location: string;
  } | null;
}

interface HomeClientProps {
  initialProducts: Product[];
}

export const HomeClient: React.FC<HomeClientProps> = ({ initialProducts }) => {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const supabase = createClient();

  const [selectedCat, setSelectedCat] = useState('Semua');
  const [emailInput, setEmailInput] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const categories = [
    { label: 'Semua', value: 'Semua' },
    { label: 'Sayuran', value: 'sayur' },
    { label: 'Buah-Buahan', value: 'buah' },
    { label: 'Bumbu Dapur', value: 'bumbu' },
    { label: 'Umbi-Umbian', value: 'umbi' },
    { label: 'Organik', value: 'organik' },
  ];

  // Client-side category filtering
  const getFilteredProducts = () => {
    if (selectedCat === 'Semua') {
      return initialProducts;
    }
    if (selectedCat === 'organik') {
      // Find where tags contain 'organik' OR category is 'organik'
      return initialProducts.filter(
        (p) => p.category === 'organik' || p.tags?.includes('organik')
      );
    }
    return initialProducts.filter((p) => p.category === selectedCat);
  };

  const filteredProducts = getFilteredProducts();

  // Add to cart helper
  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('Silakan masuk terlebih dahulu untuk berbelanja');
      router.push(`/login?redirect=/`);
      return;
    }

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

  // Subscribe to Weekly Box Newsletter
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Masukkan alamat email Anda');
      return;
    }

    setIsSubscribing(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: emailInput.trim() });

      if (error) {
        if (error.code === '23505') {
          // Unique key violation
          toast.success('Email Anda sudah terdaftar berlangganan box mingguan! 🥬');
        } else {
          throw error;
        }
      } else {
        toast.success('Berhasil berlangganan promosi Box Mingguan! 🎉');
      }
      setEmailInput('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal berlangganan. Silakan coba lagi.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-16">
      
      {/* 1. Hero Banner Section */}
      <section className="relative rounded-3xl overflow-hidden h-[250px] sm:h-[400px] shadow-lg border border-brand-border/60">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200')` }}
        />
        {/* Dark mask overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/35" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 gap-3 sm:gap-5 max-w-2xl text-white">
          <Badge variant="organik" className="self-start text-[9px] sm:text-xs tracking-widest font-black uppercase bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            🥬 100% Langsung dari Kebun
          </Badge>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Sayur Segar Langsung dari Petani Lokal
          </h1>
          <p className="text-[10px] sm:text-sm text-white/80 leading-relaxed font-medium">
            Dukung kesejahteraan keluarga petani lokal dan nikmati kualitas bahan makanan segar organik terbaik yang dipanen langsung untuk Anda tanpa perantara.
          </p>
          <div className="mt-2 flex gap-3">
            <Link href="/produk">
              <Button variant="primary" className="text-[10px] sm:text-xs font-extrabold px-6 py-2.5 sm:py-3.5 flex items-center gap-1.5 shadow-md shadow-brand-primary/20">
                Belanja Sekarang <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Category Chip Filters */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-brand-text-primary tracking-tight">Kategori Segar</h2>
            <p className="text-xs text-brand-text-secondary mt-0.5">Filter bahan makanan berdasarkan kelompok panen.</p>
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCat === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCat(cat.value)}
                className={`
                  px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap
                  ${isActive 
                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20' 
                    : 'bg-white text-brand-text-secondary border-brand-border hover:bg-brand-bg'}
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Product Grid "Terlaris Minggu Ini" */}
      <section className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-brand-text-primary tracking-tight">Panenan Terpopuler</h2>
            <p className="text-xs text-brand-text-secondary mt-0.5">Bahan makanan segar yang paling diminati keluarga minggu ini.</p>
          </div>
          <Link href="/produk" className="text-xs text-brand-primary font-black flex gap-1 items-center hover:underline">
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isOrganik = product.category === 'organik' || product.tags?.includes('organik');
              const isBebasPestisida = product.tags?.includes('bebas_pestisida');
              const isTerlaris = product.sold_count > 10;
              const farmerName = product.profiles?.store_name || product.profiles?.full_name || 'Petani Lokal';
              const farmerLocation = product.profiles?.store_location || 'Indonesia';

              return (
                <div 
                  key={product.id}
                  className="group bg-white rounded-2xl border border-brand-border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-sm"
                >
                  <div className="relative">
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                      {isOrganik && <Badge variant="organik">Organik</Badge>}
                      {isBebasPestisida && <Badge variant="bebas_pestisida">Bebas Pestisida</Badge>}
                      {isTerlaris && <Badge variant="terlaris">Terlaris</Badge>}
                      {product.stock === 0 && <Badge variant="diblokir">Habis</Badge>}
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
                      <div className="flex items-center gap-1.5 text-[9px] text-brand-text-muted">
                        <MapPin className="w-3 h-3 text-brand-primary" />
                        <span className="font-bold truncate">{farmerName} • {farmerLocation}</span>
                      </div>

                      <Link href={`/produk/${product.slug}`} className="hover:text-brand-primary transition-colors">
                        <h3 className="font-extrabold text-xs sm:text-sm text-brand-text-primary line-clamp-1 leading-snug">
                          {product.name}
                        </h3>
                      </Link>
                      
                      <p className="text-[10px] sm:text-xs text-brand-text-secondary line-clamp-2 leading-relaxed">
                        {product.description || 'Segar langsung dari petani.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-1 border-t border-brand-border/60 pt-3">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wide">Harga</span>
                          <span className="text-xs sm:text-sm font-black text-brand-primary">
                            {formatRupiah(product.price)}
                          </span>
                        </div>
                        <span className="text-[9px] text-brand-text-muted font-bold bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                          / {product.unit}
                        </span>
                      </div>

                      {product.stock > 0 ? (
                        <Button 
                          onClick={() => handleAddToCart(product)}
                          variant="primary" 
                          fullWidth 
                          className="text-[10px] sm:text-xs font-bold py-2 h-8 flex gap-1 items-center justify-center"
                        >
                          Beli
                        </Button>
                      ) : (
                        <Link href={`/chat/${user ? [user.id, product.petani_id].sort().join('_') : 'guest'}`}>
                          <Button 
                            variant="outline" 
                            fullWidth 
                            className="text-[10px] sm:text-xs font-bold h-8 border-brand-border text-brand-text-muted hover:bg-brand-bg"
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
          <div className="text-center py-20 bg-white rounded-2xl border border-brand-border flex flex-col items-center justify-center gap-3">
            <Leaf className="w-12 h-12 text-brand-text-muted/30 animate-pulse" />
            <h3 className="font-bold text-brand-text-primary text-sm">Produk Tidak Ditemukan</h3>
            <p className="text-xs text-brand-text-secondary max-w-sm">
              Saat ini tidak ada produk aktif di kategori &quot;{selectedCat}&quot;. Silakan coba kategori lainnya.
            </p>
          </div>
        )}
      </section>

      {/* 4. Weekly Box Promo Section */}
      <section className="bg-blue-50 border border-blue-100 rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
        <div className="flex flex-col gap-3 max-w-lg">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
            <Gift className="w-4.5 h-4.5" /> Langganan Hemat Mingguan
          </span>
          <h3 className="text-lg sm:text-2xl font-black text-brand-text-primary tracking-tight leading-tight">
            Berlangganan Box Sayur Mingguan
          </h3>
          <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed font-medium">
            Dapatkan diskon eksklusif dan informasi pengiriman paket box sayur buah segar organik musiman langsung ke depan pintu rumah Anda setiap hari Senin. Daftar dengan email Anda sekarang.
          </p>
          
          <form onSubmit={handleSubscribe} className="flex gap-2 mt-2 w-full max-w-md">
            <input
              type="email"
              placeholder="Masukkan alamat email Anda..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isSubscribing}
              className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="text-xs font-bold px-5 flex gap-1.5 items-center"
              isLoading={isSubscribing}
            >
              <Send className="w-3.5 h-3.5" /> Daftar
            </Button>
          </form>
        </div>

        {/* Visual box illustration */}
        <div className="w-full md:w-64 aspect-square bg-gradient-to-br from-emerald-100 to-blue-100 rounded-2xl border border-brand-border flex items-center justify-center relative overflow-hidden shadow-inner flex-shrink-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col gap-2 z-10">
            <span className="text-6xl animate-bounce">📦</span>
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-white border border-brand-border px-3 py-1 rounded-full shadow-sm">
              Box Tani
            </span>
          </div>
          {/* Decorative circular blurs */}
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-primary/10 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-blue-500/10 rounded-full blur-xl" />
        </div>
      </section>

    </div>
  );
};
export default HomeClient;
