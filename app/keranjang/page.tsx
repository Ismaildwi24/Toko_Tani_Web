'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatRupiah, generateOrderNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, Plus, Minus, MapPin, CreditCard, ChevronRight, 
  ShoppingBag, HelpCircle, Truck, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, AddressInput } from '@/lib/validators';

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

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    toggleSelect, 
    toggleSelectAll, 
    clearSelected, 
    getSelectedItems, 
    getTotal 
  } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [courier, setCourier] = useState('aci'); // default to 'aci' (estimasi murah)
  const [orderNotes, setOrderNotes] = useState('');

  // Fetch addresses
  const fetchAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
      
      // Select primary address by default
      if (data && data.length > 0) {
        const primary = data.find(addr => addr.is_primary) || data[0];
        setSelectedAddressId(primary.id);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  // Form for new address
  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddressForm,
    formState: { errors: addressErrors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
  });

  const onAddAddress = async (data: AddressInput) => {
    if (!user) return;
    setIsAddressLoading(true);
    try {
      // If primary is true, set others to false first
      if (data.is_primary) {
        await supabase
          .from('addresses')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const { data: newAddr, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          label: data.label,
          name: data.name,
          phone: data.phone,
          address: data.address,
          rt: data.rt || null,
          rw: data.rw || null,
          kelurahan: data.kelurahan || null,
          kecamatan: data.kecamatan || null,
          kota: data.kota,
          provinsi: data.provinsi,
          kode_pos: data.kode_pos || null,
          is_primary: data.is_primary,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Alamat berhasil ditambahkan!');
      await fetchAddresses();
      if (newAddr) setSelectedAddressId(newAddr.id);
      setIsAddressModalOpen(false);
      resetAddressForm();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan alamat');
    } finally {
      setIsAddressLoading(false);
    }
  };

  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
  const selectedItems = getSelectedItems();
  const subtotal = getTotal();

  // Courier shipping cost mapping
  const shippingCosts: Record<string, number> = {
    lalamove: 12000,
    aci: 10000,
    gojek: 15000,
  };
  const shippingCost = selectedItems.length > 0 ? shippingCosts[courier] : 0;
  const totalBill = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal satu item untuk dibeli');
      return;
    }
    if (!selectedAddressId || !selectedAddress) {
      toast.error('Pilih alamat pengiriman terlebih dahulu');
      return;
    }
    if (!paymentMethod) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    setIsCheckoutLoading(true);
    try {
      // Group selected items by petani_id
      const itemsByFarmer: Record<string, typeof selectedItems> = {};
      selectedItems.forEach(item => {
        if (!itemsByFarmer[item.petani_id]) {
          itemsByFarmer[item.petani_id] = [];
        }
        itemsByFarmer[item.petani_id].push(item);
      });

      const createdOrders: any[] = [];

      // Create an order for each farmer group
      for (const petaniId of Object.keys(itemsByFarmer)) {
        const farmerItems = itemsByFarmer[petaniId];
        const orderNum = generateOrderNumber();
        
        const farmerSubtotal = farmerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const farmerTotal = farmerSubtotal + shippingCost; // applying shipping cost per farmer order

        // Format address to JSON
        const addressJson = {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
          rt: selectedAddress.rt || '',
          rw: selectedAddress.rw || '',
          kelurahan: selectedAddress.kelurahan || '',
          kecamatan: selectedAddress.kecamatan || '',
          kota: selectedAddress.kota,
          provinsi: selectedAddress.provinsi,
          kode_pos: selectedAddress.kode_pos || '',
        };

        // Insert order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNum,
            customer_id: user?.id,
            petani_id: petaniId,
            status: paymentMethod === 'midtrans' ? 'menunggu_pembayaran' : 'menunggu_pembayaran', // manual starts with pending
            payment_method: paymentMethod,
            shipping_address: addressJson,
            courier: courier,
            shipping_cost: shippingCost,
            subtotal: farmerSubtotal,
            total: farmerTotal,
            notes: orderNotes || null,
          })
          .select()
          .single();

        if (orderError || !order) {
          throw new Error(orderError?.message || 'Gagal membuat pesanan');
        }

        // Insert order items
        const orderItemsPayload = farmerItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
          unit: item.unit,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          throw itemsError;
        }

        createdOrders.push(order);
      }

      // Clear checkouted items from cart store
      clearSelected();
      toast.success('Pesanan berhasil dibuat!');

      // Payment Handling
      if (paymentMethod === 'midtrans') {
        // If there's only 1 order, we can trigger Midtrans Snap immediately
        if (createdOrders.length === 1) {
          const targetOrder = createdOrders[0];
          
          // Request Midtrans Snap Token
          const res = await fetch('/api/midtrans/create-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: targetOrder.id,
              amount: targetOrder.total,
              customer_name: user?.user_metadata?.full_name || 'Customer',
              customer_email: user?.email || '',
              phone: selectedAddress.phone,
              items: selectedItems.filter(item => item.petani_id === targetOrder.petani_id),
            }),
          });

          const payData = await res.json();
          if (payData.error) throw new Error(payData.error);

          const snapToken = payData.snap_token;

          // Open Midtrans Snap Popup
          if ((window as any).snap) {
            (window as any).snap.pay(snapToken, {
              onSuccess: function (result: any) {
                toast.success('Pembayaran berhasil!');
                router.push(`/pesanan/${targetOrder.id}`);
              },
              onPending: function (result: any) {
                toast.success('Menunggu pembayaran...');
                router.push(`/pesanan/${targetOrder.id}`);
              },
              onError: function (result: any) {
                toast.error('Pembayaran gagal, silakan coba lagi');
                router.push(`/pesanan/${targetOrder.id}`);
              },
              onClose: function () {
                toast('Anda menutup jendela pembayaran', { icon: '⚠️' });
                router.push(`/pesanan/${targetOrder.id}`);
              }
            });
          } else {
            // Fallback to Midtrans Redirect URL
            router.push(payData.redirect_url);
          }
        } else {
          // Multiple orders from different farmers
          toast.success('Silakan selesaikan pembayaran untuk masing-masing pesanan di halaman riwayat.');
          router.push('/pesanan');
        }
      } else {
        // Manual bank transfer
        if (createdOrders.length === 1) {
          router.push(`/pesanan/${createdOrders[0].id}`);
        } else {
          router.push('/pesanan');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses checkout');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const isAllChecked = items.length > 0 && items.every(item => item.selected);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Load Midtrans Snap script (Sandbox mode by default) */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column - Shopping Cart (8 columns) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-brand-border pb-4">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={toggleSelectAll}
                      className="w-4.5 h-4.5 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
                    />
                    <span className="text-sm font-bold text-brand-text-primary">Pilih Semua ({items.length} Barang)</span>
                  </div>
                  
                  {selectedItems.length > 0 && (
                    <button 
                      onClick={() => selectedItems.forEach(item => removeItem(item.product_id))}
                      className="text-xs text-brand-danger font-bold flex gap-1.5 items-center hover:underline"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus Terpilih
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div className="flex flex-col divide-y divide-brand-border">
                  {items.map((item) => (
                    <div 
                      key={item.product_id}
                      className={`
                        py-4 flex gap-4 transition-opacity duration-200
                        ${!item.selected ? 'opacity-50' : 'opacity-100'}
                      `}
                    >
                      <div className="flex items-start pt-2">
                        <input 
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelect(item.product_id)}
                          className="w-4.5 h-4.5 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
                        />
                      </div>

                      {/* Product Image */}
                      <div className="w-20 h-20 bg-brand-bg rounded-lg overflow-hidden border border-brand-border flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">
                            Mitra: {item.petani_name}
                          </span>
                          <span className="text-sm font-bold text-brand-text-primary">{item.name}</span>
                          <span className="text-xs font-black text-brand-primary">{formatRupiah(item.price)} <span className="text-brand-text-muted font-normal text-[10px]">/ {item.unit}</span></span>
                        </div>

                        {/* Quantity and delete */}
                        <div className="flex items-center gap-4 self-start md:self-center">
                          <div className="flex items-center gap-2.5 border border-brand-border rounded-lg p-1 bg-brand-bg">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-1 rounded hover:bg-white text-brand-text-secondary disabled:opacity-30"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-brand-text-primary min-w-[1.2rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={item.quantity >= item.max_stock}
                              className="p-1 rounded hover:bg-white text-brand-text-secondary disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button 
                            onClick={() => removeItem(item.product_id)}
                            className="p-2 text-brand-text-muted hover:text-brand-danger transition-colors rounded-lg"
                            title="Hapus"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Right Column - Checkout Summary (4 columns) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Shipping Address Card */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-primary" /> Alamat Pengiriman
                </h3>
                
                {addresses.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 border border-brand-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
                    >
                      {addresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                          [{addr.label}] {addr.name} - {addr.kota}
                        </option>
                      ))}
                    </select>

                    {selectedAddress && (
                      <div className="p-3 bg-brand-bg rounded-lg border border-brand-border text-xs text-brand-text-secondary flex flex-col gap-1 leading-relaxed">
                        <p className="font-bold text-brand-text-primary">{selectedAddress.name} ({selectedAddress.phone})</p>
                        <p>{selectedAddress.address}</p>
                        <p>{selectedAddress.rt && `RT ${selectedAddress.rt}`} {selectedAddress.rw && `RW ${selectedAddress.rw}`} {selectedAddress.kelurahan && `, ${selectedAddress.kelurahan}`} {selectedAddress.kecamatan && `, ${selectedAddress.kecamatan}`} </p>
                        <p>{selectedAddress.kota}, {selectedAddress.provinsi} {selectedAddress.kode_pos}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex flex-col gap-2">
                    <div className="flex gap-1.5 items-center font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Belum Ada Alamat</span>
                    </div>
                    <p>Harap tambahkan alamat pengiriman terlebih dahulu untuk melanjutkan pembelian.</p>
                  </div>
                )}

                <Button 
                  type="button" 
                  variant="outline" 
                  fullWidth 
                  className="text-xs font-bold"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  Tambah Alamat Baru
                </Button>
              </div>

              {/* Courier Option */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand-primary" /> Ekspedisi Pengiriman
                </h3>

                <div className="flex flex-col gap-2">
                  <label className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs
                    ${courier === 'aci' ? 'border-brand-primary bg-brand-primary-light/50 font-semibold' : 'border-brand-border hover:bg-brand-bg'}
                  `}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="courier" 
                        value="aci" 
                        checked={courier === 'aci'} 
                        onChange={() => setCourier('aci')} 
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Kurir ACI (Ekonomis - 30mnt)</span>
                    </div>
                    <span className="font-bold text-brand-primary">{formatRupiah(10000)}</span>
                  </label>

                  <label className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs
                    ${courier === 'lalamove' ? 'border-brand-primary bg-brand-primary-light/50 font-semibold' : 'border-brand-border hover:bg-brand-bg'}
                  `}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="courier" 
                        value="lalamove" 
                        checked={courier === 'lalamove'} 
                        onChange={() => setCourier('lalamove')} 
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Kurir Lalamove (Cepat - 20mnt)</span>
                    </div>
                    <span className="font-bold text-brand-primary">{formatRupiah(12000)}</span>
                  </label>

                  <label className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs
                    ${courier === 'gojek' ? 'border-brand-primary bg-brand-primary-light/50 font-semibold' : 'border-brand-border hover:bg-brand-bg'}
                  `}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="courier" 
                        value="gojek" 
                        checked={courier === 'gojek'} 
                        onChange={() => setCourier('gojek')} 
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Gojek Instant (Express - 15mnt)</span>
                    </div>
                    <span className="font-bold text-brand-primary">{formatRupiah(15000)}</span>
                  </label>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-brand-primary" /> Metode Pembayaran
                </h3>

                <div className="flex flex-col gap-2.5">
                  {/* Midtrans */}
                  <label className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs
                    ${paymentMethod === 'midtrans' ? 'border-brand-primary bg-brand-primary-light/50 font-bold' : 'border-brand-border hover:bg-brand-bg'}
                  `}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment_method"
                        value="midtrans"
                        checked={paymentMethod === 'midtrans'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span>Bayar via Midtrans</span>
                        <span className="text-[10px] text-brand-text-muted font-normal">QRIS, E-Wallet, Kartu Kredit, Virtual Account</span>
                      </span>
                    </div>
                    <Badge variant="organik">Instan</Badge>
                  </label>

                  <div className="text-[10px] font-bold text-brand-text-muted tracking-wider uppercase mt-1">Transfer Manual</div>

                  {/* Transfer Bank */}
                  {['transfer_bca', 'transfer_bri', 'transfer_mandiri', 'transfer_bni'].map((bank) => {
                    const bankLabels: Record<string, string> = {
                      transfer_bca: 'Transfer Bank BCA',
                      transfer_bri: 'Transfer Bank BRI',
                      transfer_mandiri: 'Transfer Bank Mandiri',
                      transfer_bni: 'Transfer Bank BNI',
                    };
                    return (
                      <label 
                        key={bank}
                        className={`
                          flex items-center p-3 rounded-lg border cursor-pointer text-xs
                          ${paymentMethod === bank ? 'border-brand-primary bg-brand-primary-light/50 font-semibold' : 'border-brand-border hover:bg-brand-bg'}
                        `}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={bank}
                          checked={paymentMethod === bank}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-brand-primary focus:ring-brand-primary mr-2.5"
                        />
                        <span>{bankLabels[bank]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-sm">
                <textarea
                  placeholder="Catatan untuk petani (opsional)..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-brand-border rounded-lg text-xs p-2.5 min-h-[4.5rem] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary"
                />
              </div>

              {/* Summary Bill Card */}
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-sm text-brand-text-primary">Ringkasan Belanja</h3>
                
                <div className="flex flex-col gap-2.5 text-xs text-brand-text-secondary border-b border-brand-border pb-4">
                  <div className="flex justify-between">
                    <span>Total Harga ({selectedItems.length} Barang)</span>
                    <span className="font-semibold text-brand-text-primary">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkos Kirim ({courier.toUpperCase()})</span>
                    <span className="font-semibold text-brand-text-primary">{formatRupiah(shippingCost)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm py-2">
                  <span className="font-bold text-brand-text-primary">Total Tagihan</span>
                  <span className="text-base font-black text-brand-primary">{formatRupiah(totalBill)}</span>
                </div>

                {selectedItems.length > 0 && Object.keys(selectedItems.reduce((acc, item) => { acc[item.petani_id] = true; return acc; }, {} as Record<string, boolean>)).length > 1 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-[10px] text-yellow-800 leading-relaxed flex gap-2">
                    <HelpCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span>Anda membeli dari beberapa petani. Pesanan akan dipecah per-petani dan dikenakan biaya pengiriman untuk masing-masing pesanan.</span>
                  </div>
                )}

                <Button
                  onClick={handleCheckout}
                  variant="primary"
                  fullWidth
                  className="text-xs sm:text-sm font-bold py-3.5 flex gap-2 items-center"
                  isLoading={isCheckoutLoading}
                  disabled={selectedItems.length === 0}
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  Beli ({selectedItems.length})
                </Button>
              </div>

            </div>

          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border border-brand-border flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
            <ShoppingBag className="w-16 h-16 text-brand-text-muted/30 animate-pulse" />
            <h2 className="text-lg font-bold text-brand-text-primary">Keranjang Belanja Kosong</h2>
            <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
              Anda belum menambahkan sayur atau buah ke keranjang. Mari mulai mendukung ketahanan pangan lokal!
            </p>
            <Link href="/produk" className="mt-2">
              <Button variant="primary" className="font-bold text-xs">Mulai Belanja</Button>
            </Link>
          </div>
        )}
      </main>

      <Footer />

      {/* Add Address Modal */}
      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Tambah Alamat Baru" size="lg">
        <form onSubmit={handleAddressSubmit(onAddAddress)} className="flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Label Alamat"
              placeholder="Rumah, Kantor, dll"
              error={addressErrors.label?.message}
              disabled={isAddressLoading}
              {...registerAddress('label')}
            />
            <Input
              label="Nama Penerima"
              placeholder="Nama Lengkap"
              error={addressErrors.name?.message}
              disabled={isAddressLoading}
              {...registerAddress('name')}
            />
          </div>

          <Input
            label="Nomor Telepon Penerima"
            placeholder="08xxxxxxxxxx"
            error={addressErrors.phone?.message}
            disabled={isAddressLoading}
            {...registerAddress('phone')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-text-secondary uppercase">Alamat Lengkap</label>
            <textarea
              placeholder="Nama jalan, nomor rumah, RT/RW, nomor apartemen..."
              disabled={isAddressLoading}
              className={`
                w-full px-4 py-2.5 rounded-lg border text-xs min-h-[4rem] focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-text-secondary
                ${addressErrors.address ? 'border-brand-danger' : 'border-brand-border'}
              `}
              {...registerAddress('address')}
            />
            {addressErrors.address && <span className="text-[10px] text-brand-danger font-medium">{addressErrors.address.message}</span>}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Input
              label="RT"
              placeholder="001"
              error={addressErrors.rt?.message}
              disabled={isAddressLoading}
              {...registerAddress('rt')}
            />
            <Input
              label="RW"
              placeholder="002"
              error={addressErrors.rw?.message}
              disabled={isAddressLoading}
              {...registerAddress('rw')}
            />
            <Input
              label="Kelurahan"
              placeholder="Kelurahan"
              error={addressErrors.kelurahan?.message}
              disabled={isAddressLoading}
              {...registerAddress('kelurahan')}
            />
            <Input
              label="Kecamatan"
              placeholder="Kecamatan"
              error={addressErrors.kecamatan?.message}
              disabled={isAddressLoading}
              {...registerAddress('kecamatan')}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Kota/Kabupaten"
              placeholder="Jakarta Selatan"
              error={addressErrors.kota?.message}
              disabled={isAddressLoading}
              {...registerAddress('kota')}
            />
            <Input
              label="Provinsi"
              placeholder="DKI Jakarta"
              error={addressErrors.provinsi?.message}
              disabled={isAddressLoading}
              {...registerAddress('provinsi')}
            />
            <Input
              label="Kode Pos"
              placeholder="12345"
              error={addressErrors.kode_pos?.message}
              disabled={isAddressLoading}
              {...registerAddress('kode_pos')}
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="is_primary"
              disabled={isAddressLoading}
              className="w-4 h-4 text-brand-primary border-brand-border rounded focus:ring-brand-primary"
              {...registerAddress('is_primary')}
            />
            <label htmlFor="is_primary" className="text-xs text-brand-text-secondary cursor-pointer">
              Atur sebagai alamat utama pengiriman
            </label>
          </div>

          <div className="flex gap-3 justify-end border-t border-brand-border pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddressModalOpen(false)} disabled={isAddressLoading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isAddressLoading}>
              Simpan Alamat
            </Button>
          </div>

        </form>
      </Modal>

    </div>
  );
}
