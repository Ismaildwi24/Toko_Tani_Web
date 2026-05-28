-- Active: Supabase/PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'petani', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
    store_name TEXT,       -- Nama Toko/Kebun (khusus Petani)
    store_location TEXT,   -- Lokasi Kebun/Kota (khusus Petani)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    petani_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- dalam Rupiah
    unit TEXT NOT NULL,    -- contoh: '250g', '1kg'
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('sayur', 'buah', 'bumbu', 'umbi', 'organik')),
    tags TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sold_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    petani_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'menunggu_pembayaran' CHECK (
        status IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'diproses', 'dikirim', 'selesai', 'dibatalkan')
    ),
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('transfer_bca', 'transfer_bri', 'transfer_mandiri', 'transfer_bni', 'qris', 'midtrans')
    ),
    payment_proof_url TEXT,
    midtrans_token TEXT,
    shipping_address JSONB NOT NULL,
    courier TEXT,
    shipping_cost INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    total INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    unit TEXT NOT NULL
);

-- 5. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    rt TEXT,
    rw TEXT,
    kelurahan TEXT,
    kecamatan TEXT,
    kota TEXT NOT NULL,
    provinsi TEXT NOT NULL,
    kode_pos TEXT,
    is_primary BOOLEAN DEFAULT false
);

-- 8. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    petani_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'diproses', 'selesai', 'ditolak')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can do everything on profiles" 
ON public.profiles FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Products Policies
CREATE POLICY "Anyone can view active products" 
ON public.products FOR SELECT 
USING (is_active = true OR auth.uid() = petani_id);

CREATE POLICY "Petani can CRUD their own products" 
ON public.products FOR ALL 
USING (
    auth.uid() = petani_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'petani'
    )
);

CREATE POLICY "Admins can update any product" 
ON public.products FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Orders Policies
CREATE POLICY "Customers can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Petani can view orders directed to them" 
ON public.orders FOR SELECT 
USING (auth.uid() = petani_id);

CREATE POLICY "Admins can view and update all orders" 
ON public.orders FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Customers can insert their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers and Petani can update their own orders status"
ON public.orders FOR UPDATE
USING (auth.uid() = customer_id OR auth.uid() = petani_id);

-- Order Items Policies
CREATE POLICY "Order items are viewable by customer, petani, and admin" 
ON public.order_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id AND (
            orders.customer_id = auth.uid() OR 
            orders.petani_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        )
    )
);

CREATE POLICY "Customers can insert order items" 
ON public.order_items FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
    )
);

-- Reviews Policies
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Customers can insert reviews for finished orders they made" 
ON public.reviews FOR INSERT 
WITH CHECK (
    auth.uid() = customer_id AND 
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_id AND orders.customer_id = auth.uid() AND orders.status = 'selesai'
    )
);

-- Messages Policies
CREATE POLICY "Users can view messages in their rooms" 
ON public.messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages in their rooms" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of messages in their rooms"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Addresses Policies
CREATE POLICY "Users can view their own addresses" 
ON public.addresses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own addresses" 
ON public.addresses FOR ALL 
USING (auth.uid() = user_id);

-- Withdrawals Policies
CREATE POLICY "Petani can view their own withdrawals" 
ON public.withdrawals FOR SELECT 
USING (auth.uid() = petani_id);

CREATE POLICY "Petani can request withdrawals" 
ON public.withdrawals FOR INSERT 
WITH CHECK (
    auth.uid() = petani_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'petani'
    )
);

CREATE POLICY "Admins can view and manage all withdrawals" 
ON public.withdrawals FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Newsletter Subscribers Policies
CREATE POLICY "Anyone can subscribe to newsletter" 
ON public.newsletter_subscribers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view newsletter subscribers" 
ON public.newsletter_subscribers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- TRIGGER FOR AUTOMATIC PROFILE CREATION FROM AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, avatar_url, role, status, store_name, store_location)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User Baru'),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    'active',
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'store_location'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
