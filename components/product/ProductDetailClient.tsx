'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah, formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Star, ShoppingCart, MessageSquare, Shield, Truck, 
  MapPin, CheckCircle, Plus, Minus, User 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  rating: number;
  comment: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

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
    id: string;
    full_name: string;
    store_name: string;
    store_location: string;
  } | null;
}

interface ProductDetailClientProps {
  product: Product;
  reviews: Review[];
  recommendations: Product[];
}

export const ProductDetailClient: React.FC<ProductDetailClientProps> = ({
  product,
  reviews,
  recommendations,
}) => {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [activeImage, setActiveImage] = useState(product.images?.[0] || 'https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fallback thumbnails if the product has only 1 image
  const imagesList = product.images?.length > 0 
    ? product.images 
    : ['https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani'];

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleIncrease = () => {
    if (quantity < product.stock) setQuantity(prev => prev + 1);
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Silakan masuk terlebih dahulu untuk berbelanja');
      router.push(`/login?redirect=/produk/${product.slug}`);
      return;
    }

    setIsAdding(true);
    try {
      // Add items according to quantity selected
      for (let i = 0; i < quantity; i++) {
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
      }
      toast.success(`${quantity} x ${product.name} dimasukkan ke keranjang 🛒`);
    } catch (error) {
      toast.error('Gagal memasukkan ke keranjang');
    } finally {
      setIsAdding(false);
    }
  };

  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const roomChatId = user ? [user.id, product.petani_id].sort().join('_') : 'guest';

  return (
    <div className="flex flex-col gap-16">
      
      {/* Back button breadcrumb */}
      <div>
        <Link href="/produk" className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali Belanja
        </Link>
      </div>

      {/* Main Product Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        
        {/* Left Gallery (60% equivalent md:col-span-7) */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-brand-border bg-white shadow-sm">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Thumbnails */}
          {imagesList.length > 1 && (
            <div className="flex gap-3">
              {imagesList.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(img)}
                  className={`
                    w-20 h-16 rounded-lg overflow-hidden border-2 transition-all
                    ${activeImage === img ? 'border-brand-primary' : 'border-brand-border hover:border-brand-primary/50'}
                  `}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Product Details (40% equivalent md:col-span-5) */}
        <div className="md:col-span-5 bg-white border border-brand-border rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
          
          {/* Badges and Farmer Info */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {product.tags.includes('organik') && <Badge variant="organik">Organik</Badge>}
              {product.tags.includes('bebas_pestisida') && <Badge variant="bebas_pestisida">Bebas Pestisida</Badge>}
              <Badge variant="terlaris">Terlaris</Badge>
            </div>
            
            <h1 className="text-xl md:text-2xl font-black text-brand-text-primary tracking-tight leading-tight mt-1">
              {product.name}
            </h1>

            <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary mt-1">
              <MapPin className="w-4 h-4 text-brand-primary" />
              <span>Ditanam oleh <span className="font-bold text-brand-text-primary">{product.profiles?.store_name || product.profiles?.full_name}</span> di <span className="font-semibold text-brand-primary">{product.profiles?.store_location || 'Batu'}</span></span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline justify-between border-t border-b border-brand-border py-4">
            <span className="text-2xl font-black text-brand-primary">
              {formatRupiah(product.price)}
            </span>
            <span className="text-xs font-bold text-brand-text-muted bg-brand-bg px-3 py-1 rounded border border-brand-border">
              Per {product.unit}
            </span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-brand-text-primary uppercase tracking-wider">Deskripsi Produk</h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              {product.description || 'Tidak ada deskripsi untuk produk ini.'}
            </p>
          </div>

          {/* Info Seals */}
          <div className="grid grid-cols-2 gap-3 text-[10px] text-brand-text-secondary bg-brand-bg p-3.5 rounded-xl border border-brand-border">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-primary" />
              <span>Jaminan 100% Segar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-brand-primary" />
              <span>Pengiriman Cepat</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 mt-2">
            {product.stock > 0 ? (
              <>
                {/* Quantity Selector */}
                <div className="flex items-center justify-between border border-brand-border p-3.5 rounded-xl bg-white">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-brand-text-primary">Jumlah Pembelian</span>
                    <span className="text-[10px] text-brand-text-muted mt-0.5">Tersedia {product.stock} {product.unit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDecrease}
                      disabled={quantity <= 1}
                      className="p-1 rounded-full border border-brand-border hover:bg-brand-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Minus className="w-4 h-4 text-brand-text-secondary" />
                    </button>
                    <span className="text-sm font-bold text-brand-text-primary min-w-[1.5rem] text-center">{quantity}</span>
                    <button
                      onClick={handleIncrease}
                      disabled={quantity >= product.stock}
                      className="p-1 rounded-full border border-brand-border hover:bg-brand-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Plus className="w-4 h-4 text-brand-text-secondary" />
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddToCart}
                    variant="primary"
                    className="flex-1 text-xs sm:text-sm font-bold flex gap-2 items-center py-3.5"
                    isLoading={isAdding}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Tambahkan ke Keranjang
                  </Button>
                  <Link href={`/chat/${roomChatId}`}>
                    <button className="p-3.5 border border-brand-primary rounded-xl text-brand-primary hover:bg-brand-primary-light transition-all" title="Hubungi Petani">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-red-50 text-brand-danger rounded-xl border border-red-100 text-center font-bold text-xs">
                  Stok Habis Sementara
                </div>
                <Link href={`/chat/${roomChatId}`}>
                  <Button variant="outline" fullWidth className="flex gap-2 items-center text-xs py-3.5 font-bold">
                    <MessageSquare className="w-4 h-4" />
                    Tanyakan Ketersediaan Panen
                  </Button>
                </Link>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Reviews Section */}
      <section className="flex flex-col gap-6 border-t border-brand-border pt-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Ulasan Pembeli</h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">Apa kata mereka yang sudah mencobanya.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-brand-primary-light text-brand-primary px-4 py-2 rounded-xl border border-brand-primary/10 self-start">
            <span className="text-lg font-black">{avgRating}</span>
            <div className="flex text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[10px] font-bold text-brand-text-muted uppercase">({reviews.length} Ulasan)</span>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="bg-white border border-brand-border rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  {/* Rating star bar */}
                  <div className="flex justify-between items-center">
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-brand-text-muted">{formatRelativeDate(review.created_at)}</span>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
                    &quot;{review.comment}&quot;
                  </p>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-3 border-t border-brand-border pt-3">
                  <div className="w-8 h-8 rounded-full bg-brand-bg text-brand-text-secondary flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-brand-text-primary truncate">
                    {review.profiles?.full_name || 'Pembeli Anonim'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-border flex flex-col items-center justify-center gap-2">
            <Star className="w-10 h-10 text-brand-text-muted/30" />
            <h4 className="font-bold text-brand-text-primary text-xs sm:text-sm">Belum Ada Ulasan</h4>
            <p className="text-xs text-brand-text-secondary max-w-xs">Produk ini belum menerima ulasan dari pembeli.</p>
          </div>
        )}
      </section>

      {/* Recommendations Section */}
      <section className="flex flex-col gap-6 border-t border-brand-border pt-12">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">Mungkin Anda Juga Butuh</h2>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">Rekomendasi panenan segar dari kategori yang sama.</p>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {recommendations.map((rec) => {
              const isOrganik = rec.tags.includes('organik');
              const isBebasPestisida = rec.tags.includes('bebas_pestisida');
              return (
                <div 
                  key={rec.id}
                  className="group bg-white rounded-xl border border-brand-border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative">
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                      {isOrganik && <Badge variant="organik">Organik</Badge>}
                      {isBebasPestisida && <Badge variant="bebas_pestisida">Bebas Pestisida</Badge>}
                    </div>
                    
                    <Link href={`/produk/${rec.slug}`}>
                      <div className="aspect-[4/3] w-full bg-brand-bg relative overflow-hidden">
                        <img 
                          src={rec.images?.[0] || 'https://placehold.co/400x300/e8f5ee/1A7C3E?text=Toko+Tani'} 
                          alt={rec.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Link href={`/produk/${rec.slug}`} className="hover:text-brand-primary transition-colors">
                        <h3 className="font-bold text-sm text-brand-text-primary line-clamp-1">
                          {rec.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-brand-text-muted truncate">Ditanam di {rec.profiles?.store_location || 'Batu'}</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-brand-text-muted font-medium">Harga</span>
                          <span className="text-sm font-black text-brand-primary">
                            {formatRupiah(rec.price)}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-text-muted font-bold bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                          / {rec.unit}
                        </span>
                      </div>

                      <Link href={`/produk/${rec.slug}`}>
                        <Button variant="secondary" fullWidth className="text-xs font-bold">
                          Detail Produk
                        </Button>
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-brand-text-secondary italic">Tidak ada rekomendasi tambahan.</p>
        )}
      </section>

    </div>
  );
};
export default ProductDetailClient;
