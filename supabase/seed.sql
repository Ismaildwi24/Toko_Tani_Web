-- Enable crypt extensions if not available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Insert into auth.users
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
-- Admin: ahmad@tokotani.id
('00000000-0000-0000-0000-000000000000', 'a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'ahmad@tokotani.id', extensions.crypt('password123', extensions.gen_salt('bf', 10)), now(), null, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Ahmad Admin", "role": "admin"}'::jsonb, now(), now(), '', '', '', ''),
-- Petani 1: Pak Sudarso
('00000000-0000-0000-0000-000000000000', 'f1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'pak.sudarso@email.com', extensions.crypt('password123', extensions.gen_salt('bf', 10)), now(), null, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Pak Sudarso", "role": "petani", "store_name": "Sudarso Organik", "store_location": "Batu"}'::jsonb, now(), now(), '', '', '', ''),
-- Petani 2: Ibu Warsi
('00000000-0000-0000-0000-000000000000', 'f2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bu.warsi@email.com', extensions.crypt('password123', extensions.gen_salt('bf', 10)), now(), null, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Ibu Warsi", "role": "petani", "store_name": "Warsi Hidroponik", "store_location": "Lembang"}'::jsonb, now(), now(), '', '', '', ''),
-- Customer 1: Budi Setiawan
('00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'budi.setiawan@email.com', extensions.crypt('password123', extensions.gen_salt('bf', 10)), now(), null, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Budi Setiawan", "role": "customer"}'::jsonb, now(), now(), '', '', '', ''),
-- Customer 2: Siti Aminah
('00000000-0000-0000-0000-000000000000', 'c2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'siti.aminah@email.com', extensions.crypt('password123', extensions.gen_salt('bf', 10)), now(), null, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Siti Aminah", "role": "customer"}'::jsonb, now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO public.products (id, petani_id, name, slug, description, price, unit, stock, category, tags, images, is_featured, is_active, sold_count)
VALUES
('b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'Bayam Hijau Premium', 'bayam-hijau-premium', 'Bayam hijau segar pilihan yang ditanam secara organik.', 12500, '250g', 50, 'sayur', ARRAY['organik'], ARRAY['https://images.unsplash.com/photo-1576045057995-568f588f82fb'], true, true, 12),
('b2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'Tomat Cherry Manis', 'tomat-cherry-manis', 'Tomat cherry manis berukuran kecil yang segar dan renyah.', 18000, '500g', 30, 'buah', ARRAY['bebas_pestisida'], ARRAY['https://images.unsplash.com/photo-1595855759920-86582396756a'], true, true, 8),
('b3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'Wortel Manis Cipanas', 'wortel-manis-cipanas', 'Wortel manis lokal segar dengan warna jingga cerah.', 15000, '1kg', 25, 'umbi', ARRAY['organik'], ARRAY['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37'], false, true, 4),
('b4444444-4444-4444-4444-444444444444', 'f1111111-1111-1111-1111-111111111111', 'Selada Keriting Hidroponik', 'selada-keriting-hidroponik', 'Selada hijau segar berdaun keriting khas hidroponik.', 9500, '200g', 40, 'organik', ARRAY['organik'], ARRAY['https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1'], true, true, 15),
('b5555555-5555-5555-5555-555555555555', 'f2222222-2222-2222-2222-222222222222', 'Cabe Rawit Merah', 'cabe-rawit-merah', 'Cabai rawit merah pedas membara pilihan.', 8500, '100g', 60, 'bumbu', ARRAY[]::TEXT[], ARRAY['https://images.unsplash.com/photo-1588252303782-cb80119cb665'], false, true, 22),
('b6666666-6666-6666-6666-666666666666', 'f1111111-1111-1111-1111-111111111111', 'Bawang Merah Brebes', 'bawang-merah-brebes', 'Bawang merah berkualitas langsung dari Brebes.', 12000, '250g', 35, 'bumbu', ARRAY[]::TEXT[], ARRAY['https://images.unsplash.com/photo-1608797178974-15b35a61d121'], false, true, 10),
('b7777777-7777-7777-7777-777777777777', 'f1111111-1111-1111-1111-111111111111', 'Tomat Merah Segar (Curah)', 'tomat-merah-segar-curah', 'Tomat merah segar ukuran besar cocok untuk masakan.', 15000, '1kg', 45, 'buah', ARRAY['organik', 'bebas_pestisida'], ARRAY['https://images.unsplash.com/photo-1592924357228-91a4daadcfea'], false, true, 19),
('b8888888-8888-8888-8888-888888888888', 'f2222222-2222-2222-2222-222222222222', 'Jeruk Nipis Segar', 'jeruk-nipis-segar', 'Jeruk nipis hijau segar kaya air asam jeruk alami.', 9500, '500g', 20, 'buah', ARRAY[]::TEXT[], ARRAY['https://images.unsplash.com/photo-1590502593747-42a996133562'], false, true, 2)
ON CONFLICT (id) DO NOTHING;

-- Insert Addresses
INSERT INTO public.addresses (id, user_id, label, name, phone, address, rt, rw, kelurahan, kecamatan, kota, provinsi, kode_pos, is_primary)
VALUES
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Rumah', 'Budi Setiawan', '081234567890', 'Jl. Kebagusan Indah No. 12', '03', '04', 'Kebagusan', 'Pasar Minggu', 'Jakarta Selatan', 'DKI Jakarta', '12520', true),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Apartemen', 'Siti Aminah', '089876543210', 'Apt. Kalibata City Tower', '08', '09', 'Rawajati', 'Pancoran', 'Jakarta Selatan', 'DKI Jakarta', '12750', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Orders
INSERT INTO public.orders (id, order_number, customer_id, petani_id, status, payment_method, payment_proof_url, midtrans_token, shipping_address, courier, shipping_cost, subtotal, total, notes, created_at)
VALUES
('01111111-1111-1111-1111-111111111111', 'TK-9012', 'c1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'menunggu_verifikasi', 'transfer_bca', 'https://placehold.co/600x800', null, '{"name": "Budi Setiawan"}'::jsonb, 'lalamove', 12000, 438000, 450000, 'Kirim yang segar.', now() - interval '1 hour'),
('02222222-2222-2222-2222-222222222222', 'TK-9013', 'c2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'menunggu_verifikasi', 'transfer_bri', 'https://placehold.co/600x800', null, '{"name": "Siti Aminah"}'::jsonb, 'gojek', 15000, 1235000, 1250000, 'Tolong bungkus rapi.', now() - interval '2 hours'),
('03333333-3333-3333-3333-333333333333', 'TK-8821', 'c1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'diproses', 'midtrans', null, 'snap-token-8821-xyz', '{"name": "Budi Setiawan"}'::jsonb, 'aci', 10000, 47000, 57000, null, now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Insert Order Items
INSERT INTO public.order_items (id, order_id, product_id, name, price, quantity, subtotal, unit)
VALUES
('e1111111-1111-1111-1111-111111111111', '01111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Bayam Hijau Premium', 12500, 10, 125000, '250g'),
('e1111112-1112-1112-1112-111211121112', '01111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444444', 'Selada Keriting Hidroponik', 9500, 20, 190000, '200g'),
('e1111113-1113-1113-1113-111311131113', '01111111-1111-1111-1111-111111111111', 'b6666666-6666-6666-6666-666666666666', 'Bawang Merah Brebes', 12000, 10, 120000, '250g'),
('e2222221-2221-2221-2221-222122212221', '02222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Tomat Cherry Manis', 18000, 50, 900000, '500g'),
('e2222222-2222-2222-2222-222222222222', '02222222-2222-2222-2222-222222222222', 'b5555555-5555-5555-5555-555555555555', 'Cabe Rawit Merah', 8500, 30, 255000, '100g'),
('e2222223-2223-2223-2223-222322232223', '02222222-2222-2222-2222-222222222222', 'b8888888-8888-8888-8888-888888888888', 'Jeruk Nipis Segar', 9500, 8, 76000, '500g'),
('e3333331-3331-3331-3331-333133313331', '03333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Bayam Hijau Premium', 12500, 3, 37500, '250g'),
('e3333332-3332-3332-3332-333233323332', '03333333-3333-3333-3333-333333333333', 'b8888888-8888-8888-8888-888888888888', 'Jeruk Nipis Segar', 9500, 1, 9500, '500g')
ON CONFLICT (id) DO NOTHING;

-- Insert Reviews
INSERT INTO public.orders (id, order_number, customer_id, petani_id, status, payment_method, shipping_address, courier, shipping_cost, subtotal, total, created_at)
VALUES ('04444444-4444-4444-4444-444444444444', 'TK-7777', 'c2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'selesai', 'qris', '{"name": "Siti Aminah", "address": "Apt. Kalibata City Tower"}'::jsonb, 'aci', 10000, 45000, 55000, now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_id, name, price, quantity, subtotal, unit)
VALUES ('e4444441-4441-4441-4441-444144414441', '04444444-4444-4444-4444-444444444444', 'b7777777-7777-7777-7777-777777777777', 'Tomat Merah Segar (Curah)', 15000, 3, 45000, '1kg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reviews (id, order_id, product_id, customer_id, rating, comment, image_url, created_at)
VALUES
('81111111-1111-1111-1111-111111111111', '04444444-4444-4444-4444-444444444444', 'b7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 5, 'Tomatnya masih keras dan segar banget.', null, now() - interval '2 days'),
('82222222-2222-2222-2222-222222222222', '04444444-4444-4444-4444-444444444444', 'b7777777-7777-7777-7777-777777777777', 'c1111111-1111-1111-1111-111111111111', 4, 'Kualitas bagus.', null, now() - interval '1 day'),
('83333333-3333-3333-3333-333333333333', '04444444-4444-4444-4444-444444444444', 'b7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 5, 'Beli grosir untuk warung.', null, now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;
