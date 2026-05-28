'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, ProductInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { ArrowLeft, Sprout, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  category: string;
  tags: string[];
  images: string[];
  is_active: boolean;
}

interface EditProductClientProps {
  product: Product;
}

export const EditProductClient: React.FC<EditProductClientProps> = ({ product }) => {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>(product.images || []);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      category: product.category as any,
      tags: product.tags || [],
      images: product.images || [],
    },
  });

  const selectedCategory = watch('category');
  const tags = watch('tags');
  const images = watch('images');

  const handleToggleTag = (tag: string) => {
    const currentTags = [...(tags || [])];
    const index = currentTags.indexOf(tag);
    if (index > -1) {
      currentTags.splice(index, 1);
    } else {
      currentTags.push(tag);
    }
    setValue('tags', currentTags, { shouldValidate: true });
  };

  const handleRandomImage = () => {
    const categoryImages: Record<string, string[]> = {
      sayur: [
        'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=600',
        'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=600',
      ],
      buah: [
        'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=600',
        'https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=600',
      ],
      bumbu: [
        'https://images.unsplash.com/photo-1588252303782-cb80119cb665?q=80&w=600',
        'https://images.unsplash.com/photo-1608797178974-15b35a61d121?q=80&w=600',
      ],
      umbi: [
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=600',
      ],
    };

    const list = categoryImages[selectedCategory || 'sayur'] || categoryImages.sayur;
    const randomImg = list[Math.floor(Math.random() * list.length)];
    
    const newImages = [...images, randomImg];
    setUploadedImages(newImages);
    setValue('images', newImages, { shouldValidate: true });
  };

  const handleAddImageUrl = () => {
    if (!imageInput.trim()) return;
    const newImages = [...images, imageInput.trim()];
    setUploadedImages(newImages);
    setValue('images', newImages, { shouldValidate: true });
    setImageInput('');
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maksimal ukuran file adalah 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      let publicUrl = `https://placehold.co/400x300/e8f5ee/1A7C3E?text=Foto+Panen`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage.from('products').getPublicUrl(filePath);
          if (data) publicUrl = data.publicUrl;
        }
      } catch (err) {
        console.warn('Storage not configured');
      }

      const newImages = [...images, publicUrl];
      setUploadedImages(newImages);
      setValue('images', newImages, { shouldValidate: true });
      toast.success('Foto berhasil diunggah!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setUploadedImages(newImages);
    setValue('images', newImages, { shouldValidate: true });
  };

  const onSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    try {
      // Update product in DB
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          description: data.description,
          price: data.price,
          unit: data.unit,
          stock: data.stock,
          category: data.category,
          tags: data.tags,
          images: data.images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Hasil panen berhasil diperbarui!');
      router.push('/produk');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui produk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Breadcrumb */}
        <div>
          <Link href="/produk" className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Panen
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          <div className="border-b border-brand-border pb-4 flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary-light text-brand-primary rounded-xl">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-brand-text-primary tracking-tight">Edit Hasil Panen</h2>
              <p className="text-xs text-brand-text-secondary">Ubah informasi produk panen Anda yang aktif di katalog.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            
            <Input
              label="Nama Hasil Panen"
              placeholder="contoh: Wortel Manis Cipanas..."
              error={errors.name?.message}
              disabled={isLoading}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Harga Jual (Rupiah)"
                type="number"
                placeholder="contoh: 12500"
                error={errors.price?.message}
                disabled={isLoading}
                {...register('price', { valueAsNumber: true })}
              />
              <Input
                label="Satuan Unit Jual"
                placeholder="contoh: 1kg, 250g..."
                error={errors.unit?.message}
                disabled={isLoading}
                {...register('unit')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Stok Tersedia"
                type="number"
                placeholder="contoh: 50"
                error={errors.stock?.message}
                disabled={isLoading}
                {...register('stock', { valueAsNumber: true })}
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-brand-text-secondary uppercase">Kategori</label>
                <select
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
                  {...register('category')}
                >
                  <option value="sayur">Sayuran</option>
                  <option value="buah">Buah-Buahan</option>
                  <option value="bumbu">Bumbu Dapur</option>
                  <option value="umbi">Umbi-Umbian</option>
                  <option value="organik">Organik</option>
                </select>
                {errors.category && <span className="text-[10px] text-brand-danger font-medium mt-0.5">{errors.category.message}</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-text-secondary uppercase">Deskripsi Panen</label>
              <textarea
                placeholder="Rincikan detail produk..."
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-border text-xs min-h-[5.5rem] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
                {...register('description')}
              />
              {errors.description && <span className="text-[10px] text-brand-danger font-medium mt-0.5">{errors.description.message}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-brand-text-secondary uppercase">Label Highlight (Tags)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleTag('organik')}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                    ${tags?.includes('organik') 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-white text-brand-text-secondary border-brand-border'}
                  `}
                >
                  🥬 Organik
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTag('bebas_pestisida')}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                    ${tags?.includes('bebas_pestisida') 
                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                      : 'bg-white text-brand-text-secondary border-brand-border'}
                  `}
                >
                  💧 Bebas Pestisida
                </button>
              </div>
            </div>

            {/* Images */}
            <div className="flex flex-col gap-3 border-t border-brand-border pt-4 mt-2">
              <label className="text-xs font-bold text-brand-text-primary uppercase tracking-wider">Foto Produk Panen</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-brand-text-secondary font-semibold uppercase">Unggah File</span>
                  <div className="relative border border-brand-border bg-brand-bg rounded-lg p-2 flex items-center justify-center cursor-pointer text-xs text-brand-text-muted hover:bg-brand-bg/85 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      disabled={isLoading || isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-4 h-4 mr-2 text-brand-primary" />
                    <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto (Max 5MB)'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRandomImage}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-dashed border-brand-primary text-brand-primary hover:bg-brand-primary-light font-bold text-xs"
                >
                  <Sparkles className="w-4 h-4" /> Gunakan Foto Demo
                </button>
              </div>

              <div className="flex gap-2 items-end">
                <Input
                  label="Atau Input URL Foto"
                  placeholder="https://link-gambar.com/foto.jpg"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  disabled={isLoading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddImageUrl} 
                  disabled={isLoading}
                  className="h-10 text-xs px-4"
                >
                  Tambah URL
                </Button>
              </div>

              {errors.images && <span className="text-[10px] text-brand-danger font-medium">{errors.images.message}</span>}

              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 border border-brand-border p-3.5 rounded-xl bg-brand-bg">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-brand-border group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-brand-border pt-4 mt-4">
              <Link href="/produk">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="primary" className="font-bold px-6" isLoading={isLoading}>
                Simpan Perubahan
              </Button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
};
export default EditProductClient;
