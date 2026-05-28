'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, MessageSquare, Bell, ShoppingCart, LogOut, User, 
  LayoutDashboard, Menu, X, ChevronDown, Download, ClipboardList, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { getCount } = useCart();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fetch unread messages
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadChats(count);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages realtime
    const channel = supabase
      .channel('navbar_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          fetchUnreadCount();
          setNotificationCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Click outside close profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/produk?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/produk');
    }
  };

  const handleLogoutClick = async () => {
    await signOut();
    toast.success('Berhasil keluar akun');
    router.push('/login');
  };

  // Determine user role
  const role = profile?.role || 'customer';

  // Render navigation based on role
  const renderNavLinks = () => {
    if (role === 'admin') {
      return (
        <div className="hidden md:flex items-center gap-6">
          <Link href="/admin/dashboard" className={`text-sm font-bold transition-colors ${pathname === '/admin/dashboard' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Beranda
          </Link>
          <Link href="/admin/operasional" className={`text-sm font-bold transition-colors ${pathname === '/admin/operasional' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Operasional
          </Link>
        </div>
      );
    }

    if (role === 'petani') {
      return (
        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className={`text-sm font-bold transition-colors ${pathname === '/dashboard' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Beranda
          </Link>
          <Link href="/produk" className={`text-sm font-bold transition-colors ${pathname.startsWith('/produk') && !pathname.includes('tambah') ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Kelola Panen
          </Link>
          <Link href="/pesanan" className={`text-sm font-bold transition-colors ${pathname.startsWith('/pesanan') ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Riwayat Pesanan
          </Link>
          <Link href="/saldo" className={`text-sm font-bold transition-colors ${pathname === '/saldo' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
            Saldo & Penarikan
          </Link>
        </div>
      );
    }

    // Default Customer links
    return (
      <div className="hidden md:flex items-center gap-6">
        <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
          Beranda
        </Link>
        <Link href="/produk" className={`text-sm font-bold transition-colors ${pathname.startsWith('/produk') ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
          Produk Segar
        </Link>
        <Link href="/pesanan" className={`text-sm font-bold transition-colors ${pathname.startsWith('/pesanan') ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-primary'}`}>
          Pesanan Saya
        </Link>
      </div>
    );
  };

  const handleDownloadReport = () => {
    toast.success('Mengunduh laporan excel transaksi...');
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-brand-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href={role === 'admin' ? '/admin/dashboard' : role === 'petani' ? '/dashboard' : '/'} className="flex items-center gap-2 flex-shrink-0">
              <span className="bg-brand-primary p-2 rounded-lg text-white font-bold leading-none text-base">🥬</span>
              <span className="text-lg font-black tracking-tight text-brand-primary hidden sm:inline-block">
                {role === 'admin' ? 'Toko Tani Admin' : 'Toko Tani'}
              </span>
            </Link>
          </div>

          {/* Render navigation links (Desk) */}
          {renderNavLinks()}

          {/* Search bar (only for Customer/Guest in home/products) */}
          {role === 'customer' && (
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Cari sayur, buah, atau bumbu segar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </form>
          )}

          {/* Actions & Profile (Right side) */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {role === 'admin' && (
              <button 
                onClick={handleDownloadReport}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primary-hover transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Laporan
              </button>
            )}

            {/* Customer Icons */}
            {role === 'customer' && (
              <>
                <Link href="/chat" className="relative p-1.5 text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary-light rounded-full transition-all">
                  <MessageSquare className="w-5 h-5" />
                  {unreadChats > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-danger text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {unreadChats}
                    </span>
                  )}
                </Link>
                <Link href="/keranjang" className="relative p-1.5 text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary-light rounded-full transition-all">
                  <ShoppingCart className="w-5 h-5" />
                  {getCount() > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-danger text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {getCount()}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Petani Icons */}
            {role === 'petani' && (
              <Link href="/chat" className="relative p-1.5 text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary-light rounded-full transition-all">
                <MessageSquare className="w-5 h-5" />
                {unreadChats > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-danger text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {unreadChats}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications Icon (General) */}
            {user && (
              <div className="relative p-1.5 text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary-light rounded-full transition-all cursor-pointer">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-danger text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
            )}

            {/* User Dropdown */}
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full border border-brand-border hover:bg-brand-bg transition-colors"
                >
                  <div className="w-7 h-7 bg-brand-primary-light text-brand-primary rounded-full flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      profile?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-brand-text-secondary hidden sm:inline-block" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-border rounded-xl shadow-lg py-1.5 z-50 text-xs text-brand-text-secondary animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2 border-b border-brand-border">
                      <p className="font-bold text-brand-text-primary truncate">{profile?.full_name}</p>
                      <p className="text-[10px] text-brand-text-muted truncate uppercase tracking-wider font-semibold">{profile?.role}</p>
                    </div>
                    
                    {role === 'customer' && (
                      <>
                        <Link href="/profil" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <User className="w-4 h-4 text-brand-primary" /> Identitas Profil
                        </Link>
                        <Link href="/pesanan" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <ClipboardList className="w-4 h-4 text-brand-primary" /> Pesanan Saya
                        </Link>
                      </>
                    )}

                    {role === 'petani' && (
                      <>
                        <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-brand-primary" /> Dashboard Mitra
                        </Link>
                        <Link href="/saldo" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <Wallet className="w-4 h-4 text-brand-primary" /> Keuangan & Saldo
                        </Link>
                        <Link href="/profil" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <User className="w-4 h-4 text-brand-primary" /> Profil Toko
                        </Link>
                      </>
                    )}

                    {role === 'admin' && (
                      <>
                        <Link href="/admin/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-brand-bg transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-brand-primary" /> Dashboard Admin
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-brand-danger transition-colors text-left border-t border-brand-border mt-1"
                    >
                      <LogOut className="w-4 h-4" /> Keluar Akun
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="hidden sm:inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-xs py-1.5 px-4 h-8 border border-brand-primary text-brand-primary hover:bg-brand-primary-light focus:ring-brand-primary bg-transparent"
                >
                  Masuk
                </Link>
                <Link 
                  href="/register" 
                  className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-xs py-1.5 px-4 h-8 bg-brand-primary hover:bg-brand-primary-hover text-white focus:ring-brand-primary"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-brand-text-secondary hover:bg-brand-bg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-white px-4 py-3 flex flex-col gap-3 shadow-inner">
          {role === 'customer' && (
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="Cari sayur, buah, atau bumbu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted">
                <Search className="w-4 h-4" />
              </div>
            </form>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col gap-2.5 font-bold text-xs text-brand-text-secondary">
            {role === 'admin' ? (
              <>
                <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/admin/dashboard' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Beranda
                </Link>
                <Link href="/admin/operasional" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/admin/operasional' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Operasional
                </Link>
                <button 
                  onClick={() => { handleDownloadReport(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 p-2 bg-brand-primary text-white rounded-lg font-bold"
                >
                  <Download className="w-4 h-4" /> Unduh Laporan
                </button>
              </>
            ) : role === 'petani' ? (
              <>
                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/dashboard' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Beranda
                </Link>
                <Link href="/produk" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/produk' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Kelola Panen
                </Link>
                <Link href="/pesanan" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/pesanan' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Riwayat Pesanan
                </Link>
                <Link href="/saldo" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/saldo' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Saldo & Penarikan
                </Link>
              </>
            ) : (
              <>
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Beranda
                </Link>
                <Link href="/produk" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/produk' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Produk Segar
                </Link>
                <Link href="/pesanan" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${pathname === '/pesanan' ? 'bg-brand-primary-light text-brand-primary' : 'hover:bg-brand-bg'}`}>
                  Pesanan Saya
                </Link>
              </>
            )}

            {!user && (
              <div className="flex flex-col gap-2 pt-2 border-t border-brand-border">
                <Link 
                  href="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm px-5 py-2.5 border border-brand-primary text-brand-primary hover:bg-brand-primary-light focus:ring-brand-primary bg-transparent"
                >
                  Masuk
                </Link>
                <Link 
                  href="/register" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white focus:ring-brand-primary"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
