import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: "Toko Tani — Sayur Segar Langsung dari Petani Lokal",
  description: "Marketplace sayur dan buah lokal segar langsung dari petani tanpa perantara. Nikmati produk organik dan bebas pestisida terbaik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.className} bg-brand-bg text-brand-text-primary antialiased`}>
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#FFFFFF',
              color: '#1A202C',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
            },
          }} 
        />
      </body>
    </html>
  );
}
