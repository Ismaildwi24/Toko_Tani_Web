'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Footer: React.FC = () => {
  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Toko Tani',
        text: 'Sayur Segar Langsung dari Petani Lokal',
        url: window.location.origin,
      })
      .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast.success('Tautan Toko Tani berhasil disalin ke papan klip!');
    }
  };

  return (
    <footer className="w-full bg-white border-t border-brand-border py-12 mt-16 text-sm text-brand-text-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Left Side */}
        <div className="flex flex-col gap-3 items-center md:items-start">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-brand-primary p-2 rounded-lg text-white font-bold leading-none text-base">🥬</span>
            <span className="text-lg font-black tracking-tight text-brand-primary">
              Toko Tani
            </span>
          </Link>
          <p className="text-xs text-brand-text-muted text-center md:text-left">
            © 2026 Toko Tani Ecosystem. Memberdayakan Petani Lokal.
          </p>
        </div>

        {/* Right Side Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
          <Link href="/tentang" className="hover:text-brand-primary transition-colors">
            Tentang Kami
          </Link>
          <Link href="/bantuan" className="hover:text-brand-primary transition-colors">
            Pusat Bantuan
          </Link>
          <Link href="/privacy" className="hover:text-brand-primary transition-colors">
            Kebijakan Privasi
          </Link>
          <Link href="/terms" className="hover:text-brand-primary transition-colors">
            Syarat & Ketentuan
          </Link>
        </div>

        {/* Interactive Socials */}
        <div className="flex items-center gap-4 text-brand-text-muted">
          <button 
            onClick={() => toast.success('Bahasa Indonesia terpilih sebagai default')} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-bg hover:text-brand-text-secondary transition-all text-xs font-medium"
          >
            <Globe className="w-4 h-4 text-brand-primary" />
            <span>ID (Bahasa)</span>
          </button>
          
          <button 
            onClick={handleShareClick}
            className="p-2 border border-brand-border rounded-lg hover:bg-brand-bg hover:text-brand-primary transition-all"
            title="Bagikan Tautan"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  );
};
export default Footer;
