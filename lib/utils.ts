import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';

// 1. Format Rupiah: 15000 -> "Rp 15.000"
export function formatRupiah(amount: number): string {
  if (amount === undefined || amount === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('Rp', 'Rp ')
    .trim();
}

// 2. Generate order number: "TK-XXXX" (random 4 digit)
export function generateOrderNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TK-${num}`;
}

// 3. Format tanggal relatif: "Hari ini, 08:30" / "Kemarin, 19:45" / "12 Mei 2026"
export function formatRelativeDate(dateInput: Date | string): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  if (isToday(date)) {
    return `Hari ini, ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `Kemarin, ${format(date, 'HH:mm')}`;
  }
  return format(date, 'd MMMM yyyy', { locale: id });
}

// 4. Generate room ID untuk chat (deterministik)
export function getChatRoomId(userId1: string, userId2: string): string {
  if (!userId1 || !userId2) return '';
  return [userId1, userId2].sort().join('_');
}

// 5. Truncate teks
export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// 6. Validasi nomor telepon Indonesia (08xx / 628xx)
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const regex = /^(08|628)\d{8,11}$/;
  return regex.test(phone);
}
