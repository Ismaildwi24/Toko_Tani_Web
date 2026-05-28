import React from 'react';

interface BadgeProps {
  variant?: 'organik' | 'bebas_pestisida' | 'terlaris' | 'dilaporkan' | 'aktif' | 'ditangguhkan' | 'diblokir' | 'info' | 'primary' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'primary', children, className = '' }) => {
  const styles = {
    organik: 'bg-emerald-55 text-brand-primary border border-brand-primary/20', // custom green badge
    bebas_pestisida: 'bg-blue-50 text-blue-700 border border-blue-100',
    terlaris: 'bg-amber-50 text-amber-700 border border-amber-100',
    dilaporkan: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    aktif: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    ditangguhkan: 'bg-gray-100 text-gray-700 border border-gray-200',
    diblokir: 'bg-red-50 text-red-700 border border-red-100',
    danger: 'bg-red-50 text-red-700 border border-red-100',
    info: 'bg-sky-50 text-sky-700 border border-sky-100',
    primary: 'bg-brand-primary-light text-brand-primary border border-brand-primary/20',
  };

  // Adjust 'organik' to be green theme
  const getBadgeStyle = () => {
    if (variant === 'organik') {
      return 'bg-[#e8f5ee] text-[#1A7C3E] border border-[#d2edd9]';
    }
    return styles[variant] || styles.primary;
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle()} ${className}`}>
      {children}
    </span>
  );
};
